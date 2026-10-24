import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('after-sales retention enforces customer confirmation, history and tenant boundaries',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,stranger,companyA}=await connectedFixture(t),root='/companies/current/operations',day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const contact=ok(await a.request(root+'/contacts','POST',{operationKey:randomUUID(),kind:'individual',name:'[TEST] Retention customer',email:'retention@example.invalid',phone:'',billingAddress:'',serviceAddress:''}),201).id;await db.query('UPDATE company_contacts SET user_id=$1 WHERE id=$2',[customer.user.id,contact]);
 const project=ok(await a.request(root+'/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:null,leadId:null,reference:'TEST-RETENTION-PROJECT',name:'[TEST] Installation',location:'[TEST] Site',scope:'[TEST] Agreed work',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:'[TEST] Recorded project'}),201).id;
 // An already completed installation is a fixture, not a claim that milestones were performed.
 await db.query("UPDATE installation_projects SET status='completed',completed_at=now(),completion_reference='[TEST] Existing completed installation' WHERE id=$1",[project]);
 const payload={operationKey:randomUUID(),issue:'[TEST] Equipment needs attention',priority:'normal'};
 const service=ok(await customer.request('/customer/operations/projects/'+project+'/service','POST',payload),201).id;
 const read=async(person=a)=>ok(await person.request((person===a?root+'/record/service/':'/customer/operations/record/service/')+service));
 const rev=async()=>(await read()).record.revision;
 const action=async(action,more={},person=a)=>person.request(root+'/service/'+service+'/retention','POST',{operationKey:randomUUID(),revision:await rev(),action,...more});
 const progress=async(status,more={})=>a.request(root+'/service/'+service+'/update','POST',{revision:await rev(),status,assigneeId:a.user.id,followUp:day,resolution:status==='resolved'?'PRIVATE-WORK-NOTES':'',internalNotes:'PRIVATE-TECHNICIAN-NOTE',customerUpdate:status==='resolved'?'[TEST] Repair completed; please check it.':'',resolutionReference:'TEST-ACTUAL-REPAIR',...more});
 await t.test('completed installations enter service exactly once and unrelated customers cannot access them',async()=>{
  assert.equal(ok(await customer.request('/customer/operations/projects/'+project+'/service','POST',payload),201).id,service);assert.equal((await stranger.request('/customer/operations/record/service/'+service)).status,404);assert.equal((await b.request(root+'/record/service/'+service)).status,404);
  assert.equal((await db.query('SELECT project_id FROM service_requests WHERE id=$1',[service])).rows[0].project_id,project);
 });
 await t.test('direct closure and resolutions lacking customer-visible evidence are rejected',async()=>{
  assert.equal((await progress('closed')).status,409);for(const status of ['triaged','assigned','in_progress'])ok(await progress(status));
  assert.equal((await progress('resolved',{customerUpdate:''})).status,400);assert.equal((await progress('resolved',{resolutionReference:''})).status,400);
  ok(await progress('resolved'));assert.equal((await action('maintenance',{recordedOn:day,customerVisible:false,details:{summary:'[TEST] Changed work',reference:'TEST',nextVisit:''}})).status,409);const publicView=await read(customer);assert.equal(publicView.record.status,'resolved');assert.doesNotMatch(JSON.stringify(publicView),/PRIVATE-|TEST-ACTUAL-REPAIR/);assert.equal(publicView.retention.closureBasis,'none');
 });
 let firstResolution;
 await t.test('only the owning customer can reject the exact proposal and retries are idempotent',async()=>{
  firstResolution=(await read(customer)).retention.resolutions[0].id;const body={operationKey:randomUUID(),revision:await rev(),resolutionId:firstResolution,accepted:false,rating:'2',comment:'[TEST] Problem remains'};
  assert.equal((await stranger.request('/customer/operations/service/'+service+'/respond','POST',body)).status,404);assert.equal((await a.request('/customer/operations/service/'+service+'/respond','POST',body)).status,404);
  ok(await customer.request('/customer/operations/service/'+service+'/respond','POST',body));ok(await customer.request('/customer/operations/service/'+service+'/respond','POST',body));assert.equal((await read()).record.status,'in_progress');assert.equal((await db.query('SELECT count(*)::int AS n FROM service_feedback')).rows[0].n,1);
  assert.equal((await customer.request('/customer/operations/service/'+service+'/respond','POST',{...body,accepted:true})).status,409);
 });
 await t.test('escalations are role-controlled, audited and separately visible to the customer',async()=>{
  ok(await action('escalate',{level:'2',dueDate:day,reason:'PRIVATE-ESCALATION-DETAIL'}));assert.equal((await read(customer)).retention.escalation.level,2);assert.doesNotMatch(JSON.stringify(await read(customer)),/PRIVATE-ESCALATION-DETAIL/);ok(await action('clear_escalation',{reason:'[TEST] Manager reviewed'}));
 });
 await t.test('communication and maintenance history is explicit, private by default and cannot pretend to send',async()=>{
  const data={recordedOn:day,customerVisible:false,details:{channel:'whatsapp',direction:'outbound',outcome:'prepared',summary:'PRIVATE-DRAFT',reference:''}};
  ok(await action('communication',data));assert.equal((await action('communication',{...data,customerVisible:true})).status,400);
  const log={operationKey:randomUUID(),revision:await rev(),action:'maintenance',recordedOn:day,customerVisible:true,details:{summary:'[TEST] Cleaned and inspected recorded equipment',reference:'TEST-VISIT-EVIDENCE',nextVisit:''}};
  ok(await a.request(root+'/service/'+service+'/retention','POST',log));ok(await a.request(root+'/service/'+service+'/retention','POST',log));assert.equal((await read(customer)).retention.records.total,1);assert.doesNotMatch(JSON.stringify(await read(customer)),/PRIVATE-DRAFT/);assert.equal((await db.query('SELECT count(*)::int AS n FROM service_retention_records')).rows[0].n,2);
  assert.equal((await action('maintenance',{recordedOn:'2099-01-01',customerVisible:true,details:log.details})).status,400);
 });
 await t.test('stale proposals cannot confirm newer work; accepted feedback closes with truthful basis',async()=>{
  ok(await progress('resolved'));const view=await read(customer),newId=view.retention.resolutions[0].id;assert.notEqual(newId,firstResolution);
  const body={operationKey:randomUUID(),revision:await rev(),resolutionId:firstResolution,accepted:true,rating:'5',comment:'[TEST] Checked'};
  assert.equal((await customer.request('/customer/operations/service/'+service+'/respond','POST',body)).status,409);body.resolutionId=newId;body.operationKey=randomUUID();
  const results=await Promise.all([1,2].map(()=>customer.request('/customer/operations/service/'+service+'/respond','POST',body)));assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal((await read()).record.status,'closed');assert.equal((await read(customer)).retention.closureBasis,'customer_confirmed');assert.equal((await progress('closed')).status,409);
 });
 await t.test('closed requests reopen without erasing feedback and administrative closure never claims customer approval',async()=>{
  const body={operationKey:randomUUID(),revision:await rev(),reason:'[TEST] Fault recurred'};ok(await customer.request('/customer/operations/service/'+service+'/reopen','POST',body));ok(await customer.request('/customer/operations/service/'+service+'/reopen','POST',body));assert.equal((await read(customer)).retention.resolutions.length,2);
  ok(await progress('resolved'));ok(await action('close_exception',{reason:'[TEST] Customer requested telephone-only contact; confirmation unavailable'}));assert.equal((await read(customer)).retention.closureBasis,'administrative_exception');assert.equal((await read(customer)).retention.resolutions[0].accepted,null);
 });
 await t.test('history is immutable and protected requests require the existing origin/CSRF controls',async()=>{
  const denied={operationKey:randomUUID(),revision:await rev(),action:'reopen',reason:'[TEST] Reopen request'};assert.equal((await a.request(root+'/service/'+service+'/retention','POST',denied,{'X-CSRF-Token':''})).status,403);assert.equal((await a.request(root+'/service/'+service+'/retention','POST',denied,{Origin:'https://untrusted.example.invalid'})).status,403);
  const entry=(await db.query('SELECT id FROM service_retention_records LIMIT 1')).rows[0].id;await assert.rejects(db.query('DELETE FROM service_retention_records WHERE id=$1',[entry]),{code:'23514'});await assert.rejects(db.query('UPDATE service_resolutions SET summary=$1 WHERE id=$2',['changed',firstResolution]),{code:'23514'});
  assert.equal((await b.request(root+'/service/'+service+'/retention','POST',{operationKey:randomUUID(),revision:await rev(),action:'reopen',reason:'[TEST] Cross tenant'})).status,404);
 });
 await t.test('warranty decisions and replacements require linked equipment, ordered evidence and actual dates',async()=>{
  const order=randomUUID(),equipment=randomUUID();await db.query("INSERT INTO business_orders(id,company_id,contact_id,reference,terms,total_paise,billing_address,service_address,owner_id,status,acceptance_mode,agreement_reference,confirmed_at,confirmed_by) VALUES($1,$2,$3,'TEST-RETENTION-ORDER','{}',0,'[TEST]','[TEST]',$4,'confirmed','external','TEST-AGREEMENT',now(),$4)",[order,companyA,contact,a.user.id]);
  await db.query('UPDATE service_requests SET order_id=$1 WHERE id=$2',[order,service]);await db.query("INSERT INTO equipment_assets(id,company_id,order_id,category,brand,model,serial,warranty_terms,recorded_by) VALUES($1,$2,$3,'[TEST]','[TEST]','[TEST]','TEST-OLD-SERIAL','[TEST] Supplied terms',$4)",[equipment,companyA,order,a.user.id]);
  const details=status=>({status,equipmentId:equipment,summary:'[TEST] Supporting supplier record',reference:'TEST-SUPPLIER-EVIDENCE',replacementSerial:status==='replacement_recorded'?'TEST-NEW-SERIAL':''}),record=status=>action('warranty',{recordedOn:day,customerVisible:true,details:details(status)});
  assert.equal((await record('approved')).status,409);assert.equal((await action('warranty',{recordedOn:day,customerVisible:true,details:{...details('claim_recorded'),equipmentId:randomUUID()}})).status,404);
  for(const status of ['claim_recorded','submitted','approved'])ok(await record(status));assert.equal((await action('warranty',{recordedOn:day,customerVisible:true,details:{...details('replacement_recorded'),replacementSerial:'TEST-OLD-SERIAL'}})).status,400);ok(await record('replacement_recorded'));assert.equal((await record('replacement_recorded')).status,409);
  const history=(await read(customer)).retention.records.items;assert.ok(history.some(x=>x.details.replacementSerial==='TEST-NEW-SERIAL'));assert.equal((await db.query('SELECT serial FROM equipment_assets WHERE id=$1',[equipment])).rows[0].serial,'TEST-OLD-SERIAL');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM inventory_movements WHERE company_id=$1',[companyA])).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM customer_refunds WHERE company_id=$1',[companyA])).rows[0].n,0);
 });
 await t.test('assigned staff are scoped, cannot approve warranty or administrative closure, and pending confirmation prevents orphaned work',async()=>{
  ok(await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'field_engineer'}),201);ok(await stranger.request('/companies/select','POST',{companyId:companyA}));await stranger.session();
  assert.equal((await stranger.request(root+'/record/service/'+service)).status,404);await db.query("UPDATE service_requests SET assignee_id=$1,status='resolved',closure_basis='none' WHERE id=$2",[stranger.user.id,service]);
  assert.equal((await stranger.request(root+'/record/service/'+service)).status,200);assert.equal((await action('close_exception',{reason:'[TEST] Employee cannot close'},stranger)).status,403);assert.equal((await action('escalate',{level:1,dueDate:day,reason:'[TEST] Employee cannot escalate'},stranger)).status,403);
  const {employeeWork}=await import('../server/operations/work-handoffs.js');assert.ok((await employeeWork(db,companyA,stranger.user.id)).service.some(x=>x.id===service));
  await db.query("UPDATE service_requests SET status='closed',closure_basis='administrative_exception' WHERE id=$1",[service]);await db.query("UPDATE company_memberships SET status='removed' WHERE company_id=$1 AND user_id=$2",[companyA,stranger.user.id]);
  ok(await action('reopen',{reason:'[TEST] Reopen after employee departure'}));assert.equal((await read()).record.assignee_id,null);assert.equal((await read()).record.status,'triaged');
 });
});

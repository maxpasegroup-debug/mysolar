import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('Customer 360 reconciles linked records and enforces tenant, role and assignment boundaries',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,stranger,companyA,companyB,client}=await connectedFixture(t);
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const root='/companies/current/operations',q=ok(await a.request('/companies/current/quotations')).items[0];
 const order=ok(await a.request(root+'/orders','POST',{operationKey:randomUUID(),quotationId:q.id,reference:'TEST-360-ORDER',billingAddress:'[TEST]',serviceAddress:'[TEST]',expectedDate:null,ownerId:a.user.id,acceptanceMode:'in_app'}),201).id;
 ok(await a.request(root+'/orders/'+order+'/actions','POST',{revision:1,action:'request_confirmation',reference:'',notes:'[TEST] request confirmation'}));
 ok(await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true}));
 ok(await a.request(root+'/orders/'+order+'/actions','POST',{revision:3,action:'confirm',reference:'[TEST]',notes:'[TEST] explicit confirmation'}));
 const contact=(await db.query('SELECT contact_id FROM business_orders WHERE id=$1',[order])).rows[0].contact_id;
 const project=ok(await a.request(root+'/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:order,leadId:null,reference:'TEST-360-PROJECT',name:'[TEST] roof installation',location:'[TEST]',scope:'',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:'[TEST] recorded work'}),201).id;
 const task=ok(await a.request(root+'/tasks','POST',{operationKey:randomUUID(),title:'[TEST] call customer',description:'',contactId:null,orderId:null,projectId:project,serviceId:null,assigneeId:a.user.id,priority:'urgent',dueDate:'2026-01-01'}),201).id;
 const service=ok(await a.request(root+'/service','POST',{operationKey:randomUUID(),contactId:contact,orderId:order,projectId:project,productId:null,reference:'TEST-360-SERVICE',issue:'[TEST] visit request',priority:'normal',assigneeId:a.user.id,followUp:null,warrantyTerms:'',warrantyReference:''}),201).id;
 const day=(await db.query("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day")).rows[0].day;
 const invoice=ok(await a.request(root+'/invoices','POST',{operationKey:randomUUID(),orderId:order,reference:'TEST-360-INVOICE',dueDate:day}),201).id;
 ok(await a.request(root+'/invoices/'+invoice+'/actions','POST',{revision:1,action:'issue',reason:'[TEST] invoice issued'}));
 const payment=ok(await a.request(root+'/invoices/'+invoice+'/collections','POST',{operationKey:randomUUID(),amount:'20',method:'cash',externalReference:'TEST-360-PAYMENT',collectedOn:day,reason:'[TEST] recorded receipt'}),201).id;
 ok(await a.request(root+'/invoices/'+invoice+'/collections','POST',{operationKey:randomUUID(),amount:'10',method:'cash',externalReference:'TEST-360-PAYMENT-2',collectedOn:day,reason:'[TEST] second receipt'}),201);
 ok(await a.request(root+'/collections/'+payment+'/reverse','POST',{operationKey:randomUUID(),reason:'[TEST] correct the first recorded entry'}));
 // Fictional edge fixtures: a second confirmed order, a draft order, unrelated customer,
 // private reference and scanned-file metadata. No provider or production data is used.
 const insertOrder=async(status,total,ref)=>{const id=randomUUID();await db.query(`INSERT INTO business_orders(id,company_id,contact_id,reference,terms,total_paise,billing_address,service_address,owner_id,status,acceptance_mode,confirmed_by,confirmed_at,agreement_reference)
 VALUES($1,$2,$3,$4,'{}',$5,'[TEST]','[TEST]',$6,$7,'external',$6,now(),'[TEST]')`,[id,companyA,contact,ref,total,a.user.id,status]);return id;};
 await insertOrder('confirmed','5000','TEST-360-UNBILLED');await insertOrder('draft','900000','TEST-360-DRAFT');
 const privateContact=randomUUID();await db.query("INSERT INTO company_contacts(id,company_id,kind,name) VALUES($1,$2,'individual','PRIVATE-OTHER-CUSTOMER')",[privateContact,companyA]);
 await db.query("INSERT INTO operations_documents(id,company_id,record_type,record_id,title,reference,created_by) VALUES($1,$2,'service',$3,'[TEST] visit reference','[TEST] cabinet',$4)",[randomUUID(),companyA,service,a.user.id]);
 await db.query("INSERT INTO managed_files(id,company_id,record_kind,record_id,uploaded_by,filename,mime,size,sha256,payload,customer_visible,scan_status) VALUES($1,$2,'projects',$3,$4,'test.pdf','application/pdf',10,'fixture-hash','SECRET-ENCRYPTED-PAYLOAD',false,'clean')",[randomUUID(),companyA,project,a.user.id]);
 const view=async(client=a,page=1)=>ok(await client.request(root+'/record/contacts/'+contact+'?page='+page)).customer360;
 await t.test('owner sees connected stages, staff, documents and project-only tasks without duplicating records',async()=>{
  const v=await view();assert.equal(v.records.tasks.total,1);assert.equal(v.records.tasks.items[0].id,task);assert.equal(v.records.service.items[0].id,service);assert.equal(v.quotations.total,1);assert.equal(v.milestones.total,8);assert.equal(v.files.total,1);assert.equal(v.documents.total,1);assert.ok(v.responsible.some(x=>x.id===project&&x.user_id===a.user.id));assert.ok(v.nextActions.some(x=>x.id===task&&x.overdue));assert.ok(v.activity.items.some(x=>x.record_type==='invoices'));assert.doesNotMatch(JSON.stringify(v),/SECRET-ENCRYPTED-PAYLOAD|PRIVATE-OTHER-CUSTOMER/);
 });
 await t.test('full financial totals reconcile with source invoices and signed collections',async()=>{
  const v=await view();assert.equal(v.financial.contract,'16800');assert.equal(v.financial.invoiced,'11800');assert.equal(v.financial.collected,'1000');assert.equal(v.financial.outstanding,'10800');assert.equal(v.financial.overdue,'0');assert.equal(v.financial.unbilled,'5000');assert.equal(v.payments.total,3);
  await db.query("UPDATE customer_invoices SET issue_date='2026-01-01',due_date='2026-01-02' WHERE id=$1",[invoice]);assert.equal((await view()).financial.overdue,'10800');
  const paged=await view(a,2);assert.deepEqual(paged.financial,(await view()).financial);assert.equal(paged.records.orders.items.length,0);assert.equal(paged.records.orders.total,3);
 });
 await t.test('another company, a customer and an anonymous session cannot bypass customer access',async()=>{
  assert.equal((await b.request(root+'/record/contacts/'+contact)).status,404);assert.equal((await customer.request(root+'/record/contacts/'+contact)).status,409);assert.equal((await client().request(root+'/record/contacts/'+contact)).status,401);
 });
 await t.test('sales sees operational records but never invoices, payments, financial documents or activity',async()=>{
  ok(await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'sales'}),201);ok(await stranger.request('/companies/select','POST',{companyId:companyA}));await stranger.session();const v=await view(stranger);assert.equal(v.financial,null);assert.equal(v.payments,undefined);assert.equal(v.records.invoices,undefined);assert.equal(v.records.projects,undefined);assert.ok(v.records.orders.total);assert.ok(v.activity.items.every(x=>x.record_type!=='invoices'));assert.equal(v.files.total,0);
 });
 await t.test('assigned-only project, task and service scopes still apply inside Customer 360',async()=>{
  // Test-only grant lets us exercise composed scopes without granting broad operational access.
  await db.query("UPDATE company_memberships SET role_id='field_engineer' WHERE company_id=$1 AND user_id=$2",[companyA,stranger.user.id]);
  await db.query("INSERT INTO role_permissions(role_id,permission_id) VALUES('field_engineer','customers.read')");
  const before=await view(stranger);assert.equal(before.records.projects.total,0);assert.equal(before.records.tasks.total,0);assert.equal(before.records.service.total,0);assert.equal(before.milestones.total,0);assert.equal(before.financial,null);
  await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3)',[project,companyA,stranger.user.id]);await db.query('UPDATE business_tasks SET assignee_id=$1 WHERE id=$2',[stranger.user.id,task]);
  const after=await view(stranger);assert.equal(after.records.projects.total,1);assert.equal(after.records.tasks.total,1);assert.equal(after.records.service.total,0);assert.equal(after.milestones.total,8);assert.equal(after.files.total,1);assert.equal(after.documents.total,0);
  await db.query('DELETE FROM project_assignments WHERE project_id=$1 AND user_id=$2',[project,stranger.user.id]);assert.equal((await view(stranger)).files.total,0);
 });
 await t.test('empty customer remains truthful and cross-company context headers fail closed',async()=>{
  const v=ok(await a.request(root+'/record/contacts/'+privateContact)).customer360;assert.equal(v.financial.contract,'0');assert.equal(v.records.orders.total,0);assert.equal(v.quotations.total,0);assert.equal(v.nextActions.length,0);assert.equal((await a.request(root+'/record/contacts/'+contact,'GET',undefined,{'X-Company-ID':companyB})).status,409);
 });
 await t.test('linked lists paginate beyond twenty records without changing full financial totals',async()=>{
  const before=(await view()).financial;for(let i=0;i<21;i++)await insertOrder('draft','999999','TEST-360-PAGED-'+i);
  const page1=await view(),page2=await view(a,2);assert.equal(page1.records.orders.total,24);assert.equal(page1.records.orders.items.length,20);assert.equal(page2.records.orders.items.length,4);assert.deepEqual(page2.financial,before);assert.equal(new Set([...page1.records.orders.items,...page2.records.orders.items].map(x=>x.id)).size,24);
 });
 await t.test('void invoices leave receivable totals while immutable payment history remains available',async()=>{
  const remaining=(await db.query('SELECT id FROM customer_collections x WHERE invoice_id=$1 AND reverses_id IS NULL AND NOT EXISTS(SELECT 1 FROM customer_collections r WHERE r.reverses_id=x.id)',[invoice])).rows;
  for(const payment of remaining)ok(await a.request(root+'/collections/'+payment.id+'/reverse','POST',{operationKey:randomUUID(),reason:'[TEST] authorised correction before void'}));
  const revision=(await db.query('SELECT revision FROM customer_invoices WHERE id=$1',[invoice])).rows[0].revision;ok(await a.request(root+'/invoices/'+invoice+'/actions','POST',{revision,action:'void',reason:'[TEST] no remaining collections'}));
  const v=await view();assert.equal(v.financial.invoiced,'0');assert.equal(v.financial.collected,'0');assert.equal(v.financial.outstanding,'0');assert.equal(v.financial.overdue,'0');assert.equal(v.financial.unbilled,'16800');assert.equal(v.payments.total,4);
 });
});

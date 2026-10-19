import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('durable authorized reminders in disposable PostgreSQL',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const env=await connectedFixture(t),{db,a,b,customer,stranger,companyA,enquiryId}=env;
 const {planRule,claim,deliver,fail,tick}=await import('../server/automation/engine.js');
 const {pool}=await import('../server/db/pool.js');
 const run=async work=>{const connection=await pool.connect();try{await connection.query('BEGIN');const value=await work(connection);await connection.query('COMMIT');return value;}catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release();}};
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const today=(await db.query("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day")).rows[0].day;
 let lead,rule;
 const settings=(revision=0,extra={})=>({revision,enabled:true,customers:false,hour:8,leadDays:0,confirm:true,reason:'[TEST] approved operational reminders',...extra});
 const makeReady=()=>db.query("UPDATE automation_jobs SET available_at=now()-interval '1 minute' WHERE status IN ('pending','retry')");
 const next=async()=>{await makeReady();const job=await run(claim);assert.ok(job);return job;};
 await t.test('unapproved, forged and cross-company rules cannot create reminders',async()=>{
  const result=ok(await a.request('/companies/current/operations/leads','POST',{operationKey:randomUUID(),enquiryId,contactId:null,title:'',source:'',interest:'',location:'[TEST] site',assigneeId:a.user.id,priority:'normal',nextAction:'[TEST] follow up',followUp:today}),201);lead=result.id;
  assert.equal((await a.request('/companies/current/automation')).data.rules.length,0);assert.equal((await stranger.request('/companies/current/automation')).status,409);
  assert.equal((await a.request('/companies/current/automation/rules/followup','PUT',settings(0,{confirm:false}))).status,400);
  assert.equal((await a.request('/companies/current/automation/rules/followup','PUT',{...settings(),companyId:b.company.id})).status,400);
  assert.equal((await a.request('/companies/current/automation/rules/followup','PUT',settings(),{'X-CSRF-Token':''})).status,403);
  ok(await a.request('/companies/current/automation/rules/followup','PUT',settings()));
  rule=(await db.query("SELECT id FROM automation_rules WHERE company_id=$1 AND kind='followup'",[companyA])).rows[0].id;
  assert.equal((await a.request('/companies/current/automation/rules/followup','PUT',settings())).status,409);
  assert.equal(ok(await b.request('/companies/current/automation')).rules.length,0);
  assert.equal(await run(connection=>planRule(connection,rule)),1);assert.equal(await run(connection=>planRule(connection,rule)),0);
 });
 await t.test('concurrent claims and duplicate execution store exactly one notification',async()=>{
  await makeReady();const jobs=await Promise.all([run(claim),run(claim)]);assert.equal(jobs.filter(Boolean).length,1);const job=jobs.find(Boolean);
  const outcomes=await Promise.all([run(connection=>deliver(connection,job)),run(connection=>deliver(connection,job))]);assert.deepEqual(outcomes.sort(),['claim_changed','delivered']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM operations_notifications WHERE id=$1',[job.id])).rows[0].n,1);assert.equal((await db.query('SELECT count(*)::int AS n FROM automation_deliveries WHERE job_id=$1',[job.id])).rows[0].n,1);
  assert.equal((await a.request('/companies/current/automation/jobs/'+job.id+'/retry','POST',{confirm:true,reason:'[TEST] duplicate retry denied'})).status,409);
 });
 async function anotherLead(){const id=randomUUID(),contact=(await db.query('SELECT contact_id FROM crm_leads WHERE id=$1',[lead])).rows[0].contact_id;await db.query("INSERT INTO crm_leads(id,company_id,contact_id,title,source,interest,location,assignee_id,priority,follow_up) VALUES($1,$2,$3,'[TEST] retry lead','','','',$4,'normal',$5)",[id,companyA,contact,a.user.id,today]);await run(connection=>planRule(connection,rule));return id;}
 await t.test('crash after notification insertion rolls back, then safely retries once',async()=>{
  await anotherLead();const job=await next();await assert.rejects(run(connection=>deliver(connection,job,{afterNotification:async()=>{throw new Error('TEST FAILURE');}})),/TEST FAILURE/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM operations_notifications WHERE id=$1',[job.id])).rows[0].n,0);
  await run(connection=>fail(connection,job));assert.equal((await db.query('SELECT status FROM automation_jobs WHERE id=$1',[job.id])).rows[0].status,'retry');
  const retry=await next();assert.equal(retry.id,job.id);assert.equal(retry.attempts,2);assert.equal(await run(connection=>deliver(connection,retry)),'delivered');
 });
 await t.test('expired worker leases recover and exhausted failures require an audited manual retry',async()=>{
  await anotherLead();let job=await next();await db.query("UPDATE automation_jobs SET lease_until=now()-interval '1 minute' WHERE id=$1",[job.id]);const recovered=await next();assert.equal(recovered.id,job.id);assert.notEqual(recovered.claim_token,job.claim_token);assert.equal(await run(connection=>deliver(connection,job)),'claim_changed');job=recovered;
  for(;;){await run(connection=>fail(connection,job));if(job.attempts===5)break;job=await next();}
  assert.equal((await db.query('SELECT status FROM automation_jobs WHERE id=$1',[job.id])).rows[0].status,'dead');assert.equal((await run(claim)),null);
  assert.equal((await b.request('/companies/current/automation/jobs/'+job.id+'/retry','POST',{confirm:true,reason:'[TEST] foreign retry denied'})).status,404);
  ok(await a.request('/companies/current/automation/jobs/'+job.id+'/retry','POST',{confirm:true,reason:'[TEST] fault reviewed and corrected'}));const retry=await next();assert.equal(await run(connection=>deliver(connection,retry)),'delivered');
 });
 await t.test('recipient opt-out, source completion and stale approval stop queued delivery',async()=>{
  await anotherLead();let job=await next();ok(await a.request('/reminders/preferences','PUT',{enabled:false,kinds:[]}));assert.equal(await run(connection=>deliver(connection,job)),'skipped');
  ok(await a.request('/reminders/preferences','PUT',{enabled:true,kinds:['followup','quotation','milestone','collection','service']}));
  const id=await anotherLead();job=await next();await db.query("UPDATE crm_leads SET stage='won' WHERE id=$1",[id]);assert.equal(await run(connection=>deliver(connection,job)),'skipped');
  await anotherLead();job=await next();ok(await a.request('/companies/current/automation/rules/followup','PUT',settings(1,{enabled:false})));assert.equal(await run(connection=>deliver(connection,job)),'claim_changed');
  assert.equal((await db.query('SELECT status FROM automation_jobs WHERE id=$1',[job.id])).rows[0].status,'cancelled');
 });
 await t.test('all reminder types use real records, customer ownership and current recipient permissions',async()=>{
  const quotation=(await db.query("SELECT id FROM quotation_versions WHERE company_id=$1 AND status='sent'",[companyA])).rows[0].id;
  await db.query('UPDATE quotation_versions SET valid_until=$1 WHERE id=$2',[today,quotation]);
  ok(await a.request('/companies/current/automation/rules/quotation','PUT',settings(0,{customers:true})));
  const quoteRule=(await db.query("SELECT id FROM automation_rules WHERE company_id=$1 AND kind='quotation'",[companyA])).rows[0].id;
  assert.equal(await run(connection=>planRule(connection,quoteRule)),2);
  await makeReady();let job;while((job=await run(claim)))assert.equal(await run(connection=>deliver(connection,job)),'delivered');
  const feed=ok(await customer.request('/customer/operations/notifications'));assert.ok(feed.items.some(row=>row.version_id===quotation&&row.message.startsWith('Reminder:')));assert.ok(!ok(await stranger.request('/customer/operations/notifications')).items.some(row=>row.version_id===quotation));
  const contact=(await db.query('SELECT contact_id FROM crm_leads WHERE id=$1',[lead])).rows[0].contact_id,order=randomUUID();
  await db.query("INSERT INTO business_orders(id,company_id,contact_id,reference,terms,total_paise,billing_address,service_address,owner_id,status,acceptance_mode,agreement_reference,confirmed_by,confirmed_at) VALUES($1,$2,$3,'TEST-REMINDER-ORDER','{}',10000,'','',$4,'confirmed','external','TEST-CONSENT',$4,now())",[order,companyA,contact,a.user.id]);
  const invoice=randomUUID(),project=randomUUID(),service=randomUUID();
  await db.query("INSERT INTO customer_invoices(id,company_id,order_id,contact_id,reference,snapshot,total_paise,due_date,status) VALUES($1,$2,$3,$4,'TEST-REMINDER-INVOICE','{}',10000,$5,'issued')",[invoice,companyA,order,contact,today]);
  await db.query("INSERT INTO installation_projects(id,company_id,contact_id,order_id,reference,name,location,scope,manager_id,scheduled_date) VALUES($1,$2,$3,$4,'TEST-REMINDER-PROJECT','[TEST] project','','[TEST] scope',$5,$6)",[project,companyA,contact,order,a.user.id,today]);
  await db.query("INSERT INTO project_milestones(project_id,company_id,code,status) VALUES($1,$2,'survey','pending')",[project,companyA]);
  await db.query("INSERT INTO service_requests(id,company_id,contact_id,order_id,reference,issue,priority,assignee_id,follow_up) VALUES($1,$2,$3,$4,'TEST-REMINDER-SERVICE','[TEST] issue','normal',$5,$6)",[service,companyA,contact,order,a.user.id,today]);
  for(const kind of ['milestone','collection','service']){ok(await a.request('/companies/current/automation/rules/'+kind,'PUT',settings(0,{customers:true})));const id=(await db.query('SELECT id FROM automation_rules WHERE company_id=$1 AND kind=$2',[companyA,kind])).rows[0].id;assert.equal(await run(connection=>planRule(connection,id)),2);}
  await makeReady();while((job=await run(claim)))assert.equal(await run(connection=>deliver(connection,job)),'delivered');
  const records=ok(await customer.request('/customer/operations/notifications')).items;for(const id of [invoice,project,service])assert.ok(records.some(row=>row.record_id===id));
  ok(await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'field_engineer'}),201);
  const assignedProject=randomUUID();await db.query("INSERT INTO installation_projects(id,company_id,contact_id,order_id,reference,name,location,scope,manager_id,scheduled_date) VALUES($1,$2,$3,$4,'TEST-FIELD-REMINDER','[TEST] assigned project','','[TEST] scope',$5,$6)",[assignedProject,companyA,contact,null,a.user.id,today]);
  await db.query("INSERT INTO project_milestones(project_id,company_id,code,status) VALUES($1,$2,'survey','pending')",[assignedProject,companyA]);await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3)',[assignedProject,companyA,stranger.user.id]);
  const milestoneRule=(await db.query("SELECT id FROM automation_rules WHERE company_id=$1 AND kind='milestone'",[companyA])).rows[0].id;assert.equal(await run(connection=>planRule(connection,milestoneRule)),3);
  await db.query('DELETE FROM project_assignments WHERE project_id=$1 AND user_id=$2',[assignedProject,stranger.user.id]);await makeReady();while((job=await run(claim))){const outcome=await run(connection=>deliver(connection,job));assert.equal(outcome,job.recipient_id===stranger.user.id?'skipped':'delivered');}
 });
 await t.test('revoked company/module access and lost approver authority are rechecked before delivery',async()=>{
  ok(await a.request('/companies/current/automation/rules/followup','PUT',settings(2)));await anotherLead();let job=await next();
  await db.query("DELETE FROM role_permissions WHERE role_id='owner' AND permission_id='automation.manage'");assert.equal(await run(connection=>deliver(connection,job)),'skipped');await db.query("INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','automation.manage')");
  await anotherLead();job=await next();await db.query("UPDATE companies SET lifecycle='suspended',status='suspended',storefront_published=false WHERE id=$1",[companyA]);assert.equal(await run(connection=>deliver(connection,job)),'skipped');await db.query("UPDATE companies SET lifecycle='active',status='active',storefront_published=true WHERE id=$1",[companyA]);
  await anotherLead();job=await next();await db.query("DELETE FROM role_permissions WHERE role_id='owner' AND permission_id='crm.read'");assert.equal(await run(connection=>deliver(connection,job)),'skipped');await db.query("INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','crm.read')");
  await anotherLead();job=await next();const configuration=(await db.query('SELECT data FROM commercial_settings_versions ORDER BY effective_at DESC,id DESC LIMIT 1')).rows[0].data;
  await db.query("INSERT INTO commercial_settings_versions(data,effective_at,created_by,reason) VALUES($1,now(),$2,'[TEST] controlled access restriction')",[{...configuration,mode:'controlled'},a.user.id]);assert.equal(await run(connection=>deliver(connection,job)),'skipped');
  assert.equal((await a.request('/companies/current/automation/rules/followup','PUT',settings(3))).status,403);
  await db.query("INSERT INTO commercial_settings_versions(data,effective_at,created_by,reason) VALUES($1,now(),$2,'[TEST] restore isolated access')",[configuration,a.user.id]);
  const result=await tick({run,limit:5});assert.ok(Number.isInteger(result.processed));assert.equal(ok(await a.request('/companies/current/automation')).worker.last_status,'ok');
 });
 await t.test('reassigned leads stop reminding the former assignee even when their role can still read CRM',async()=>{
  await db.query("UPDATE company_memberships SET role_id='sales' WHERE company_id=$1 AND user_id=$2",[companyA,stranger.user.id]);
  const id=await anotherLead();await db.query('UPDATE crm_leads SET assignee_id=$1 WHERE id=$2',[stranger.user.id,id]);await run(connection=>planRule(connection,rule));
  await db.query('UPDATE crm_leads SET assignee_id=$1 WHERE id=$2',[a.user.id,id]);await makeReady();let job,sawFormer=false;while((job=await run(claim))){const result=await run(connection=>deliver(connection,job));if(job.recipient_id===stranger.user.id){sawFormer=true;assert.equal(result,'skipped');}else assert.equal(result,'delivered');}assert.equal(sawFormer,true);
 });
 await t.test('worker entry point requires the complete checksum-verified migration chain',async()=>{
  const worker=await import('../server/automation/worker.js');assert.equal(await worker.ready(),true);
  const migration=(await db.query("SELECT * FROM schema_migrations WHERE name='012_automation.sql'")).rows[0];
  try{await db.query("DELETE FROM schema_migrations WHERE name='012_automation.sql'");assert.equal(await worker.ready(),false);
   const blocked=spawnSync(process.execPath,['server/automation/worker.js','--once'],{env:{...process.env},encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(blocked.status,1,blocked.stderr);assert.match(blocked.stderr,/reminder_worker_start_blocked/);
  }finally{await db.query('INSERT INTO schema_migrations(name,checksum,applied_at) VALUES($1,$2,$3)',[migration.name,migration.checksum,migration.applied_at]);}
  const result=spawnSync(process.execPath,['server/automation/worker.js','--once'],{env:{...process.env},encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/reminder_worker_tick/);
 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('practical setup and reviewed imports preserve business and authorization boundaries',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);await env.applyMigrations(db);await env.start();
 const owner=env.client(),other=env.client(),employee=env.client();await owner.register('setup-owner');await other.register('setup-other');await employee.register('setup-sales');
 const id=await owner.createCompany('practical-setup'),otherId=await other.createCompany('other-setup');
 const guide=async()=>{const r=await owner.request('/companies/current/setup/guide');assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 const decisions=revision=>({revision,offers:'not_needed',team:'solo',opening:'start_fresh',communicationsReviewed:true,reason:'[TEST] Reviewed actual business setup choices.'});
 await t.test('guide starts from records without invented completion or email delivery',async()=>{
  const data=await guide();assert.equal(data.guide.steps.length,7);assert.equal(data.guide.completed,0);assert.equal(data.guide.communications.deliveryVerified,false);assert.equal(data.guide.counts.customers,0);assert.equal(data.company.storefront_published,false);
  assert.equal(JSON.stringify(data).includes('password'),false);assert.equal(JSON.stringify(data).includes('apiKey'),false);
 });
 await t.test('saved choices resume, audit and preserve publication and financial state',async()=>{
  const before=await guide(),payload=decisions(before.company.revision);
  assert.equal((await owner.request('/companies/current/setup/decisions','PUT',payload)).status,200);
  assert.equal((await owner.request('/companies/current/setup/decisions','PUT',payload)).status,409);
  const after=await guide();assert.equal(after.guide.completed,4);assert.equal(after.guide.choices.team_mode,'solo');assert.equal(after.company.lifecycle,before.company.lifecycle);assert.equal(after.company.storefront_published,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM customer_invoices WHERE company_id=$1',[id])).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE company_id=$1 AND action='company.setup_choices_reviewed'",[id])).rows[0].n,1);
  await owner.session();assert.equal((await guide()).guide.choices.opening_mode,'start_fresh');
 });
 await t.test('tenant, employee, auditor, CSRF and origin restrictions remain authoritative',async()=>{
  const data=await guide(),payload=decisions(data.company.revision);
  assert.equal((await owner.request('/companies/current/setup/guide','GET',undefined,{'X-Company-ID':otherId})).status,409);
  assert.equal((await owner.request('/companies/current/setup/decisions','PUT',payload,{'X-CSRF-Token':''})).status,403);
  assert.equal((await owner.request('/companies/current/setup/decisions','PUT',payload,{Origin:'https://foreign.example.invalid'})).status,403);
  assert.equal((await owner.request('/companies/current/setup/decisions','PUT',{...payload,opening:'paid'})).status,400);
  await db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES($1,$2,$3,'sales')",[randomUUID(),id,employee.user.id]);
  await employee.request('/companies/select','POST',{companyId:id});await employee.session();
  assert.equal((await employee.request('/companies/current/setup/guide')).status,403);assert.equal((await employee.request('/companies/current/setup/decisions','PUT',payload)).status,403);
  await db.query("UPDATE company_memberships SET role_id='auditor' WHERE user_id=$1 AND company_id=$2",[employee.user.id,id]);await employee.session();
  const read=await employee.request('/companies/current/setup/guide');assert.equal(read.status,200);assert.equal(read.data.guide.canManage,false);assert.equal(read.data.guide.counts.invoices,null);assert.equal(read.data.guide.counts.customers,null);
  assert.equal((await employee.request('/companies/current/setup/decisions','PUT',payload)).status,403);
  await db.query("INSERT INTO company_domains(id,company_id,hostname,kind,challenge_hash,challenge_expires_at,created_by) VALUES($1,$2,'private-company.example.invalid','custom',$3,now()+interval '1 hour',$4)",[randomUUID(),id,'0'.repeat(64),owner.user.id]);
  const delivery=await employee.request('/companies/current/setup/delivery');assert.equal(delivery.status,200);assert.deepEqual(delivery.data.domains,[]);assert.equal(delivery.data.access.subscription,null);assert.equal((await owner.request('/companies/current/setup/delivery')).data.domains.length,1);
 });
 const preview=async(kind,csv)=>{const r=await owner.request('/companies/current/imports/preview','POST',{kind,csv});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 const confirm=p=>owner.request('/companies/current/imports/'+p.id+'/confirm','POST',{digest:p.digest,confirm:true});
 await t.test('both email and normalized phone are checked within the CSV',async()=>{
  const p=await preview('contacts','name,email,phone\n[TEST] One,one@example.invalid,+919990000001\n[TEST] Two,two@example.invalid,9990000001');assert.equal(p.canConfirm,false);assert.equal(p.rows[1].status,'error');assert.equal((await confirm(p)).status,400);
 });
 await t.test('preview creates no records; explicit confirmation is idempotent and tenant scoped',async()=>{
  const p=await preview('contacts','name,email,phone\n[TEST] Customer A,customer-a@example.invalid,+919990000002');
  assert.equal((await guide()).guide.counts.customers,0);
  assert.equal((await other.request('/companies/current/imports/'+p.id+'/confirm','POST',{digest:p.digest,confirm:true})).status,400);
  assert.equal((await confirm(p)).status,200);assert.equal((await confirm(p)).status,200);assert.equal((await guide()).guide.counts.customers,1);
  const duplicate=await preview('contacts','name,email,phone\n[TEST] Same phone,different@example.invalid,9990000002');assert.equal(duplicate.rows[0].status,'duplicate');assert.equal((await confirm(duplicate)).status,200);assert.equal((await guide()).guide.counts.customers,1);
 });
 await t.test('separate leads for one customer are valid; repeated same lead is not',async()=>{
  const p=await preview('leads','email,title,interest,location\ncustomer-a@example.invalid,[TEST] Home,Panels,[TEST] Site A\ncustomer-a@example.invalid,[TEST] Shop,Inverter,[TEST] Site B');assert.equal(p.canConfirm,true);assert.equal((await confirm(p)).status,200);
  const again=await preview('leads','email,title,interest,location\ncustomer-a@example.invalid,[test] home,Panels,[TEST] Site A');assert.equal(again.rows[0].status,'duplicate');
 });
 await t.test('changed records after preview roll the whole confirmation back',async()=>{
  const p=await preview('contacts','name,email,phone\n[TEST] First,first-import@example.invalid,9990000003\n[TEST] Second,second-import@example.invalid,9990000004');
  await db.query("INSERT INTO company_contacts(id,company_id,kind,name,email,phone) VALUES($1,$2,'individual','[TEST] Added after preview','second-import@example.invalid','9990000004')",[randomUUID(),id]);
  const r=await confirm(p);assert.equal(r.status,409);assert.equal(r.data.error.code,'IMPORT_CHANGED');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM company_contacts WHERE company_id=$1 AND email='first-import@example.invalid'",[id])).rows[0].n,0);
  assert.equal((await db.query('SELECT status FROM import_batches WHERE id=$1',[p.id])).rows[0].status,'preview');
 });
 await t.test('expired previews cannot be confirmed',async()=>{
  const p=await preview('contacts','name,email\n[TEST] Expired,expired-import@example.invalid');await db.query("UPDATE import_batches SET expires_at=now()-interval '1 minute' WHERE id=$1",[p.id]);assert.equal((await confirm(p)).status,400);
 });
 await t.test('concurrent confirmations cannot duplicate imported customers',async()=>{
  const same=await preview('contacts','name,email\n[TEST] Same batch,parallel-batch@example.invalid');
  assert.deepEqual((await Promise.all([confirm(same),confirm(same)])).map(r=>r.status),[200,200]);
  const first=await preview('contacts','name,email\n[TEST] Two previews,parallel-previews@example.invalid'),second=await preview('contacts','name,email\n[TEST] Two previews,parallel-previews@example.invalid');
  assert.deepEqual((await Promise.all([confirm(first),confirm(second)])).map(r=>r.status).sort(),[200,409]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM company_contacts WHERE company_id=$1 AND email='parallel-previews@example.invalid'",[id])).rows[0].n,1);
 });
 await t.test('deferred choices remain incomplete and concurrent reviews cannot overwrite each other',async()=>{
  const revision=(await guide()).company.revision,payload={...decisions(revision),offers:'later',team:'later',opening:'later',communicationsReviewed:false};
  const responses=await Promise.all([owner.request('/companies/current/setup/decisions','PUT',payload),owner.request('/companies/current/setup/decisions','PUT',payload)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const current=await guide();assert.equal(current.guide.completed,1); // The real auditor membership already added above still counts as a saved team.
  assert.equal(current.guide.steps.find(s=>s.id==='team').state,'saved');
  assert.equal(current.guide.steps.find(s=>s.id==='offers').state,'later');assert.equal(current.guide.steps.find(s=>s.id==='opening').state,'later');assert.equal(current.guide.steps.find(s=>s.id==='communications').state,'todo');
 });
});

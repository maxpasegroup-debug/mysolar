import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('isolated PostgreSQL: PRO partners, staff assignments and downgrade boundaries',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);await env.start();
 const a=env.client(),b=env.client(),c=env.client(),executive=env.client(),outsider=env.client(),second=outsider;
 // Reuse the initially unrelated user for the later capacity scenario. Five
 // accounts respect the real per-IP signup limit instead of weakening it.
 for(const [actor,name] of [[a,'network-a'],[b,'network-b'],[c,'network-c'],[executive,'network-executive'],[outsider,'network-outsider']])await actor.register(name);
 const A=await a.createCompany('network-company-a'),B=await b.createCompany('network-company-b'),C=await c.createCompany('network-company-c');
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[ISOLATED TEST] operator fixture')",[a.user.id]);await a.session();
 const {features,limitNames}=await import('../server/commercial/policy.js'),all=Object.fromEntries(Object.keys(features).map(k=>[k,k!=='custom_domain'])),limits=Object.fromEntries(Object.keys(limitNames).map(k=>[k,k==='team'?10:0]));
 const terms=(code,overrides={})=>({name:'[ISOLATED TEST] '+code,description:'Disposable integration fixture, not published commercial pricing',price:code==='pro'?'5999':'0',currency:'INR',taxMode:code==='pro'?'exclusive':'exempt',taxRate:code==='pro'?'18':'0',interval:'monthly',trialDays:7,effectiveFrom:new Date(Date.now()-86400000).toISOString(),effectiveTo:null,features:all,limits,support:'',...overrides});
 const plans={};
 const publish=async(code)=>{const created=await a.request('/platform/commercial/plans','POST',{code,terms:terms(code),reason:'[ISOLATED TEST] create draft plan'});assert.equal(created.status,201,JSON.stringify(created.data));plans[code]=created.data.id;assert.equal((await a.request('/platform/commercial/plans/'+created.data.id+'/state','POST',{revision:1,status:'active',reason:'[ISOLATED TEST] explicitly publish fixture'})).status,200);};
 const assign=async(company,code,status='active')=>{const state=(await db.query('SELECT revision FROM company_commercial_state WHERE company_id=$1',[company])).rows[0];const r=await a.request('/platform/commercial/companies/'+company+'/subscriptions','POST',{revision:state?.revision||0,planId:plans[code],status,startAt:new Date(Date.now()-30000).toISOString(),endAt:new Date(Date.now()+2*86400000).toISOString(),reason:'[ISOLATED TEST] manual access, no payment'});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;};
 const token=r=>new URLSearchParams(new URL(r.data.shareUrl).hash.split('?')[1]).get('token');
 const partnership=async(sender,recipient)=>{const r=await sender.request('/companies/current/partners','POST',{name:'[ISOLATED TEST] partner',email:recipient.user.email});assert.equal(r.status,201,JSON.stringify(r.data));const raw=token(r),row=(await db.query('SELECT * FROM company_partner_relationships WHERE token_hash=$1',[createHash('sha256').update(raw).digest('hex')])).rows[0];return {token:raw,id:row.id};};
 const accept=(actor,invitation,extra={},headers={})=>actor.request('/companies/current/partners/accept','POST',{token:invitation.token,confirmAccess:true,...extra},headers);
 const relation=async id=>(await db.query('SELECT * FROM company_partner_relationships WHERE id=$1',[id])).rows[0];
 const edit=async(actor,id,values={})=>{const row=await relation(id);return actor.request('/companies/current/partners/'+id,'PATCH',{revision:row.revision,status:'active',assigneeId:row.assignee_id||'',notes:row.notes,...values});};
 await t.test('pre-billing and browser-supplied plan/status claims cannot grant growth features',async()=>{
  const anonymous=env.client();await anonymous.session();const sixth=await anonymous.request('/auth/register','POST',{name:'[TEST] rate limit',email:'sixth@example.invalid',password:'Integration-only password 123!'});assert.equal(sixth.status,429);assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,5);
  assert.equal((await a.request('/companies/current/partners','POST',{name:'[TEST]',email:b.user.email})).data.error.code,'PRO_REQUIRED');
  assert.equal((await a.request('/companies/current/invitations','POST',{email:executive.user.email,role:'part_time_sales',delivery:'share'})).data.error.code,'PRO_REQUIRED');
  assert.equal((await b.request('/companies/current/subscription','POST',{status:'active',planCode:'pro',features:{partners:true}})).status,404);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_partner_relationships')).rows[0].n,0);
 });
 await t.test('PRO price is validated; draft/publication/assignment remain operator-only and snapshotted',async()=>{
  assert.equal((await a.request('/platform/commercial/plans','POST',{code:'pro',terms:terms('pro',{price:'-1'}),reason:'[TEST] invalid PRO price'})).status,400);
  assert.equal((await b.request('/platform/commercial/plans','POST',{code:'free',terms:terms('free'),reason:'[TEST] ordinary owner cannot create plans'})).status,403);
  for(const code of ['free','elite','pro'])await publish(code);
  await assign(A,'pro');await assign(B,'pro');
  const s=await a.request('/companies/current/subscription');assert.equal(s.data.growth.enabled,true);assert.equal(s.data.current.activation_source,'manual_administration');assert.equal(s.data.billingEnabled,false);assert.equal(s.data.current.terms.pricePaise,'599900');
 });
 await t.test('FREE and ELITE cannot create partners or executives even with all base feature flags',async()=>{
  for(const code of ['free','elite']){await assign(C,code);const before=(await db.query('SELECT count(*)::int AS n FROM company_invitations WHERE company_id=$1',[C])).rows[0].n;
   assert.equal((await c.request('/companies/current/partners','POST',{name:'[TEST]',email:a.user.email})).data.error.code,'PRO_REQUIRED');
   assert.equal((await c.request('/companies/current/invitations','POST',{email:second.user.email,role:'part_time_sales',delivery:'share'})).data.error.code,'PRO_REQUIRED');
   assert.equal((await c.request('/companies/current/team')).data.growth.enabled,false);assert.equal((await db.query('SELECT count(*)::int AS n FROM company_invitations WHERE company_id=$1',[C])).rows[0].n,before);
  }
  await assign(C,'pro','trial');assert.equal((await c.request('/companies/current/team')).data.growth.enabled,true);
  const sub=(await db.query('SELECT id,revision FROM company_subscriptions WHERE company_id=$1 AND status=$2',[B,'active'])).rows[0];assert.equal((await a.request('/platform/commercial/companies/'+B+'/subscriptions/'+sub.id+'/actions','POST',{revision:sub.revision,action:'past_due',endAt:null,reason:'[TEST] controlled overdue access'})).status,200);
  assert.equal((await b.request('/companies/current/partners','POST',{name:'[TEST]',email:c.user.email})).data.error.code,'PRO_REQUIRED');await assign(B,'pro');
 });
 let ab;
 await t.test('partner invitation is private, recipient-bound and protected by explicit confirmation/CSRF/origin',async()=>{
  ab=await partnership(a,b);
  assert.equal((await outsider.request('/invitations/preview','POST',{token:ab.token,kind:'partner'})).status,400);
  const preview=await b.request('/invitations/preview','POST',{token:ab.token,kind:'partner'});assert.equal(preview.status,200);assert.deepEqual(Object.keys(preview.data).sort(),['company_name','expires_at','kind','role']);
  assert.equal((await accept(b,ab,{confirmAccess:false})).status,400);assert.equal((await accept(b,ab,{}, {'X-CSRF-Token':''})).status,403);assert.equal((await accept(b,ab,{}, {Origin:'https://evil.example.org'})).status,403);
  assert.equal((await accept(c,ab)).status,400);assert.equal((await relation(ab.id)).status,'pending');
  assert.doesNotMatch(JSON.stringify((await a.request('/companies/current/partners')).data),new RegExp(ab.token));
 });
 await t.test('expired/revoked partner invitations and revoked inviter authority cannot be accepted',async()=>{
  await db.query("UPDATE company_partner_relationships SET expires_at=now()-interval '1 second' WHERE id=$1",[ab.id]);assert.equal((await accept(b,ab)).status,400);
  assert.equal((await edit(a,ab.id,{status:'revoked'})).status,200);assert.equal((await accept(b,ab)).status,400);ab=await partnership(a,b);
  await db.query("UPDATE company_memberships SET status='suspended' WHERE company_id=$1 AND user_id=$2",[A,a.user.id]);
  try{assert.equal((await accept(b,ab)).status,400);}finally{await db.query("UPDATE company_memberships SET status='active' WHERE company_id=$1 AND user_id=$2",[A,a.user.id]);}
  assert.equal((await relation(ab.id)).status,'pending');
 });
 await t.test('acceptance is single-use, grants no memberships and never authorizes a partner dashboard',async()=>{
  const before=(await db.query('SELECT count(*)::int AS n FROM company_memberships')).rows[0].n;assert.equal((await accept(b,ab)).status,200);assert.equal((await accept(b,ab)).status,400);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_memberships')).rows[0].n,before);await b.session();assert.deepEqual(b.company.id,B);assert.equal((await b.request('/companies/select','POST',{companyId:A})).status,403);
  assert.equal((await b.request('/companies/current/partners','GET',undefined,{'X-Company-ID':A})).status,409);assert.equal((await b.request('/companies/current/partners')).data.incoming[0].id,ab.id);
 });
 await t.test('private partner notes/assignments stay with source tenant; permissions and revision prevent bypass',async()=>{
  assert.equal((await edit(a,ab.id,{notes:'PRIVATE SOURCE RELATIONSHIP NOTE',assigneeId:a.user.id})).status,200);
  const own=await a.request('/companies/current/partners');assert.match(JSON.stringify(own.data),/PRIVATE SOURCE RELATIONSHIP NOTE/);assert.doesNotMatch(JSON.stringify((await b.request('/companies/current/partners')).data),/PRIVATE SOURCE RELATIONSHIP NOTE/);
  assert.equal((await edit(b,ab.id,{notes:'attempt overwrite',assigneeId:''})).status,403);assert.equal((await edit(a,ab.id,{assigneeId:b.user.id})).status,400);
  await assert.rejects(db.query('UPDATE company_partner_relationships SET assignee_id=$1 WHERE id=$2',[b.user.id,ab.id]),e=>e.code==='23503');
  const row=await relation(ab.id);assert.equal((await a.request('/companies/current/partners/'+ab.id,'PATCH',{revision:row.revision-1,status:'active',assigneeId:a.user.id,notes:row.notes})).status,409);
  assert.equal((await c.request('/companies/current/partners/'+ab.id,'PATCH',{revision:row.revision,status:'revoked',assigneeId:'',notes:''})).status,409);
 });
 await t.test('recipient can suspend without reading private notes; restoration needs fresh bilateral acceptance',async()=>{
  assert.equal((await edit(b,ab.id,{status:'suspended',notes:'',assigneeId:''})).status,200);assert.equal((await edit(a,ab.id)).status,409);
  assert.equal((await edit(a,ab.id,{status:'revoked'})).status,200);ab=await partnership(a,b);assert.equal((await accept(b,ab)).status,200);
 });
 await t.test('opposite company locks return safe retry responses; concurrent acceptance cannot duplicate pairs',async()=>{
  const ac=await partnership(a,c),ca=await partnership(c,a);
  for(const [company,recipient,invitation] of [[A,c,ac],[C,a,ca]]){const lock=await env.connection();try{await lock.query('BEGIN');await lock.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[company]);const r=await accept(recipient,invitation);assert.equal(r.status,409,JSON.stringify(r.data));assert.equal(r.data.error.code,'PARTNER_BUSY');assert.equal((await relation(invitation.id)).status,'pending');}finally{await lock.query('ROLLBACK');await lock.end();}}
  const responses=await Promise.all([accept(c,ac),accept(a,ca)]);for(const r of responses)assert.ok([200,409].includes(r.status),JSON.stringify(r.data));
  if(!responses.some(r=>r.status===200))assert.equal((await accept(c,ac)).status,200);
  const retry=(await relation(ca.id)).status==='pending'?await accept(a,ca):await accept(c,ac);assert.equal(retry.status,409);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM company_partner_relationships WHERE least(company_id,partner_company_id)=least($1::uuid,$2::uuid) AND greatest(company_id,partner_company_id)=greatest($1::uuid,$2::uuid) AND status='active'",[A,C])).rows[0].n,1);
 });
 let staffToken,member,task;
 const executiveInvite=async(owner,person,details={})=>owner.request('/companies/current/invitations','POST',{email:person.user.email,role:'part_time_sales',delivery:'share',staffDetails:{name:'[TEST] Executive',phone:'',state:'Kerala',city:'Kochi',territory:'Ernakulam',...details}});
 await t.test('part-time role cannot be granted directly or selected with forged privileges',async()=>{
  assert.equal((await a.request('/companies/current/members','POST',{email:executive.user.email,role:'part_time_sales'})).data.error.code,'INVITATION_REQUIRED');
  assert.equal((await a.request('/companies/current/invitations','POST',{email:executive.user.email,role:'owner',delivery:'share'})).status,400);
  assert.equal((await executiveInvite(a,executive,{companyId:B})).status,400);
  const invited=await executiveInvite(a,executive);assert.equal(invited.status,201,JSON.stringify(invited.data));staffToken=token(invited);
  assert.equal((await outsider.request('/invitations/accept','POST',{token:staffToken})).status,400);
  assert.equal((await executive.request('/invitations/accept','POST',{token:staffToken})).status,200);assert.equal((await executive.request('/invitations/accept','POST',{token:staffToken})).status,400);await executive.session();
  assert.equal(executive.company.role,'part_time_sales');assert.deepEqual((await executive.session()).data.permissions,['tasks.own','workspace.read']);member=(await db.query('SELECT * FROM company_memberships WHERE company_id=$1 AND user_id=$2',[A,executive.user.id])).rows[0];assert.equal(member.staff_details.employmentType,'part_time');assert.equal(member.staff_details.city,'Kochi');
 });
 await t.test('team detail updates are scoped/revision-checked; narrower role cannot turn into an administrator',async()=>{
  const details={name:'[TEST] Executive',phone:'',state:'Tamil Nadu',city:'Coimbatore',territory:'West'};
  assert.equal((await a.request('/companies/current/team/'+member.id+'/details','PATCH',{revision:1,staffDetails:details})).status,200);
  assert.equal((await a.request('/companies/current/team/'+member.id+'/details','PATCH',{revision:1,staffDetails:details})).status,409);
  assert.equal((await b.request('/companies/current/team/'+member.id+'/details','PATCH',{revision:2,staffDetails:details})).status,409);
  assert.equal((await a.request('/companies/current/members/'+member.id,'PATCH',{role:'sales',status:'active'})).data.error.code,'ROLE_TRANSFER_REQUIRED');
 });
 const taskBody=(assignee,title)=>({operationKey:randomUUID(),title,description:'[TEST] Call the named prospect and record follow-up only',contactId:null,orderId:null,projectId:null,serviceId:null,assigneeId:assignee,priority:'normal',dueDate:null});
 await t.test('task creation/reassignment is tenant-scoped and idempotent; executives see only their assignments',async()=>{
  const payload=taskBody(executive.user.id,'[TEST] Assigned sales call'),r=await a.request('/companies/current/operations/tasks','POST',payload);assert.equal(r.status,201,JSON.stringify(r.data));task=r.data.id;assert.equal((await a.request('/companies/current/operations/tasks','POST',payload)).data.id,task);
  const privateTask=await a.request('/companies/current/operations/tasks','POST',taskBody(a.user.id,'PRIVATE OWNER TASK'));assert.equal(privateTask.status,201);const other=await b.request('/companies/current/operations/tasks','POST',taskBody(b.user.id,'OTHER TENANT TASK'));assert.equal(other.status,201);
  assert.equal((await a.request('/companies/current/operations/tasks','POST',taskBody(b.user.id,'[TEST] invalid foreign assignee'))).status,400);
  const list=await executive.request('/companies/current/operations/list/tasks');assert.equal(list.status,200);assert.deepEqual(list.data.items.map(x=>x.id),[task]);
  assert.ok((await a.request('/companies/current/operations/options?type=employees')).data.items.some(x=>x.id===executive.user.id));
  assert.equal((await executive.request('/companies/current/operations/list/tasks?assignee='+a.user.id)).data.items.length,0);
  for(const id of [privateTask.data.id,other.data.id])assert.equal((await executive.request('/companies/current/operations/record/tasks/'+id)).status,404);
  for(const endpoint of ['/companies/current/operations/list/contacts','/companies/current/operations/list/leads','/companies/current/operations/list/invoices','/companies/current/quotations','/companies/current/team','/companies/current/partners','/platform/domains'])assert.equal((await executive.request(endpoint)).status,403,endpoint);
  const progress={revision:1,status:'in_progress',completionNotes:'[TEST] called prospect',assigneeId:executive.user.id};assert.equal((await executive.request('/companies/current/operations/tasks/'+task+'/update','POST',{...progress,assigneeId:a.user.id})).status,403);assert.equal((await executive.request('/companies/current/operations/tasks/'+task+'/update','POST',progress)).status,200);
  assert.equal((await executive.request('/companies/current/operations/tasks','POST',taskBody(executive.user.id,'[TEST] unauthorized creation'))).status,403);
 });
 await t.test('new PRO versions do not change existing agreements; active and pending seats count toward caps',async()=>{
  const p=(await db.query('SELECT revision FROM commercial_plans WHERE id=$1',[plans.pro])).rows[0];
  assert.equal((await a.request('/platform/commercial/plans/'+plans.pro+'/versions','POST',{revision:p.revision,terms:terms('pro',{limits:{...limits,team:2}}),reason:'[TEST] cap fixture at two seats'})).status,200);
  assert.equal((await a.request('/companies/current/subscription')).data.current.terms.limits.team,10);
  assert.equal((await a.request('/platform/commercial/plans/'+plans.pro+'/state','POST',{revision:p.revision+1,status:'active',reason:'[TEST] publish capped fixture'})).status,200);await assign(C,'pro');
  const invitation=await executiveInvite(c,second);assert.equal(invitation.status,201);assert.equal((await c.request('/companies/current/invitations','POST',{email:'capacity@example.invalid',role:'sales',delivery:'share'})).data.error.code,'PLAN_LIMIT_REACHED');
  assert.equal((await second.request('/invitations/accept','POST',{token:token(invitation)})).status,200);await second.session();assert.equal(second.company.id,C);
  assert.equal((await c.request('/companies/current/subscription')).data.usage.team,2);
 });
 await t.test('server evaluates automatic expiry; downgrade preserves reads but blocks new PRO activity and edits',async()=>{
  const sub=(await db.query('SELECT s.* FROM company_commercial_state x JOIN company_subscriptions s ON s.id=x.current_subscription_id WHERE x.company_id=$1',[A])).rows[0];
  await db.query("UPDATE company_subscriptions SET end_at=now()-interval '1 second' WHERE id=$1",[sub.id]);
  assert.equal((await a.request('/companies/current/subscription')).data.policy.status,'expired');assert.equal((await a.request('/companies/current/team')).data.growth.enabled,false);
  assert.equal((await executiveInvite(a,outsider)).data.error.code,'ENTITLEMENT_REQUIRED');assert.equal((await a.request('/companies/current/partners','POST',{name:'[TEST]',email:outsider.user.email})).data.error.code,'PRO_REQUIRED');
  assert.equal((await executive.request('/companies/current/operations/tasks/'+task+'/update','POST',{revision:2,status:'completed',completionNotes:'[TEST] blocked by expiry',assigneeId:executive.user.id})).data.error.code,'PRO_REQUIRED');
  assert.equal((await a.request('/companies/current/operations/tasks','POST',taskBody(executive.user.id,'[TEST] blocked assignment'))).status,403);
  const record=await executive.request('/companies/current/operations/record/tasks/'+task);assert.equal(record.status,200);assert.equal(record.data.growth.enabled,false);assert.equal(record.data.record.status,'in_progress');assert.equal((await a.request('/companies/current/partners')).status,200);
  assert.ok(!(await a.request('/companies/current/operations/options?type=employees')).data.items.some(x=>x.id===executive.user.id));
  assert.equal((await edit(a,ab.id,{status:'revoked',notes:'attempt to edit during downgrade'})).data.error.code,'PRO_REQUIRED');assert.equal((await relation(ab.id)).status,'active');assert.equal((await edit(a,ab.id,{status:'revoked'})).status,200);
  assert.equal((await a.request('/companies/current/members/'+member.id,'PATCH',{role:'part_time_sales',status:'suspended'})).status,200);
  assert.equal((await a.request('/companies/current/members/'+member.id,'PATCH',{role:'part_time_sales',status:'active'})).data.error.code,'ENTITLEMENT_REQUIRED');assert.equal((await executive.request('/companies/current/operations/list/tasks')).status,403);
 });
 await t.test('renewal preserves prior agreements/audits and allows only explicitly restored membership',async()=>{
  await assign(A,'pro');assert.equal((await a.request('/companies/current/members/'+member.id,'PATCH',{role:'part_time_sales',status:'active'})).status,200);assert.equal((await executive.request('/companies/select','POST',{companyId:A})).status,200);await executive.session();assert.equal((await executive.request('/companies/current/operations/list/tasks')).status,200);
  assert.ok((await db.query('SELECT count(*)::int AS n FROM company_subscriptions WHERE company_id=$1',[A])).rows[0].n>=2);
  assert.ok((await db.query("SELECT 1 FROM commercial_subscription_events WHERE company_id=$1 AND action='superseded'",[A])).rowCount>0);
  const events=(await db.query("SELECT metadata FROM audit_events WHERE action LIKE 'commercial.%' OR action LIKE 'partner.%'")).rows;assert.doesNotMatch(JSON.stringify(events),new RegExp(staffToken));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_memberships WHERE company_id=$1 AND user_id=$2',[B,executive.user.id])).rows[0].n,0);
 });
});

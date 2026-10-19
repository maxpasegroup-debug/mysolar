import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {applyMigrations} from '../server/db/migrations.js';
import {unitEnvironment} from './helpers/env.mjs';

test('shared team/customer invitations, ownership, service and Boss overview', {skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const url=new URL(process.env.TEST_DATABASE_URL);assert.ok(['localhost','127.0.0.1','::1'].includes(url.hostname.replace(/[\[\]]/g,'')));assert.match(url.pathname,/^\/mysolar_test_[a-z0-9_]+$/);
 const db=new pg.Client({connectionString:url.href});await db.connect();const schema='mysolar_access_'+randomUUID().replaceAll('-','');let server,pool;
 try{
  await db.query('CREATE SCHEMA "'+schema+'"');await db.query('SET search_path TO "'+schema+'",public');
  await applyMigrations(db,{through:'008_commercial.sql'});await applyMigrations(db);await applyMigrations(db);
  const appUrl=new URL(url);appUrl.searchParams.set('options','-c search_path='+schema+',public');unitEnvironment();process.env.DATABASE_URL=appUrl.href;
  const {app}=await import('../server/index.js');pool=(await import('../server/db/pool.js')).pool;server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  const client=()=>({cookie:'',csrf:'',user:null,company:null,async request(path,method='GET',body,extra={}){
   const r=await fetch(base+'/api'+path,{method,headers:{Cookie:this.cookie,...(path.startsWith('/companies/current')?{'X-Company-ID':this.company?.id||''}:{}),...(method==='GET'?{}:{Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Token':this.csrf}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const cookie=r.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];const data=await r.json();if(path==='/auth/session'&&r.ok){this.csrf=data.csrfToken;this.user=data.user;this.company=data.activeCompany;}return {status:r.status,data};
  },async session(){return this.request('/auth/session');},async register(name){await this.session();assert.equal((await this.request('/auth/register','POST',{name:'[TEST] '+name,email:name+'@example.invalid',password:'Business access test 123!'})).status,201);await this.session();}});
  const owner=client(),customer=client(),staff=client(),other=client();for(const [c,name] of [[owner,'access-owner'],[customer,'access-customer'],[staff,'access-staff'],[other,'access-other']])await c.register(name);
  const company=async(c,name)=>{assert.equal((await c.request('/companies','POST',{name:'[TEST] '+name,city:'Kochi',email:name+'@example.invalid',phone:''})).status,201);await c.session();await db.query("UPDATE companies SET lifecycle='active' WHERE id=$1",[c.company.id]);await c.session();return c.company.id;};
  const companyId=await company(owner,'access-company'),otherId=await company(other,'other-company');let employeeToken,contactId,customerToken,orderId;
  const token=result=>new URLSearchParams(new URL(result.data.shareUrl).hash.split('?')[1]).get('token');
  const inviteCustomer=async(id=contactId,extra={})=>{
   const record=(await owner.request('/companies/current/operations/record/contacts/'+id)).data.record;
   return owner.request('/companies/current/operations/contacts/'+id+'/invitations','POST',{revision:record.revision,delivery:'share',confirmCustomerAccess:true,...extra});
  };
  await t.test('all supported employee roles can use private sharing without SMTP',async()=>{
   const team=await owner.request('/companies/current/team');assert.equal(team.data.available,true);assert.equal(team.data.emailAvailable,false);
   const ordinaryRoles=['sales','supervisor','field_engineer','inventory_manager','accounts'];
   assert.deepEqual(team.data.assignableRoles,[...ordinaryRoles,'part_time_sales']);
   const denied=await owner.request('/companies/current/invitations','POST',{email:'part_time_sales@example.invalid',role:'part_time_sales',delivery:'share'});assert.equal(denied.status,403);assert.equal(denied.data.error.code,'PRO_REQUIRED');
   for(const role of ordinaryRoles){const r=await owner.request('/companies/current/invitations','POST',{email:role==='sales'?staff.user.email:role+'@example.invalid',role,delivery:'share'});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.kind,'employee');if(role==='sales')employeeToken=token(r);}
   const rows=await owner.request('/companies/current/invitations');assert.ok(!JSON.stringify(rows.data).includes(employeeToken));assert.ok(rows.data.invitations.every(i=>i.delivery==='share'));
   assert.equal((await owner.request('/companies/current/invitations','POST',{email:'mail@example.invalid',role:'sales',delivery:'email'})).status,503);
  });
  await t.test('unconfigured recovery is honest and does not create or expose reset tokens',async()=>{
   for(const email of [customer.user.email,'unknown-recovery@example.invalid']){const r=await customer.request('/auth/recover','POST',{email});assert.equal(r.status,503);assert.equal(r.data.error.code,'RECOVERY_UNAVAILABLE');}
   assert.equal((await db.query('SELECT count(*)::int AS n FROM password_reset_tokens')).rows[0].n,0);
  });
  await t.test('team invitation is recipient-bound, single-use and enforces the selected role',async()=>{
   assert.equal((await customer.request('/invitations/preview','POST',{token:employeeToken,kind:'employee'})).status,400);
   const preview=await staff.request('/invitations/preview','POST',{token:employeeToken,kind:'employee'});assert.equal(preview.status,200);assert.equal(preview.data.role,'sales');assert.equal(preview.data.company_name,'[TEST] access-company');
   await db.query("UPDATE company_invitations SET expires_at=now()-interval '1 second' WHERE email=$1",[staff.user.email]);
   assert.equal((await staff.request('/invitations/accept','POST',{token:employeeToken})).status,400);
   await db.query("UPDATE company_invitations SET expires_at=now()+interval '1 hour' WHERE email=$1",[staff.user.email]);
   assert.equal((await customer.request('/invitations/accept','POST',{token:employeeToken})).status,400);
   assert.equal((await staff.request('/invitations/accept','POST',{token:employeeToken})).status,200);await staff.session();assert.equal(staff.company.role,'sales');
   assert.equal((await staff.request('/invitations/accept','POST',{token:employeeToken})).status,400);
   assert.equal((await staff.request('/companies/current/invitations','POST',{email:'deny@example.invalid',role:'accounts',delivery:'share'})).status,403);
   assert.equal((await staff.request('/companies/current/operations/dashboard')).data.cards.some(c=>c.money||c.kind==='invoices'),false);
  });
  await t.test('company customer is not an account until explicit invitation acceptance',async()=>{
   const r=await owner.request('/companies/current/operations/contacts','POST',{operationKey:randomUUID(),kind:'individual',name:'[TEST] Customer contact',email:customer.user.email,phone:'',billingAddress:'',serviceAddress:''});assert.equal(r.status,201);contactId=r.data.id;
   assert.equal((await db.query('SELECT user_id FROM company_contacts WHERE id=$1',[contactId])).rows[0].user_id,null);
   assert.equal((await inviteCustomer(contactId,{confirmCustomerAccess:false})).status,400);
   assert.equal((await other.request('/companies/current/operations/contacts/'+contactId+'/invitations','POST',{revision:1,delivery:'share',confirmCustomerAccess:true})).status,404);
   assert.equal((await staff.request('/companies/current/operations/contacts/'+contactId+'/invitations','POST',{revision:1,delivery:'share',confirmCustomerAccess:true})).status,403);
   const r2=await inviteCustomer();assert.equal(r2.status,201,JSON.stringify(r2.data));customerToken=token(r2);assert.equal(r2.data.kind,'customer');
   const invitations=(await owner.request('/companies/current/operations/record/contacts/'+contactId)).data.customerInvitations;assert.equal(invitations.length,1);assert.ok(!JSON.stringify(invitations).includes(customerToken));
  });
  await t.test('revocation, changed records and expiry invalidate customer links',async()=>{
   let row=(await db.query("SELECT id FROM customer_access_invitations WHERE contact_id=$1 AND status='pending'",[contactId])).rows[0];
   assert.equal((await owner.request('/companies/current/operations/contacts/'+contactId+'/invitations/'+row.id+'/revoke','POST',{})).status,200);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,400);
   customerToken=token(await inviteCustomer());await db.query('UPDATE company_contacts SET revision=revision+1 WHERE id=$1',[contactId]);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,400);
   customerToken=token(await inviteCustomer());await db.query("UPDATE customer_access_invitations SET expires_at=now()-interval '1 second' WHERE contact_id=$1 AND status='pending'",[contactId]);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,400);
   customerToken=token(await inviteCustomer());
  });
  await t.test('owner-reviewed existing records become visible only to the accepting customer',async()=>{
   orderId=randomUUID();await db.query("INSERT INTO business_orders(id,company_id,contact_id,reference,terms,total_paise,billing_address,service_address,owner_id,status,acceptance_mode,agreement_reference,confirmed_by,confirmed_at) VALUES($1,$2,$3,'TEST-SHARED-ORDER','{}',10000,'','',$4,'confirmed','external','TEST agreement',$4,now())",[orderId,companyId,contactId,owner.user.id]);
   await db.query("INSERT INTO operations_events(company_id,record_type,record_id,action,actor_id,notes,customer_visible) VALUES($1,'orders',$2,'internal_note',$3,'TEST PRIVATE NOTE',false)",[companyId,orderId,owner.user.id]);
   assert.equal((await customer.request('/customer/operations/record/orders/'+orderId)).status,404);
   const preview=await customer.request('/invitations/preview','POST',{token:customerToken,kind:'customer'});assert.equal(preview.status,200);assert.equal(preview.data.role,'customer');
   assert.equal((await other.request('/invitations/preview','POST',{token:customerToken,kind:'customer'})).status,400);
   assert.equal((await other.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,400);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:false})).status,400);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true},{'X-CSRF-Token':''})).status,403);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,200);
   assert.equal((await customer.request('/invitations/customer/accept','POST',{token:customerToken,confirmAccess:true})).status,400);
   const r=await customer.request('/customer/operations/record/orders/'+orderId);assert.equal(r.status,200);assert.ok(!JSON.stringify(r.data).includes('TEST PRIVATE NOTE'));
   assert.equal((await other.request('/customer/operations/record/orders/'+orderId)).status,404);
   const session=await customer.session();assert.deepEqual(session.data.companies,[]);
   const overview=await customer.request('/customer/experience/overview');assert.equal(overview.data.companies[0].id,companyId);assert.equal(overview.data.sections.find(s=>s.key==='orders').total,1);
   await customer.request('/auth/logout','POST',{});await customer.session();
   assert.equal((await customer.request('/auth/login','POST',{email:'access-customer@example.invalid',password:'Business access test 123!'})).status,200);await customer.session();
   assert.equal((await customer.request('/customer/operations/record/orders/'+orderId)).status,200);
  });
  await t.test('linked customer reports after-sales service visible in their own dashboard',async()=>{
   const r=await customer.request('/customer/operations/orders/'+orderId+'/service','POST',{operationKey:randomUUID(),issue:'[TEST] Please inspect the recorded installation',priority:'normal'});assert.equal(r.status,201);
   assert.equal((await customer.request('/customer/operations/record/service/'+r.data.id)).status,200);assert.equal((await other.request('/customer/operations/record/service/'+r.data.id)).status,404);
   assert.equal((await customer.request('/customer/experience/overview')).data.sections.find(s=>s.key==='service').total,1);
  });
  await t.test('Boss priorities are tenant-scoped and financial summaries stay permission-scoped',async()=>{
   const invoice=randomUUID();await db.query("INSERT INTO customer_invoices(id,company_id,order_id,contact_id,reference,snapshot,total_paise,issue_date,due_date,status) VALUES($1,$2,$3,$4,'TEST-INVOICE','{}',10000,current_date-3,current_date-1,'issued')",[invoice,companyId,orderId,contactId]);
   await db.query("INSERT INTO business_tasks(id,company_id,title,assignee_id,priority,due_date) VALUES($1,$2,'TEST TEAM TASK',$3,'normal',current_date-1)",[randomUUID(),companyId,staff.user.id]);
   await db.query("INSERT INTO business_tasks(id,company_id,title,assignee_id,priority,due_date) VALUES($1,$2,'OTHER COMPANY SECRET',$3,'normal',current_date-1)",[randomUUID(),otherId,other.user.id]);
   const r=await owner.request('/companies/current/operations/dashboard');assert.equal(r.status,200);assert.equal(r.data.outstanding,'10000');assert.ok(r.data.gettingStarted.customers>=1);assert.ok(r.data.gettingStarted.employees>=1);assert.ok(JSON.stringify(r.data).includes('TEST TEAM TASK'));assert.ok(JSON.stringify(r.data).includes('TEST-INVOICE'));assert.ok(!JSON.stringify(r.data).includes('OTHER COMPANY SECRET'));
   const restricted=await staff.request('/companies/current/operations/dashboard');assert.equal(restricted.status,200);assert.equal(restricted.data.outstanding,null);assert.equal(restricted.data.gettingStarted.employees,undefined);assert.ok(!restricted.data.priorities.some(p=>p.kind==='invoices'));
   assert.equal((await owner.request('/companies/current/operations/dashboard','GET',undefined,{'X-Company-ID':otherId})).status,409);
  });
 }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(pool)await pool.end();await db.query('DROP SCHEMA "'+schema+'" CASCADE');await db.end();}
});

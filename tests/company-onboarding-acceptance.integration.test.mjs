import nodemailer from 'nodemailer';
import {mockSignupMail,verifiedRegister} from './helpers/identity.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {staffRoles,permissionsFor} from '../server/permissions.js';

test('complete company onboarding and independent login for every supported staff role', {skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);const messages=mockSignupMail(t,nodemailer);await env.start();
 // Keep the real registration-quota check in one window even across a wall-clock rollover.
 const quotaClock=Date.now();t.mock.method(Date,'now',()=>quotaClock);
 const password=randomBytes(30).toString('base64url'); // Ephemeral test secret, never printed or saved.
 const owner=env.client(),operator=env.client(),actors=[];
 async function register(client,role){await client.session();const r=await verifiedRegister(client,{name:'[LOCAL TEST] '+role,email:role+'@example.invalid',password,accountType:role==='customer'?'customer':'business'},db,messages);assert.equal(r.status,201,JSON.stringify(r.data));await client.session();}
 await register(owner,'acceptance-owner');await register(operator,'acceptance-operator');
 // Explicit isolated fixture bootstrap only; company owner receives no platform grant.
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[LOCAL TEST] independent reviewer fixture')",[operator.user.id]);
 let companyId;
 const setup=async()=>(await owner.request('/companies/current/setup')).data;
 await t.test('unsupported supplier type and browser-supplied activation cannot create tenants',async()=>{
  const details={name:'[LOCAL TEST] rejected company',city:'[TEST] City',email:'rejected@example.invalid',phone:''};
  assert.equal((await owner.request('/companies','POST',{...details,businessType:'supplier'})).status,400);
  assert.equal((await owner.request('/companies','POST',{...details,businessType:'both',lifecycle:'active'})).status,400);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM companies')).rows[0].n,0);
 });
 await t.test('owner creates one draft tenant and completes the three supported setup steps',async()=>{
  assert.equal((await owner.request('/companies','POST',{businessType:'both',name:'[LOCAL TEST] MY Solar Solutions',city:'[TEST] City',email:'acceptance-company@example.invalid',phone:''})).status,201);await owner.session();companyId=owner.company.id;
  assert.equal((await setup()).profile.business_type,'both');assert.equal(owner.company.role,'owner');assert.equal(owner.company.lifecycle,'draft');assert.deepEqual((await owner.session()).data.platformPermissions,[]);
  assert.equal((await owner.request('/companies/current/onboarding/submit','POST',{revision:(await setup()).company.revision})).status,409);
  const profile={revision:(await setup()).company.revision,legalName:'[LOCAL TEST] Fictional legal name',displayName:'[LOCAL TEST] MY Solar Solutions',businessType:'both',contactPerson:'[LOCAL TEST] Owner',email:'acceptance-company@example.invalid',phone:'0000000000',address:'[LOCAL TEST] Fictional address',state:'[TEST] State',district:'[TEST] District',pin:'682001',language:'en',website:'https://mysolar.solutions/'};
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',profile)).status,200);
  assert.equal((await owner.request('/companies/current/branding','PUT',{revision:(await setup()).company.revision,publicName:'[LOCAL TEST] MY Solar Solutions',logoUrl:'',primary:'#601c2b',secondary:'#292b29',accent:'#d8ab55',welcome:'Local acceptance rehearsal',email:'acceptance-company@example.invalid',phone:'',description:'[LOCAL TEST] Fictional solar solutions company.',appearance:'warm',requestedDomain:''})).status,200);
  assert.equal((await owner.request('/companies/current/onboarding/business','PUT',{revision:(await setup()).company.revision,services:['solar_panels','rooftop_installation','maintenance'],rooftop:true,areas:['[LOCAL TEST] coverage only'],contactMethod:'email',marketplaceRequested:false})).status,200);
  assert.equal((await owner.request('/companies/current/onboarding/submit','POST',{revision:(await setup()).company.revision})).status,200);
  assert.equal((await setup()).company.lifecycle,'pending_review');
 });
 await t.test('owner cannot self-approve; independent operator activates without publication or payment',async()=>{
  const action={revision:(await setup()).company.revision,action:'approve',reason:'[LOCAL TEST] reviewed fictional setup'};
  assert.equal((await owner.request('/platform/companies/'+companyId+'/actions','POST',action)).status,403);
  assert.equal((await operator.request('/platform/companies/'+companyId+'/actions','POST',action)).status,200);
  const data=await setup();assert.equal(data.company.lifecycle,'active');assert.equal(data.company.storefront_published,false);
  const daily=await owner.request('/companies/current/operations/dashboard');assert.equal(daily.status,200);assert.deepEqual(daily.data.company,{lifecycle:'active',marketplace_status:'not_requested',storefront_published:false});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_subscriptions')).rows[0].n,0);
 });
 await t.test('PRO-only role is blocked until explicit authorized trial assignment',async()=>{
  assert.equal((await owner.request('/companies/current/invitations','POST',{email:'part_time_sales@example.invalid',role:'part_time_sales',delivery:'share'})).data.error.code,'PRO_REQUIRED');
  const {features,limitNames}=await import('../server/commercial/policy.js');
  const terms={name:'[LOCAL TEST] PRO',description:'Fictional test terms only',price:'5999',currency:'INR',taxMode:'exclusive',taxRate:'18',interval:'monthly',trialDays:7,effectiveFrom:new Date(Date.now()-86400000).toISOString(),effectiveTo:null,features:Object.fromEntries(Object.keys(features).map(k=>[k,k!=='custom_domain'])),limits:Object.fromEntries(Object.keys(limitNames).map(k=>[k,null])),support:''};
  const plan=await operator.request('/platform/commercial/plans','POST',{code:'pro',terms,reason:'[LOCAL TEST] plan fixture'});assert.equal(plan.status,201,JSON.stringify(plan.data));
  assert.equal((await operator.request('/platform/commercial/plans/'+plan.data.id+'/state','POST',{revision:1,status:'active',reason:'[LOCAL TEST] publish fixture'})).status,200);
  const assigned=await operator.request('/platform/commercial/companies/'+companyId+'/subscriptions','POST',{revision:0,planId:plan.data.id,status:'trial',startAt:new Date(Date.now()-30000).toISOString(),endAt:new Date(Date.now()+6*86400000).toISOString(),reason:'[LOCAL TEST] manually assigned access; no payment'});assert.equal(assigned.status,201,JSON.stringify(assigned.data));
 });
 for(const role of staffRoles)await t.test(role+': register, accept recipient-bound invitation, logout and login independently',async()=>{
  // Test-only bucket rollover, confined to the generated schema: a whole team
  // registers across multiple windows. First prove the real 5/IP limit rejects.
  if(actors.length===3){const sixth=env.client();await sixth.session();assert.equal((await sixth.request('/auth/register','POST',{name:'[LOCAL TEST] rate limited',email:'rate-limited@example.invalid',password})).status,429);await db.query('DELETE FROM rate_limit_buckets');}
  const employee=env.client();await register(employee,role);const id=employee.user.id;
  const invitation=await owner.request('/companies/current/invitations','POST',{email:role+'@example.invalid',role,delivery:'share'});assert.equal(invitation.status,201,JSON.stringify(invitation.data));
  const token=new URLSearchParams(new URL(invitation.data.shareUrl).hash.split('?')[1]).get('token');assert.ok(token);
  assert.equal((await operator.request('/invitations/accept','POST',{token})).status,400);
  assert.equal((await employee.request('/invitations/accept','POST',{token})).status,200);await employee.session();assert.equal(employee.company.id,companyId);assert.equal(employee.company.role,role);
  assert.equal((await employee.request('/invitations/accept','POST',{token})).status,400);
  assert.equal((await employee.request('/auth/logout','POST',{})).status,200);await employee.session();assert.equal(employee.user,null);
  assert.equal((await employee.request('/auth/login','POST',{email:role+'@example.invalid',password})).status,200);const session=await employee.session();assert.equal(employee.user.id,id);assert.equal(employee.company.id,companyId);assert.equal(employee.company.role,role);
  assert.deepEqual(session.data.permissions,await permissionsFor(db,role));assert.deepEqual(session.data.platformPermissions,[]);
  assert.equal((await employee.request('/companies/current/operations/dashboard')).data.company,null);
  assert.equal((await employee.request('/companies/current/team')).status,403);assert.equal((await employee.request('/platform/companies')).status,403);
  assert.equal((await employee.request('/companies/current/invitations','POST',{email:'forbidden@example.invalid',role:'sales',delivery:'share'})).status,403);
  actors.push({employee,id,role});
 });
 await t.test('all roles are associated once; duplicate accounts/memberships and company switching are rejected',async()=>{
  const team=await owner.request('/companies/current/team');assert.equal(team.status,200);assert.deepEqual(team.data.members.map(x=>x.role).sort(),['owner',...staffRoles].sort());
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_invitations WHERE company_id=$1 AND status=\'accepted\'',[companyId])).rows[0].n,staffRoles.length);
  const outsider=env.client();await outsider.session();assert.equal((await outsider.request('/auth/register','POST',{name:'[TEST] duplicate',email:'sales@example.invalid',password,accountType:'business'})).status,409);
  assert.equal((await owner.request('/companies/current/invitations','POST',{email:'sales@example.invalid',role:'sales',delivery:'share'})).status,409);
  assert.equal((await operator.request('/companies/select','POST',{companyId})).status,403);
  assert.equal((await owner.request('/companies/current/team','GET',undefined,{'X-Company-ID':operator.user.id})).status,409);
  assert.equal((await actors[0].employee.request('/auth/logout-all','POST',{}, {'X-CSRF-Token':''})).status,403);
  assert.equal((await actors[0].employee.request('/auth/logout-all','POST',{}, {Origin:'https://untrusted.example.invalid'})).status,403);
  const hashes=(await db.query('SELECT password_hash FROM users')).rows;assert.ok(hashes.every(row=>row.password_hash.startsWith('$argon2id$')&&!row.password_hash.includes(password)));
 });
 await t.test('owner fresh login retains tenant and ordinary staff cannot read accounting records',async()=>{
  assert.equal((await owner.request('/auth/logout','POST',{})).status,200);await owner.session();assert.equal((await owner.request('/auth/login','POST',{email:'acceptance-owner@example.invalid',password})).status,200);await owner.session();assert.equal(owner.company.id,companyId);assert.equal(owner.company.role,'owner');
  for(const {employee,role} of actors){assert.equal((await employee.request('/companies/current/operations/list/invoices')).status,role==='accounts'?200:403,role);}
  assert.equal((await owner.request('/auth/recover','POST',{email:owner.user.email})).status,202);assert.equal((await db.query('SELECT count(*)::int AS n FROM password_reset_tokens')).rows[0].n,1);
 });
});

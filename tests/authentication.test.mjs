import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {applyMigrations} from '../server/db/migrations.js';
import {unitEnvironment} from './helpers/env.mjs';

test('customer and distributor authentication against isolated PostgreSQL', {skip:!process.env.TEST_DATABASE_URL,timeout:90000}, async t=>{
 const url=new URL(process.env.TEST_DATABASE_URL);
 assert.ok(['localhost','127.0.0.1','::1'].includes(url.hostname.replace(/[\[\]]/g,'')));
 assert.match(url.pathname,/^\/mysolar_test_[a-z0-9_]+$/);
 const db=new pg.Client({connectionString:url.href});await db.connect();
 const schema='mysolar_auth_'+randomUUID().replaceAll('-','');let server,pool;
 try{
  await db.query('CREATE SCHEMA "'+schema+'"');await db.query('SET search_path TO "'+schema+'",public');await applyMigrations(db);
  const appUrl=new URL(url);appUrl.searchParams.set('options','-c search_path='+schema+',public');
  unitEnvironment();process.env.DATABASE_URL=appUrl.href;
  const {app}=await import('../server/index.js');pool=(await import('../server/db/pool.js')).pool;
  server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  const password='Isolated auth review 123!';
  const client=()=>({cookie:'',csrf:'',user:null,async request(path,method='GET',body,headers={}){
   const response=await fetch(base+'/api'+path,{method,headers:{Cookie:this.cookie,...(method==='GET'?{}:{Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Token':this.csrf}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const cookie=response.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];
   const data=await response.json();if(path==='/auth/session'&&response.ok){this.csrf=data.csrfToken;this.user=data.user;}
   return {status:response.status,data,cookie};
  }});
  const customer=client(),distributor=client();
  await t.test('customer signup creates a profile, rotates session and grants no company privileges',async()=>{
   assert.equal((await customer.request('/auth/session')).status,200);const anonymous=customer.cookie;
   const r=await customer.request('/auth/register','POST',{name:'[TEST] Customer',email:'customer-auth@example.invalid',password});assert.equal(r.status,201);assert.notEqual(customer.cookie,anonymous);assert.match(r.cookie,/HttpOnly/i);
   const session=await customer.request('/auth/session');assert.equal(session.data.user.email,'customer-auth@example.invalid');assert.deepEqual(session.data.companies,[]);assert.deepEqual(session.data.platformPermissions,[]);
   assert.equal((await customer.request('/customer/profile')).status,200);
   assert.equal((await customer.request('/platform/commercial/settings')).status,403);
  });
  await t.test('unconfigured PIN rollout leaves legacy access usable and sends no email',async()=>{
   const s=await customer.request('/auth/session');assert.equal(s.data.pinAvailable,false);assert.equal(s.data.pinEmailAvailable,false);
   assert.equal((await customer.request('/auth/pin/login','POST',{mobile:'9876504321',pin:'483729'})).status,503);
   assert.equal((await customer.request('/auth/pin/reset/request','POST',{mobile:'9876504321'})).status,503);
   assert.equal((await db.query("SELECT 1 FROM mail_jobs WHERE kind='pin_otp'")).rowCount,0);
  });
  await t.test('customer logout revokes the cookie and login restores the same account',async()=>{
   const oldCookie=customer.cookie,id=customer.user.id;assert.equal((await customer.request('/auth/logout','POST',{})).status,200);
   customer.cookie=oldCookie;assert.equal((await customer.request('/auth/session')).data.user,null);
   assert.equal((await customer.request('/auth/login','POST',{email:'customer-auth@example.invalid',password})).status,200);
   assert.equal((await customer.request('/auth/session')).data.user.id,id);
  });
  await t.test('distributor signup remains personal until explicit company creation',async()=>{
   await distributor.request('/auth/session');assert.equal((await distributor.request('/auth/register','POST',{name:'[TEST] Distributor',email:'distributor-auth@example.invalid',password})).status,201);
   const session=await distributor.request('/auth/session');assert.deepEqual(session.data.companies,[]);assert.equal(session.data.activeCompany,null);
   assert.equal((await distributor.request('/companies','POST',{name:'[TEST] Auth Company',city:'Kochi',email:'business-auth@example.invalid',phone:''})).status,201);
   const companySession=await distributor.request('/auth/session');assert.equal(companySession.data.activeCompany.role,'owner');assert.equal(companySession.data.companies.length,1);assert.deepEqual(companySession.data.platformPermissions,[]);
  });
  await t.test('distributor login restores authorized company while customer stays separate',async()=>{
   const id=distributor.user.id;await distributor.request('/auth/logout','POST',{});await distributor.request('/auth/session');
   assert.equal((await distributor.request('/auth/login','POST',{email:'distributor-auth@example.invalid',password})).status,200);
   const session=await distributor.request('/auth/session');assert.equal(session.data.user.id,id);assert.equal(session.data.activeCompany.role,'owner');
   assert.deepEqual((await customer.request('/auth/session')).data.companies,[]);
  });
  await t.test('wrong passwords, missing CSRF, duplicate accounts and privilege payloads are rejected',async()=>{
   const stranger=client();await stranger.request('/auth/session');
   assert.equal((await stranger.request('/auth/login','POST',{email:'customer-auth@example.invalid',password:'Incorrect password 123!'})).status,401);
   assert.equal((await stranger.request('/auth/register','POST',{name:'[TEST]',email:'csrf-auth@example.invalid',password},{'X-CSRF-Token':''})).status,403);
   assert.equal((await stranger.request('/auth/register','POST',{name:'[TEST]',email:'customer-auth@example.invalid',password})).status,409);
   assert.equal((await stranger.request('/auth/register','POST',{name:'[TEST]',email:'privilege-auth@example.invalid',password,role:'platform_admin'})).status,400);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
  });
 }finally{
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(pool)await pool.end();
  await db.query('DROP SCHEMA "'+schema+'" CASCADE');await db.end();
 }
});

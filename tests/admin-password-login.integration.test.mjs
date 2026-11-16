import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('existing ten-character admin credential authenticates without relaxing creation policies',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const browserScript=process.env.MYSOLAR_ADMIN_SHORT_BROWSER_SCRIPT;
 const env=await isolatedApp(t,{port:browserScript?3000:0}),{db}=env;
 assert.equal((await db.query('SELECT host(inet_server_addr()) AS host')).rows[0].host,'127.0.0.1');
 assert.ok((await db.query('SHOW data_directory')).rows[0].data_directory.replaceAll('\\','/').toLowerCase().startsWith(process.cwd().replaceAll('\\','/').toLowerCase()+'/.verification/postgres/cluster-'));
 await env.applyMigrations(db);await env.start();
 const password=randomBytes(5).toString('hex'),email='ten-character-admin@example.invalid';assert.equal(password.length,10);
 // Simulate an existing legacy credential in the disposable fixture only.
 // Public signup/reset are deliberately NOT permitted to create this password.
 const id=await seedIdentity(db,{name:'[TEST] Existing admin credential',email,password,accountType:'business'});
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] Existing local administrator fixture')",[id]);
 const before=(await db.query('SELECT password_hash FROM users WHERE id=$1',[id])).rows[0].password_hash;
 const client=env.client();await client.session();
 await t.test('valid ten-character credential issues the existing authorised session',async()=>{
  assert.equal((await client.request('/auth/login','POST',{email,password,purpose:'platform'})).status,200);const session=await client.session();
  assert.ok(session.data.platformPermissions.includes('platform.companies.read'));assert.equal((await client.request('/platform/companies')).status,200);
  assert.equal((await client.request('/auth/logout','POST',{})).status,200);await client.session();
 });
 await t.test('wrong ten-character credential is rejected as authentication, not creation-policy validation',async()=>{
  const bad=await client.request('/auth/login','POST',{email,password:randomBytes(5).toString('hex'),purpose:'platform'});
  assert.equal(bad.status,401);assert.equal(bad.data.error.code,'INVALID_CREDENTIALS');await client.session();assert.equal(client.user,null);
 });
 await t.test('ten-character credentials do not bypass grants or the separate Customer/Business policy',async()=>{
  for(const type of ['business','customer']){
   const address='ten-character-'+type+'@example.invalid';await seedIdentity(db,{name:'[TEST] Ordinary '+type,email:address,password,accountType:type});
   assert.equal((await client.request('/auth/login','POST',{email:address,password,purpose:'platform'})).status,401);
   assert.equal((await client.request('/auth/login','POST',{email:address,password,accountType:type})).status,400);
  }
 });
 await t.test('reset and change-password minimums remain twelve; login remains bounded',async()=>{
  const reset=await client.request('/auth/reset-password','POST',{token:randomBytes(32).toString('base64url'),password});
  assert.equal(reset.status,400);assert.equal(reset.data.error.code,'VALIDATION_ERROR');assert.match(reset.data.error.message,/12/);
  const v=await import('../server/validation.js');assert.throws(()=>v.password(password),{code:'VALIDATION_ERROR'});
  for(const value of ['',null,'x'.repeat(129)])assert.equal((await client.request('/auth/login','POST',{email,password:value,purpose:'platform'})).status,400);
 });
 if(browserScript)await t.test('desktop and mobile forms submit ten characters and redirect to platform',async()=>{const {run}=await import(browserScript);await run({env,email,password});});
 await t.test('authentication did not rewrite the existing stored credential',async()=>{
  const after=(await db.query('SELECT password_hash FROM users WHERE id=$1',[id])).rows[0].password_hash;
  assert.ok(before===after,'Login must never change the stored password hash');
 });
});

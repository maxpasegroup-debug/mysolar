import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('dedicated admin entrance reuses identities, sessions and server platform permissions',{skip:!process.env.TEST_DATABASE_URL,timeout:240000},async t=>{
 const browserScript=process.env.MYSOLAR_ADMIN_BROWSER_SCRIPT;
 const env=await isolatedApp(t,{port:browserScript?3000:0}),{db}=env;
 assert.equal((await db.query('SELECT host(inet_server_addr()) AS host')).rows[0].host,'127.0.0.1');
 assert.match((await db.query('SHOW data_directory')).rows[0].data_directory.replaceAll('\\','/').toLowerCase(),new RegExp('^'+process.cwd().replaceAll('\\','/').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/.verification/postgres/cluster-'));
 await env.applyMigrations(db);await env.start();
 const password=randomBytes(24).toString('base64url'),users={};
 for(const [name,accountType] of [['operator','business'],['business','business'],['customer','customer']])users[name]=await seedIdentity(db,{name:'[TEST] '+name,email:'admin-login-'+name+'@example.invalid',password,accountType});
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] explicit local operator grant')",[users.operator]);
 const operator=env.client(),guest=env.client();await operator.session();await guest.session();
 const login=(client,name,extra={})=>client.request('/auth/login','POST',{email:'admin-login-'+name+'@example.invalid',password,purpose:'platform',...extra});
 await t.test('unknown, customer and business accounts have identical generic rejection and no authenticated session',async()=>{
  for(const name of ['unknown','customer','business']){const r=await login(guest,name);assert.equal(r.status,401);assert.equal(r.data.error.code,'INVALID_CREDENTIALS');assert.equal(r.data.error.message,'The email or password is incorrect.');await guest.session();assert.equal(guest.user,null);}
  assert.equal((await guest.request('/platform/companies')).status,401);
 });
 await t.test('existing granted operator logs in with rotated HttpOnly session and existing dashboard permission',async()=>{
  const before=operator.cookie,r=await login(operator,'operator');assert.equal(r.status,200);assert.notEqual(operator.cookie,before);assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=Lax/i);
  const session=await operator.session();assert.ok(session.data.platformPermissions.includes('platform.companies.read'));assert.equal((await operator.request('/platform/companies?queue=onboarding')).status,200);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM platform_admin_grants')).rows[0].n,1);
 });
 await t.test('CSRF, logout and absolute expiry still fail closed',async()=>{
  assert.equal((await operator.request('/auth/logout','POST',{}, {'X-CSRF-Token':''})).status,403);
  assert.equal((await operator.request('/auth/logout','POST',{})).status,200);await operator.session();assert.equal(operator.user,null);assert.equal((await operator.request('/platform/companies')).status,401);
  assert.equal((await login(operator,'operator')).status,200);await operator.session();await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1",[users.operator]);const expired=await operator.request('/platform/companies');assert.equal(expired.status,409);assert.equal(expired.data.error.code,'ACCOUNT_CONTEXT_CHANGED');await operator.session();assert.equal(operator.user,null);assert.equal((await operator.request('/platform/companies')).status,401);
 });
 await t.test('ordinary customer and business login and API restrictions remain unchanged',async()=>{
  for(const name of ['customer','business']){const c=env.client();await c.session();assert.equal((await c.request('/auth/login','POST',{email:'admin-login-'+name+'@example.invalid',password,accountType:name})).status,200);await c.session();assert.equal(c.user.accountType,name);assert.equal((await c.request('/platform/companies')).status,403);assert.equal((await c.request('/auth/logout','POST',{})).status,200);}
 });
 await t.test('enrolled second factor is required and single-use recovery proof uses existing verification',async()=>{
  const {seal}=await import('../server/auth/sealed.js'),{digest}=await import('../server/auth/security.js');const recovery=randomBytes(12).toString('hex');
  await db.query('INSERT INTO account_security(user_id,secret,recovery_hashes) VALUES($1,$2,$3)',[users.operator,seal('JBSWY3DPEHPK3PXP'),[digest(recovery)]]);
  const c=env.client();await c.session();assert.equal((await login(c,'operator')).data.error.code,'MFA_REQUIRED');await c.session();assert.equal(c.user,null);assert.equal((await login(c,'operator',{code:recovery})).status,200);await c.session();assert.equal((await c.request('/platform/companies')).status,200);assert.equal((await c.request('/auth/logout','POST',{})).status,200);await c.session();assert.equal((await login(c,'operator',{code:recovery})).status,403);
  await db.query('DELETE FROM account_security WHERE user_id=$1',[users.operator]);
 });
 if(browserScript)await t.test('real Chrome desktop/mobile administrator login and session acceptance',async()=>{const {run}=await import(browserScript);await run({env,db,users,password});});
 await t.test('revoked grant prevents dedicated login and platform access in an existing session',async()=>{
  const c=env.client();await c.session();assert.equal((await login(c,'operator')).status,200);await c.session();await db.query('DELETE FROM platform_admin_grants WHERE user_id=$1',[users.operator]);assert.equal((await c.request('/platform/companies')).status,403);await c.request('/auth/logout','POST',{});await c.session();assert.equal((await login(c,'operator')).status,401);
 });
});

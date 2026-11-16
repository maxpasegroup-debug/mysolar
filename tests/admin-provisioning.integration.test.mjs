import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('private one-time provisioning reuses signup, operator grant and recovery',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const env=await isolatedApp(t),{db}=env;
 assert.equal((await db.query('SELECT host(inet_server_addr()) AS host')).rows[0].host,'127.0.0.1');
 const directory=(await db.query('SHOW data_directory')).rows[0].data_directory.replaceAll('\\','/').toLowerCase();
 assert.ok(directory.startsWith(process.cwd().replaceAll('\\','/').toLowerCase()+'/.verification/postgres/cluster-'));
 await env.applyMigrations(db);
 await t.test('corrected designated address is absent in this fresh disposable schema only',async()=>{
  const r=await db.query('SELECT id FROM users WHERE lower(email)=$1',['mysolarsolutions2026@gmail.com']);
  assert.equal(r.rowCount,0);
  console.log('Designated address lookup: absent in newly created disposable schema; no persistent or production account lookup performed.');
 });
 // A configured inert loopback transport permits normal queueing. No mail worker
 // runs and no sendMail is called. Only fictional addresses are provisioned.
 Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:'9',SMTP_USER:'fixture',SMTP_PASSWORD:randomBytes(24).toString('hex'),MAIL_FROM:'fixture@example.invalid'});
 await env.start();
 const {unseal}=await import('../server/auth/sealed.js'),{verifyPassword,hashPassword}=await import('../server/auth/security.js');
 const client=env.client(),guest=env.client(),email='provision-operator@example.invalid',reason='[TEST] Named local operator authorised fictional one-time provisioning';
 let password=randomBytes(24).toString('base64url'),userId,stored;
 const ok=async(p,status)=>{const r=await p;assert.equal(r.status,status,'Unexpected status in fictional provisioning operation');return r.data;};
 // Actual existing CLI, same isolated test database/schema. No .env file load,
 // shell interpolation, password input, migration or production connection.
 async function operator(action,address){
  return new Promise((accept,reject)=>{
   const child=spawn(process.execPath,[resolve('server/admin.js'),action],{env:{...process.env},windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='';const timeout=setTimeout(()=>{child.kill();reject(new Error('Local operator command timed out'));},20000);
   child.on('error',e=>{clearTimeout(timeout);reject(e);});
   for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output=(output+b.toString()).slice(-4096);});
   child.on('close',code=>{clearTimeout(timeout);accept({code,output});});
   child.stdin.end(JSON.stringify({email:address,reason}));
  });
 }
 await t.test('existing email-first signup creates a verified ordinary identity with salted Argon2id, not an admin',async()=>{
  await client.session();const challenge=await ok(client.request('/auth/business-signup/request','POST',{email}),202);
  const mail=(await db.query("SELECT payload FROM mail_jobs WHERE kind='registration_otp' AND reference_hash=$1",[challenge.challenge])).rows[0];
  const otp=unseal(mail.payload).text.match(/\b\d{6}\b/)?.[0];assert.ok(otp);
  await ok(client.request('/auth/business-signup/verify','POST',{challenge:challenge.challenge,otp}),200);
  await ok(client.request('/auth/business-signup/complete','POST',{challenge:challenge.challenge,name:'[TEST] Fictional platform operator',password}),201);
  await client.session();userId=client.user.id;
  const row=(await db.query('SELECT password_hash,email_verified_at,account_type FROM users WHERE id=$1',[userId])).rows[0];stored=row.password_hash;
  assert.ok(stored.startsWith('$argon2id$'),'Existing password hashing must be Argon2id');assert.ok(await verifyPassword(stored,password),'Generated fictional password verifies');
  assert.ok(stored!==await hashPassword(password),'Same fictional password gets a fresh salt');assert.ok(row.email_verified_at);assert.equal(row.account_type,'business');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM platform_admin_grants')).rows[0].n,0);
  await ok(client.request('/auth/logout','POST',{}),200);await client.session();
  await ok(client.request('/auth/login','POST',{email,password,purpose:'platform'}),401);
 });
 await t.test('actual private operator CLI grants only the selected identity, audits it and revokes old sessions',async()=>{
  await ok(client.request('/auth/login','POST',{email,password,accountType:'business'}),200);await client.session();
  assert.equal((await operator('grant',email)).code,0,'Existing private operator grant succeeds');
  const grant=(await db.query('SELECT role_id FROM platform_admin_grants WHERE user_id=$1',[userId])).rows[0];assert.equal(grant.role_id,'platform_admin');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1',[userId])).rows[0].n,0);
  const event=(await db.query("SELECT metadata FROM audit_events WHERE target_id=$1 AND action='platform.admin_grant'",[userId])).rows[0];assert.equal(event.metadata.reason,reason);assert.ok(event.metadata.operatorEvent);
  assert.ok((await db.query('SELECT password_hash FROM users WHERE id=$1',[userId])).rows[0].password_hash===stored,'Grant must not change existing password');
  await client.session();assert.equal(client.user,null);
 });
 await t.test('existing account recovery preserves identity and grant, changes password and consumes the token once',async()=>{
  await guest.session();await ok(guest.request('/auth/recover','POST',{email}),202);
  const job=(await db.query("SELECT payload FROM mail_jobs WHERE kind='recovery' AND user_id=$1 ORDER BY created_at DESC LIMIT 1",[userId])).rows[0];
  const token=unseal(job.payload).text.match(/\?token=([A-Za-z0-9_-]{43})/)?.[1];assert.ok(token);
  password=randomBytes(24).toString('base64url');await ok(guest.request('/auth/reset-password','POST',{token,password}),200);await guest.session();
  await ok(guest.request('/auth/reset-password','POST',{token,password}),400);
  assert.equal((await db.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id,userId);
  assert.equal((await db.query('SELECT role_id FROM platform_admin_grants WHERE user_id=$1',[userId])).rows[0].role_id,'platform_admin');
  const after=(await db.query('SELECT password_hash FROM users WHERE id=$1',[userId])).rows[0].password_hash;
  assert.ok(after!==stored,'Recovery updates the hash');assert.ok(await verifyPassword(after,password),'Recovered fictional credential verifies');
 });
 await t.test('provisioned admin signs in and reads all existing review queues with authoritative permissions',async()=>{
  await ok(client.request('/auth/login','POST',{email,password,purpose:'platform'}),200);const session=await client.session();
  for(const permission of ['platform.companies.read','platform.onboarding.review','platform.marketplace.review','platform.lifecycle.manage','platform.audit.read'])assert.ok(session.data.platformPermissions.includes(permission),permission);
  for(const queue of ['onboarding','approved','returned','marketplace','published'])await ok(client.request('/platform/companies?queue='+queue),200);
  const owner=env.client(),ownerPassword=randomBytes(24).toString('base64url'),ownerEmail='provision-business@example.invalid';
  await seedIdentity(db,{name:'[TEST] Independent business owner',email:ownerEmail,password:ownerPassword,accountType:'business'});await owner.session();
  await ok(owner.request('/auth/login','POST',{email:ownerEmail,password:ownerPassword,accountType:'business'}),200);await owner.session();
  const company=await ok(owner.request('/companies','POST',{operationKey:randomUUID(),name:'[TEST] Provisioning review detail',city:'Kochi',email:ownerEmail,phone:''}),201);
  const detail=await ok(client.request('/platform/companies/'+company.company.id),200);assert.equal(detail.company.id,company.company.id);assert.ok(Array.isArray(detail.history));assert.ok(Array.isArray(detail.activity));
  await ok(guest.request('/auth/login','POST',{email,password:randomBytes(24).toString('base64url'),purpose:'platform'}),401);await guest.session();assert.equal(guest.user,null);
  await ok(client.request('/auth/logout','POST',{}),200);await client.session();await ok(client.request('/platform/companies'),401);
 });
 await t.test('signup cooldown and duplicate identity protection preserve existing accounts; CLI rejects unrelated customer',async()=>{
  await guest.session();await ok(guest.request('/auth/business-signup/request','POST',{email}),429);
  const other=await seedIdentity(db,{name:'[TEST] Unrelated customer',email:'provision-customer@example.invalid',password:randomBytes(24).toString('base64url'),accountType:'customer'});
  // This existing address has no prior request/cooldown bucket. Prove the
  // duplicate-identity guard separately without bypassing any rate limiter.
  await ok(guest.request('/auth/business-signup/request','POST',{email:'provision-customer@example.invalid'}),409);
  assert.equal((await operator('grant','provision-customer@example.invalid')).code,1);assert.equal((await operator('grant','provision-absent@example.invalid')).code,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM platform_admin_grants WHERE user_id=$1',[other])).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM platform_admin_grants')).rows[0].n,1);
  assert.equal((await db.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id,userId);
 });
 await t.test('existing login rate limiter rejects repeated invalid administrator credentials',async()=>{
  const limited=env.client();await limited.session();let blocked=false;
  const invalidPassword=randomBytes(24).toString('base64url');
  for(let attempt=0;attempt<21;attempt++){
   const response=await limited.request('/auth/login','POST',{email:'provision-rate@example.invalid',password:invalidPassword,purpose:'platform'});
   if(response.status===429){assert.equal(response.data.error.code,'RATE_LIMITED');blocked=true;break;}
   assert.equal(response.status,401,'Invalid credential attempts remain generic before limiting');
  }
  assert.ok(blocked,'Existing limiter must stop repeated login attempts');await limited.session();assert.equal(limited.user,null);
 });
 console.log('Provisioning verified with real signup, CLI and recovery operations; fictional credentials remained in memory; no external mail sent.');
});

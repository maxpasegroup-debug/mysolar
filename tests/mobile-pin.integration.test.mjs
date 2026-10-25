import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import nodemailer from 'nodemailer';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {otp} from '../server/auth/totp.js';

test('mobile/PIN identity, email proof, durable lockout and recovery boundaries',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);const messages=[];
 process.env.AUTH_PIN_PEPPER=randomBytes(32).toString('hex');process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_USER='test';process.env.SMTP_PASSWORD='fictional';process.env.MAIL_FROM='test@example.invalid';
 t.mock.method(nodemailer,'createTransport',()=>({async sendMail(message){messages.push(message);return {accepted:[message.to]};}}));await env.start();
 const {mailTick}=await import('../server/mail-queue.js');
 const deliver=async email=>{for(let i=0;i<15;i++){await mailTick();const found=messages.filter(m=>m.to===email).at(-1);if(found)return found.text.match(/code is (\d{6})/)[1];}throw Error('No fictional mail accepted');};
 const guest=env.client();await guest.session();let challenge,userId,mfaCodes;
 const mobile='9876504321',email='mobile-owner@example.invalid',pin='483729';
 await t.test('signup cannot trust roles, account IDs or skip email proof',async()=>{
  const s=await guest.session();assert.equal(s.data.pinAvailable,true);assert.equal(s.data.pinEmailAvailable,true);
  assert.equal((await guest.request('/auth/pin/register/request','POST',{name:'Test',email,mobile,role:'owner'})).status,400);
  const r=await guest.request('/auth/pin/register/request','POST',{name:'[FICTIONAL] Mobile Owner',email,mobile,accountType:'business'});assert.equal(r.status,202,JSON.stringify(r.data));challenge=r.data.challenge;
  assert.equal((await db.query('SELECT 1 FROM users WHERE email=$1',[email])).rowCount,0);
  assert.equal(messages.length,0);assert.equal((await guest.request('/auth/pin/register/confirm','POST',{challenge,otp:'nototp',pin})).status,400);
  const code=await deliver(email);const row=(await db.query('SELECT * FROM pin_challenges WHERE id=$1',[challenge])).rows[0];assert.notEqual(row.code_hash,code);assert.ok(!row.context.includes('Mobile Owner'));
  const intruder=env.client();await intruder.session();assert.equal((await intruder.request('/auth/pin/register/confirm','POST',{challenge,otp:code,pin})).status,400);
  assert.equal((await guest.request('/auth/pin/register/confirm','POST',{challenge,otp:code,pin:'123456'})).status,400);
  assert.equal((await guest.request('/auth/pin/register/confirm','POST',{challenge,otp:code,pin})).status,201);await guest.session();userId=guest.user.id;
  assert.equal(guest.company,null);assert.equal(guest.user.emailVerified,true);
  const c=(await db.query('SELECT * FROM mobile_credentials WHERE user_id=$1',[userId])).rows[0];assert.equal(c.mobile,'+91'+mobile);assert.match(c.pin_hash,/^\$argon2id\$/);assert.ok(!c.pin_hash.includes(pin));
  assert.equal((await db.query('SELECT 1 FROM company_memberships WHERE user_id=$1',[userId])).rowCount,0);
 });
 await t.test('legacy email login and profile phones are preserved without auto-enrollment',async()=>{
  const legacy=env.client();await legacy.register('pin-legacy');await db.query("UPDATE customer_profiles SET phone=$1 WHERE user_id=$2",[mobile,legacy.user.id]);
  assert.equal((await db.query('SELECT 1 FROM mobile_credentials WHERE user_id=$1',[legacy.user.id])).rowCount,0);
  const again=env.client();await again.session();assert.equal((await again.request('/auth/login','POST',{email:'pin-legacy@example.invalid',password:'Integration-only password 123!'})).status,200);
  assert.equal((await legacy.request('/auth/pin/enrol/request','POST',{mobile:'9876504322',credential:'Integration-only password 123!'})).status,403);
  await db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[legacy.user.id]);
  assert.equal((await legacy.request('/auth/pin/enrol/request','POST',{mobile,credential:'Integration-only password 123!'})).status,409);
  const r=await legacy.request('/auth/pin/enrol/request','POST',{mobile:'9876504322',credential:'Integration-only password 123!'});assert.equal(r.status,202,JSON.stringify(r.data));
  const code=await deliver('pin-legacy@example.invalid');assert.equal((await legacy.request('/auth/pin/enrol/confirm','POST',{challenge:r.data.challenge,otp:code,pin:'064829'})).status,200);await legacy.session();assert.equal(legacy.user,null);await again.session();assert.equal(again.user,null);
  assert.equal((await legacy.request('/auth/pin/login','POST',{mobile:'+91 98765 04322',pin:'064829'})).status,200);
 });
 await t.test('wrong PIN attempts persist and a correct PIN cannot bypass the account lock',async()=>{
  await guest.request('/auth/logout','POST',{});await guest.session();
  for(let i=0;i<5;i++)assert.equal((await guest.request('/auth/pin/login','POST',{mobile,pin:'398472'})).status,401);
  const c=(await db.query('SELECT failed_attempts,locked_until FROM mobile_credentials WHERE user_id=$1',[userId])).rows[0];assert.equal(c.failed_attempts,5);assert.ok(Date.parse(c.locked_until)>Date.now());
  assert.equal((await guest.request('/auth/pin/login','POST',{mobile,pin})).status,401);
  const fresh=env.client();await fresh.session();assert.equal((await fresh.request('/auth/pin/login','POST',{mobile,pin})).status,401);
  await db.query("UPDATE mobile_credentials SET locked_until=now()-interval '1 second' WHERE user_id=$1",[userId]);
  assert.equal((await guest.request('/auth/pin/login','POST',{mobile,pin})).status,200);await guest.session();assert.equal(guest.user.id,userId);
  assert.equal((await db.query('SELECT failed_attempts FROM mobile_credentials WHERE user_id=$1',[userId])).rows[0].failed_attempts,0);
 });
 await t.test('MFA enrollment accepts PIN reauthentication and reset retains the authenticator',async()=>{
  await guest.createCompany('pin-company');const companyId=guest.company.id;
  const setup=await guest.request('/auth/mfa/setup','POST',{password:pin});assert.equal(setup.status,200,JSON.stringify(setup.data));
  const result=await guest.request('/auth/mfa/confirm','POST',{code:otp(setup.data.secret,Math.floor(Date.now()/30000))});assert.equal(result.status,200);mfaCodes=result.data.recoveryCodes;
  const reset=env.client();await reset.session();
  const r=await reset.request('/auth/pin/reset/request','POST',{mobile});assert.equal(r.status,202);const before=messages.length;
  await mailTick();assert.equal(messages.length,before+1);const code=messages.at(-1).text.match(/code is (\d{6})/)[1];
  const wrong=code==='000000'?'000001':'000000';assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:wrong,pin:'592840'})).status,400);
  assert.equal((await db.query('SELECT attempts FROM pin_challenges WHERE id=$1',[r.data.challenge])).rows[0].attempts,1);
  assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:code,pin:'592840'})).status,200);await reset.session();await guest.session();assert.equal(guest.user,null);assert.equal(reset.user,null);
  assert.equal((await db.query('SELECT 1 FROM account_security WHERE user_id=$1 AND secret IS NOT NULL',[userId])).rowCount,1);
  assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:code,pin})).status,400);
  // Clear only the fictional fixture's preceding login rate buckets to exercise MFA independently.
  await db.query('DELETE FROM rate_limit_buckets');
  const need=await reset.request('/auth/pin/login','POST',{mobile,pin:'592840'});assert.equal(need.status,403);assert.equal(need.data.error.code,'MFA_REQUIRED');
  assert.equal((await reset.request('/auth/pin/login','POST',{mobile,pin:'592840',code:mfaCodes[0]})).status,200);
  const session=await reset.session();assert.equal(session.data.activeCompany.id,companyId);assert.equal(session.data.activeCompany.role,'owner');assert.deepEqual(session.data.platformPermissions,[]);
 });
 await t.test('expiry, resend cancellation, one-use codes and bounded attempts fail closed',async()=>{
  const reset=env.client();await reset.session();await db.query('DELETE FROM rate_limit_buckets');
  let r=await reset.request('/auth/pin/reset/request','POST',{mobile});assert.equal(r.status,202);
  const old=r.data.challenge;await db.query('DELETE FROM rate_limit_buckets');r=await reset.request('/auth/pin/reset/request','POST',{mobile});assert.equal(r.status,202);
  assert.ok((await db.query('SELECT used_at FROM pin_challenges WHERE id=$1',[old])).rows[0].used_at);
  await mailTick();const j=(await db.query('SELECT status,payload FROM mail_jobs WHERE reference_hash=$1',[old])).rows[0];assert.equal(j.status,'cancelled');assert.equal(j.payload,null);
  for(let i=0;i<5;i++)assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:'nototp',pin})).status,400);
  // Syntactically malformed codes never reach comparison. Valid wrong codes are durably counted.
  const {unseal}=await import('../server/auth/sealed.js');const job=(await db.query('SELECT payload FROM mail_jobs WHERE reference_hash=$1',[r.data.challenge])).rows[0];const code=unseal(job.payload).text.match(/code is (\d{6})/)[1],wrong=code==='999999'?'999998':'999999';
  for(let i=0;i<5;i++)assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:wrong,pin})).status,400);
  assert.equal((await db.query('SELECT attempts FROM pin_challenges WHERE id=$1',[r.data.challenge])).rows[0].attempts,5);
  assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:code,pin})).status,400);
  await db.query('DELETE FROM rate_limit_buckets');r=await reset.request('/auth/pin/reset/request','POST',{mobile});assert.equal(r.status,202);
  await db.query("UPDATE pin_challenges SET expires_at=now()-interval '1 second',created_at=now()-interval '11 minutes' WHERE id=$1",[r.data.challenge]);
  assert.equal((await reset.request('/auth/pin/reset/confirm','POST',{challenge:r.data.challenge,otp:code,pin})).status,400);
 });
 await t.test('anti-enumeration, CSRF, origin and unique mobile constraints',async()=>{
  const c=env.client();await c.session();await db.query('DELETE FROM rate_limit_buckets');
  const unknown=await c.request('/auth/pin/reset/request','POST',{mobile:'9876504999'}),known=await c.request('/auth/pin/reset/request','POST',{mobile});assert.equal(unknown.status,known.status);assert.equal(unknown.data.message,known.data.message);assert.deepEqual(Object.keys(unknown.data).sort(),['challenge','message']);
  assert.equal((await c.request('/auth/pin/login','POST',{mobile,pin:'592840'},{'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await c.request('/auth/pin/login','POST',{mobile,pin:'592840'},{Origin:'https://untrusted.invalid'})).status,403);
  const metadata=(await db.query("SELECT metadata::text FROM audit_events WHERE action LIKE 'auth.pin%'")).rows.map(r=>r.metadata).join('');assert.ok(!metadata.includes('592840'));assert.ok(!metadata.includes(email));
  await assert.rejects(db.query('INSERT INTO mobile_credentials(user_id,mobile,pin_hash) SELECT id,$1,$2 FROM users WHERE email=$3',['+91'+mobile,'irrelevant','pin-legacy@example.invalid']),e=>e.code==='23505');
 });
 await t.test('concurrent normalized mobile claims create exactly one complete identity',async()=>{
  await db.query('DELETE FROM rate_limit_buckets');const a=env.client(),b=env.client();await a.session();await b.session();
  const first=await a.request('/auth/pin/register/request','POST',{name:'[FICTIONAL] Claim A',email:'claim-a@example.invalid',mobile:'9876504888'}),second=await b.request('/auth/pin/register/request','POST',{name:'[FICTIONAL] Claim B',email:'claim-b@example.invalid',mobile:'+91 98765 04888'});assert.equal(first.status,202);assert.equal(second.status,202);
  const ac=await deliver('claim-a@example.invalid'),bc=await deliver('claim-b@example.invalid');
  const results=await Promise.all([a.request('/auth/pin/register/confirm','POST',{challenge:first.data.challenge,otp:ac,pin}),b.request('/auth/pin/register/confirm','POST',{challenge:second.data.challenge,otp:bc,pin})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal((await db.query("SELECT 1 FROM users WHERE email IN ('claim-a@example.invalid','claim-b@example.invalid')")).rowCount,1);assert.equal((await db.query("SELECT 1 FROM mobile_credentials WHERE mobile='+919876504888'")).rowCount,1);
 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import nodemailer from 'nodemailer';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('isolated PostgreSQL: password recovery, token expiry/replay and session revocation',{skip:!process.env.TEST_DATABASE_URL,timeout:90000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);
 // In-memory mail adapter only. No SMTP connection, real sender or external
 // credential is used. The normal application recovery service still executes.
 const outbox=[];let failDelivery=false;
 t.mock.method(nodemailer,'createTransport',()=>({async sendMail(message){outbox.push(message);if(failDelivery)throw Error('isolated transport failure');return {accepted:[message.to]};}}));
 process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_USER='isolated-fixture';process.env.SMTP_PASSWORD='isolated-fixture-not-a-real-credential';process.env.MAIL_FROM='test@example.invalid';
 await env.start();const owner=env.client(),other=env.client(),anonymous=env.client();await owner.register('recover-owner');await other.register('recover-other');const company=await owner.createCompany('recover-company');await anonymous.session();
 const password='Integration-only password 123!',changed='Changed integration password 456!';
 const waitFor=async predicate=>{for(let i=0;i<150;i++){if(await predicate())return;await delay(20);}assert.fail('Recovery worker did not finish within its isolated test deadline.');};
 const resetToken=message=>new URLSearchParams(new URL(message.text.match(/http:\/\/localhost:3000\/#[^\s]+/)[0]).hash.split('?')[1]).get('token');
 const recover=email=>anonymous.request('/auth/recover','POST',{email});
 let first,second,secondSession;
 await t.test('recovery responds identically for existing and unknown emails and exposes no token',async()=>{
  const known=await recover(owner.user.email),missing=await recover('unknown@example.invalid');assert.equal(known.status,202);assert.equal(missing.status,202);assert.deepEqual(known.data,missing.data);assert.doesNotMatch(JSON.stringify(known.data),/token|password_hash/i);
  await waitFor(()=>outbox.some(x=>x.to===owner.user.email));first=resetToken(outbox.find(x=>x.to===owner.user.email));assert.equal(first.length,43);assert.equal(outbox.filter(x=>x.to==='unknown@example.invalid').length,0);
  const stored=(await db.query('SELECT token_hash FROM password_reset_tokens WHERE user_id=$1',[owner.user.id])).rows[0];assert.notEqual(stored.token_hash,first);
 });
 await t.test('expired links fail and a replacement invalidates the older recovery token',async()=>{
  await db.query("UPDATE password_reset_tokens SET expires_at=now()-interval '1 second' WHERE user_id=$1",[owner.user.id]);assert.equal((await anonymous.request('/auth/reset-password','POST',{token:first,password:changed})).data.error.code,'INVALID_RESET');
  const count=outbox.length;assert.equal((await recover(owner.user.email)).status,202);await waitFor(()=>outbox.length>count);second=resetToken(outbox.at(-1));assert.notEqual(first,second);
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:first,password:changed})).status,400);
 });
 await t.test('CSRF/origin/extra identity payloads cannot bypass recovery-token authorization',async()=>{
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:second,password:changed},{'X-CSRF-Token':''})).status,403);
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:second,password:changed},{Origin:'https://evil.example.org'})).status,403);
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:second,password:changed,userId:other.user.id})).status,400);
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:'x'.repeat(43),password:changed})).status,400);
 });
 await t.test('valid reset revokes all sessions, preserves memberships, never logs in and cannot replay',async()=>{
  secondSession=env.client();await secondSession.session();assert.equal((await secondSession.request('/auth/login','POST',{email:owner.user.email,password})).status,200);await secondSession.session();
  const ownerId=owner.user.id,oldCookie=owner.cookie,r=await anonymous.request('/auth/reset-password','POST',{token:second,password:changed});assert.equal(r.status,200,JSON.stringify(r.data));assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Lax/);assert.match(r.headers.get('set-cookie'),/Path=\//);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1',[ownerId])).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM password_reset_tokens WHERE user_id=$1',[ownerId])).rows[0].n,0);
  await anonymous.session();assert.equal(anonymous.user,null);assert.equal((await anonymous.request('/auth/reset-password','POST',{token:second,password:changed})).status,400);
  owner.cookie=oldCookie;await owner.session();assert.equal(owner.user,null);await secondSession.session();assert.equal(secondSession.user,null);
  assert.equal((await owner.request('/auth/login','POST',{email:'recover-owner@example.invalid',password})).status,401);assert.equal((await owner.request('/auth/login','POST',{email:'recover-owner@example.invalid',password:changed})).status,200);await owner.session();assert.equal(owner.company.id,company);assert.equal(owner.company.role,'owner');
  const events=(await db.query("SELECT metadata FROM audit_events WHERE action LIKE 'auth.%'")).rows;for(const raw of [first,second])assert.ok(!JSON.stringify(events).includes(raw));
 });
 await t.test('mail delivery failure invalidates token without exposing transport errors or credentials',async()=>{
  failDelivery=true;const failures=(await db.query("SELECT count(*)::int AS n FROM audit_events WHERE action='auth.recovery_delivery_failed'")).rows[0].n;const r=await recover(other.user.email);assert.equal(r.status,202);assert.doesNotMatch(JSON.stringify(r.data),/isolated-fixture|transport failure/);
  await waitFor(async()=>(await db.query("SELECT count(*)::int AS n FROM audit_events WHERE action='auth.recovery_delivery_failed'")).rows[0].n>failures);assert.equal((await db.query('SELECT count(*)::int AS n FROM password_reset_tokens WHERE user_id=$1',[other.user.id])).rows[0].n,0);failDelivery=false;
 });
 await t.test('disabled accounts cannot consume a previously issued valid reset link',async()=>{
  const count=outbox.length;await recover(other.user.email);await waitFor(()=>outbox.length>count);const raw=resetToken(outbox.at(-1));await db.query("UPDATE users SET status='disabled' WHERE id=$1",[other.user.id]);
  assert.equal((await anonymous.request('/auth/reset-password','POST',{token:raw,password:changed})).data.error.code,'INVALID_RESET');
  await db.query("UPDATE users SET status='active' WHERE id=$1",[other.user.id]);
 });
});

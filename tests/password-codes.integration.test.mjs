import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('email password recovery codes enforce purpose, session, expiry, attempts and single use',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);const outbox=[];
 t.mock.method(nodemailer,'createTransport',()=>({async sendMail(m){outbox.push(m);return {accepted:[m.to]};}}));Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_USER:'fictional',SMTP_PASSWORD:'fictional',MAIL_FROM:'fixture@example.invalid'});await env.start();
 const {mailTick}=await import('../server/mail-queue.js'),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const buyer=env.client(),owner=env.client();await buyer.register('password-buyer','customer');await owner.register('password-owner','business');const buyerAddress=buyer.user.email;await owner.session();
 const c=env.client(),b=env.client(),unknown=env.client();await c.session();await b.session();await unknown.session();let cc,bc,co,bo;
 const request=(client,email,accountType)=>client.request('/auth/password-reset/request','POST',{email,accountType});
 async function code(id){const job=(await db.query('SELECT id FROM mail_jobs WHERE reference_hash=$1',[id])).rows[0];assert.ok(job);for(let n=0;n<20;n++){await mailTick();const mail=outbox.find(m=>m.messageId==='<'+job.id+'@mysolar.solutions>');if(mail)return mail.text.match(/\b[0-9]{8}\b/)[0];}throw Error('Fictional mail job not accepted');}
 const confirm=(client,challenge,otp,password='New password for test 456!')=>client.request('/auth/password-reset/confirm','POST',{challenge,otp,password});
 await t.test('distinct emails enforce separate purposes and unknown accounts have indistinguishable replies',async()=>{
  cc=ok(await request(c,buyer.user.email,'customer'),202);bc=ok(await request(b,owner.user.email,'business'),202);const missing=ok(await request(unknown,'missing-password@example.invalid','customer'),202);assert.equal(cc.message,missing.message);assert.deepEqual(Object.keys(cc),Object.keys(missing));assert.notEqual(cc.challenge,bc.challenge);co=await code(cc.challenge);bo=await code(bc.challenge);assert.equal(outbox.length,2);assert.ok(outbox.every(m=>m.text.includes('15 minutes')&&m.text.includes('never ask')));const rows=(await db.query('SELECT code_hash FROM password_reset_challenges')).rows;assert.ok(rows.every(row=>row.code_hash!==co&&row.code_hash!==bo));
 });
 await t.test('code verification rejects other browser sessions, malformed inputs, CSRF and cross-origin requests',async()=>{
  assert.equal((await confirm(unknown,cc.challenge,co)).status,400);assert.equal((await db.query('SELECT attempts FROM password_reset_challenges WHERE id=$1',[cc.challenge])).rows[0].attempts,0);
  assert.equal((await confirm(c,cc.challenge,'x'.repeat(8))).status,400);assert.equal((await c.request('/auth/password-reset/confirm','POST',{challenge:cc.challenge,otp:co,password:'New password for test 456!'},{'X-CSRF-Token':''})).status,403);assert.equal((await c.request('/auth/password-reset/confirm','POST',{challenge:cc.challenge,otp:co,password:'New password for test 456!'},{Origin:'https://evil.example.invalid'})).status,403);
  const wrong=co==='00000000'?'11111111':'00000000';assert.equal((await confirm(c,cc.challenge,wrong)).status,400);assert.equal((await db.query('SELECT attempts FROM password_reset_challenges WHERE id=$1',[cc.challenge])).rows[0].attempts,1);
 });
 await t.test('reset revokes only that identity, preserves other identity and cannot replay',async()=>{
  ok(await confirm(c,cc.challenge,co));assert.equal((await buyer.session()).data.user,null);assert.ok((await owner.session()).data.user);await c.session();assert.equal(c.user,null);assert.equal((await confirm(c,cc.challenge,co)).status,400);assert.equal((await db.query('SELECT used_at FROM password_reset_challenges WHERE id=$1',[bc.challenge])).rows[0].used_at,null);
  const signIn=env.client();await signIn.session();ok(await signIn.request('/auth/login','POST',{email:buyerAddress,password:'New password for test 456!',accountType:'customer'}));assert.equal((await signIn.session()).data.user.accountType,'customer');
  const results=await Promise.all([confirm(b,bc.challenge,bo),confirm(b,bc.challenge,bo)]);assert.equal(results.filter(r=>r.status===200).length,1);assert.ok(results.some(r=>[400,403].includes(r.status)));assert.equal((await owner.session()).data.user,null);
 });
 await t.test('expired, exhausted and stale credential codes cannot change a password',async()=>{
  for(const mode of ['expired','exhausted','stale']){const user=env.client(),browser=env.client();await user.register('password-'+mode);await browser.session();const r=ok(await request(browser,user.user.email,'business'),202),otp=await code(r.challenge);if(mode==='expired')await db.query("UPDATE password_reset_challenges SET expires_at=now()-interval '1 second',created_at=now()-interval '20 minutes' WHERE id=$1",[r.challenge]);if(mode==='stale')await db.query("UPDATE users SET password_hash='REPLACED-FIXTURE-HASH' WHERE id=$1",[user.user.id]);if(mode==='exhausted'){for(let n=0;n<5;n++)assert.equal((await confirm(browser,r.challenge,otp==='00000000'?'11111111':'00000000')).status,400);assert.equal((await db.query('SELECT attempts FROM password_reset_challenges WHERE id=$1',[r.challenge])).rows[0].attempts,5);}assert.equal((await confirm(browser,r.challenge,otp)).status,400);}
 });
 await t.test('rate limits and strict purpose validation do not leak OTPs into logs',async()=>{
  assert.equal((await request(unknown,'missing-password@example.invalid','customer')).status,429);assert.equal((await request(unknown,'other-password@example.invalid','owner')).status,400);const logs=JSON.stringify((await db.query("SELECT metadata FROM audit_events WHERE action LIKE 'auth.password_code%'")).rows);assert.ok(!logs.includes(co)&&!logs.includes(bo));
 });
});

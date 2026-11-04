import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('email-first business onboarding proves delivery boundaries, session ownership and one-time creation',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);const messages=[];let failMail=false;
 t.mock.method(nodemailer,'createTransport',()=>({async sendMail(message){if(failMail)throw Object.assign(Error('PRIVATE_PROVIDER_DETAIL'),{code:'EAUTH'});messages.push(message);return {accepted:[message.to]};}}));
 Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_USER:'fixture',SMTP_PASSWORD:'fixture',MAIL_FROM:'fixture@example.invalid'});await env.start();
 const {mailTick}=await import('../server/mail-queue.js'),{unseal}=await import('../server/auth/sealed.js');
 const owner=env.client(),stranger=env.client();await owner.session();await stranger.session();const request=(c,email,previousChallenge)=>c.request('/auth/business-signup/request','POST',{email,...(previousChallenge?{previousChallenge}:{})});
 const checked=(r,status)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const first=checked(await request(owner,'first-business@example.invalid'),202);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,0);
 assert.equal((await stranger.request('/auth/business-signup/status?challenge='+first.challenge)).status,400);
 const edited=checked(await request(owner,'edited-business@example.invalid',first.challenge),202);
 assert.equal((await owner.request('/auth/business-signup/status?challenge='+first.challenge)).status,400);
 const job=(await db.query('SELECT * FROM mail_jobs WHERE reference_hash=$1',[edited.challenge])).rows[0];
 const code=unseal(job.payload).text.match(/\b[0-9]{6}\b/)[0];assert.ok(!JSON.stringify(edited).includes(code));
 const verify=(c,otp=code)=>c.request('/auth/business-signup/verify','POST',{challenge:edited.challenge,otp});
 assert.equal((await verify(stranger)).status,400);assert.equal((await verify(owner,code==='00000000'?'11111111':'00000000')).status,400);
 assert.equal((await verify(owner)).status,200);
 // A delayed worker must not send a proof already verified in the same session.
 for(let i=0;i<4;i++)await mailTick();assert.ok(!messages.some(m=>m.messageId==='<'+job.id+'@mysolar.solutions>'));
 assert.equal((await db.query('SELECT status FROM mail_jobs WHERE id=$1',[job.id])).rows[0].status,'cancelled');
 assert.equal((await owner.request('/auth/register/confirm','POST',{challenge:edited.challenge,otp:code})).status,400);
 const body={challenge:edited.challenge,name:'[TEST] Business owner',password:'Email-first integration password 123!'};
 const outcomes=await Promise.all([owner.request('/auth/business-signup/complete','POST',body),owner.request('/auth/business-signup/complete','POST',body)]);
 assert.equal(outcomes.filter(r=>r.status===201).length,1);assert.ok(outcomes.some(r=>[400,403,409].includes(r.status)));
 await owner.session();assert.equal(owner.user.email,'edited-business@example.invalid');assert.equal(owner.user.accountType,'business');assert.equal(owner.user.emailVerified,true);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,1);assert.equal((await db.query('SELECT count(*)::int AS n FROM companies')).rows[0].n,0);
 assert.deepEqual((await owner.session()).data.platformPermissions,[]);
 // Real queue/worker state with a mocked external transport failure, never inbox proof.
 await db.query('DELETE FROM rate_limit_buckets');const failed=checked(await request(stranger,'failure-business@example.invalid'),202);failMail=true;await mailTick();
 const status=checked(await stranger.request('/auth/business-signup/status?challenge='+failed.challenge),200);assert.equal(status.state,'retry');assert.match(status.message,/retrying/);assert.ok(!JSON.stringify(status).includes('PRIVATE_PROVIDER_DETAIL'));
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,1);
});

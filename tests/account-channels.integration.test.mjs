import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import nodemailer from 'nodemailer';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('customer and business mobile identities use distinct recovery mail without sharing access or reset state',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);const messages=[];process.env.AUTH_PIN_PEPPER=randomBytes(32).toString('hex');process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_USER='test';process.env.SMTP_PASSWORD='fictional';process.env.MAIL_FROM='test@example.invalid';
 t.mock.method(nodemailer,'createTransport',()=>({async sendMail(message){messages.push(message);return {accepted:[message.to]};}}));await env.start();const {mailTick}=await import('../server/mail-queue.js'),ok=(r,s=200)=>{assert.equal(r.status,s,JSON.stringify(r.data));return r.data;};
 const businessAddress='business-recovery@example.invalid',address='customer-recovery@example.invalid',customer=env.client(),business=env.client();await customer.session();await business.session();
 const c=ok(await customer.request('/auth/pin/register/request','POST',{name:'[TEST] Buyer',email:address,mobile:'9876401001',accountType:'customer'}),202),b=ok(await business.request('/auth/pin/register/request','POST',{name:'[TEST] Owner',email:businessAddress,mobile:'9876401002',accountType:'business'}),202);
 async function code(challenge){const job=(await db.query("SELECT id FROM mail_jobs WHERE kind='pin_otp' AND reference_hash=$1",[challenge])).rows[0];assert.ok(job);for(let n=0;n<20;n++){await mailTick();const message=messages.find(m=>m.messageId==='<'+job.id+'@mysolar.solutions>');if(message)return message.text.match(/code is (\d{6})/)[1];}throw Error('Fictional OTP delivery not recorded');}
 let customerId,businessId;
 await t.test('both email proofs coexist and create different purpose-bound accounts',async()=>{
  const cc=await code(c.challenge),bc=await code(b.challenge);ok(await customer.request('/auth/pin/register/confirm','POST',{challenge:c.challenge,otp:cc,pin:'483729'}),201);ok(await business.request('/auth/pin/register/confirm','POST',{challenge:b.challenge,otp:bc,pin:'594836'}),201);await customer.session();await business.session();customerId=customer.user.id;businessId=business.user.id;assert.notEqual(customerId,businessId);assert.equal(customer.user.accountType,'customer');assert.equal(business.user.accountType,'business');assert.notEqual(customer.user.email,business.user.email);assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE email=ANY($1::text[])',[[address,businessAddress]])).rows[0].n,2);assert.deepEqual((await business.session()).data.customerPermissions,[]);
 });
 await t.test('customer cannot create or join a company, and business cannot open customer data',async()=>{
  const company={name:'[TEST] Separate business',city:'[TEST] City',email:'company@example.invalid',phone:''};assert.equal((await customer.request('/companies','POST',company)).status,403);ok(await business.request('/companies','POST',company),201);await business.session();assert.equal((await business.request('/customer/experience/overview')).status,404);assert.equal((await customer.request('/companies/select','POST',{companyId:business.company.id})).status,403);
  await assert.rejects(db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES(gen_random_uuid(),$1,$2,'sales')",[business.company.id,customerId]),{code:'23514'});await assert.rejects(db.query("UPDATE users SET account_type='business' WHERE id=$1",[customerId]),{code:'23514'});
 });
 await t.test('reset codes and session revocation are isolated with independent mailboxes',async()=>{
  const one=env.client(),two=env.client();await one.session();await two.session();const r1=ok(await one.request('/auth/pin/reset/request','POST',{mobile:'9876401001'}),202),r2=ok(await two.request('/auth/pin/reset/request','POST',{mobile:'9876401002'}),202),otp1=await code(r1.challenge),otp2=await code(r2.challenge);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM pin_challenges WHERE id=ANY($1::uuid[]) AND used_at IS NULL',[[r1.challenge,r2.challenge]])).rows[0].n,2);
  assert.equal((await one.request('/auth/pin/reset/confirm','POST',{challenge:r2.challenge,otp:otp2,pin:'627384'})).status,400);ok(await one.request('/auth/pin/reset/confirm','POST',{challenge:r1.challenge,otp:otp1,pin:'627384'}));assert.equal((await customer.session()).data.user,null);assert.equal((await business.session()).data.user.id,businessId);assert.equal((await db.query('SELECT used_at FROM pin_challenges WHERE id=$1',[r2.challenge])).rows[0].used_at,null);
  ok(await two.request('/auth/pin/reset/confirm','POST',{challenge:r2.challenge,otp:otp2,pin:'738495'}));const signIn=env.client();await signIn.session();ok(await signIn.request('/auth/pin/login','POST',{mobile:'9876401002',pin:'738495'}));assert.equal((await signIn.session()).data.user.accountType,'business');
 });
 await t.test('email/password fallback rejects wrong credentials and malformed account purposes',async()=>{
  const guest=env.client();await guest.session();assert.equal((await guest.request('/auth/login','POST',{email:address,password:'Incorrect password 123!'})).status,401);assert.equal((await guest.request('/auth/pin/register/request','POST',{name:'[TEST]',email:address,mobile:'9876401003',accountType:'owner'})).status,400);
 });
});

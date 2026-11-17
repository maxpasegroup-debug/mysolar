import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('customer mobile login survives logout and expiry without changing identity or other account entrances',{skip:!process.env.TEST_DATABASE_URL,timeout:240000},async t=>{
 const script=process.env.MYSOLAR_CUSTOMER_LOGIN_BROWSER_SCRIPT;
 const env=await isolatedApp(t,{port:script?3000:0}),{db}=env;await env.applyMigrations(db);
 Object.assign(process.env,{AUTH_PIN_PEPPER:randomBytes(32).toString('hex'),SMTP_HOST:'127.0.0.1',SMTP_PORT:'9',SMTP_USER:'fixture',SMTP_PASSWORD:randomBytes(24).toString('hex'),MAIL_FROM:'fixture@example.invalid'});await env.start();
 const {unseal}=await import('../server/auth/sealed.js');
 const code=async challenge=>{const row=(await db.query("SELECT payload FROM mail_jobs WHERE kind='pin_otp' AND reference_hash=$1 ORDER BY created_at DESC LIMIT 1",[challenge])).rows[0];assert.ok(row);return unseal(row.payload).text.match(/code is (\d{6})/)[1];};
 const c=env.client(),email='repeat-customer@example.invalid',mobile='9876301021',pin='483729';await c.session();
 const request=await c.request('/auth/pin/register/request','POST',{name:'[TEST] Repeat customer',email,mobile,countryCode:'+91',accountType:'customer'});assert.equal(request.status,202);
 const confirmed=await c.request('/auth/pin/register/confirm','POST',{challenge:request.data.challenge,otp:await code(request.data.challenge),pin});assert.equal(confirmed.status,201);await c.session();const userId=c.user.id;assert.equal(c.user.accountType,'customer');assert.equal(c.company,null);
 assert.equal((await c.request('/auth/logout','POST',{})).status,200);await c.session();
 const wrong=await c.request('/auth/pin/login','POST',{mobile,countryCode:'+91',pin:'398472'}),unknown=await c.request('/auth/pin/login','POST',{mobile:'9876301099',countryCode:'+91',pin:'398472'});assert.equal(wrong.status,401);assert.equal(unknown.status,401);assert.equal(wrong.data.error.code,unknown.data.error.code);assert.equal(wrong.data.error.message,unknown.data.error.message);
 assert.equal((await c.request('/auth/pin/login','POST',{mobile,countryCode:'+91',pin})).status,200);await c.session();assert.equal(c.user.id,userId);
 await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1",[userId]);await c.session();assert.equal(c.user,null);
 assert.equal((await c.request('/auth/pin/login','POST',{mobile,countryCode:'+91',pin})).status,200);await c.session();assert.equal(c.user.id,userId);
 await c.request('/auth/logout','POST',{});await c.session();
 const password=randomBytes(24).toString('base64url');
 await seedIdentity(db,{name:'[TEST] Business login',email:'repeat-business@example.invalid',password,accountType:'business'});
 const adminId=await seedIdentity(db,{name:'[TEST] Platform login',email:'repeat-admin@example.invalid',password,accountType:'business'});
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] Explicit disposable administrator grant')",[adminId]);
 for(const [address,extra] of [['repeat-business@example.invalid',{accountType:'business'}],['repeat-admin@example.invalid',{purpose:'platform'}]]){assert.equal((await c.request('/auth/login','POST',{email:address,password,...extra})).status,200);await c.session();await c.request('/auth/logout','POST',{});await c.session();}
 if(script)await (await import(script)).run({env,db,email,mobile,pin,password,userId,code});
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE id=$1',[userId])).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM company_memberships WHERE user_id=$1',[userId])).rows[0].n,0);
});

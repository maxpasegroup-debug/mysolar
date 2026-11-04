import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {otp} from '../server/auth/totp.js';

test('verified-email and fresh MFA guards protect owner writes without blocking account recovery setup',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);
 process.env.AUTH_REQUIRE_VERIFIED_EMAIL='true';process.env.AUTH_REQUIRE_PRIVILEGED_MFA='true';await env.start();
 const owner=env.client();await owner.register('protected-owner');await owner.createCompany('protected-company');
 // Draft company creation is separate from protected owner business actions.
 const protectedWrite=()=>owner.request('/companies/current/os/trial','POST',{planVersionId:randomUUID(),confirm:true});
 assert.equal((await protectedWrite()).data.error.code,'EMAIL_VERIFICATION_REQUIRED');
 await db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[owner.user.id]);
 assert.equal((await protectedWrite()).data.error.code,'MFA_REQUIRED');
 const setup=await owner.request('/auth/mfa/setup','POST',{password:'Integration-only password 123!'});assert.equal(setup.status,200);
 const confirmed=await owner.request('/auth/mfa/confirm','POST',{code:otp(setup.data.secret,Math.floor(Date.now()/30000))});assert.equal(confirmed.status,200);
 assert.equal((await protectedWrite()).data.error.code,'TRIAL_NOT_CONFIGURED');
 await db.query("UPDATE sessions SET mfa_verified_at=now()-interval '16 minutes' WHERE user_id=$1",[owner.user.id]);
 assert.equal((await owner.request('/companies/current/os/trial','POST',{planVersionId:randomUUID(),confirm:true})).data.error.code,'MFA_REQUIRED');
 assert.equal((await owner.request('/auth/security')).status,200);
 const recovery=confirmed.data.recoveryCodes[0];assert.equal((await owner.request('/auth/mfa/step-up','POST',{code:recovery})).status,200);
 assert.equal((await owner.request('/auth/mfa/step-up','POST',{code:recovery})).status,403);
});

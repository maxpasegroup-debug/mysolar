import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
// Prepared, not executed by the local-only alignment task. The helper requires
// an explicitly approved disposable loopback PostgreSQL database and mutates it.
test('new company listing remains separate from OS access and disabled billing grants nothing',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t);await env.applyMigrations(env.db);await env.start();
 const owner=env.client(),other=env.client();await owner.register('trial-owner');await other.register('trial-other');const company=await owner.createCompany('trial-owner-company');await other.createCompany('trial-other-company');
 assert.equal((await env.db.query('SELECT 1 FROM company_os_enrolment WHERE company_id=$1',[company])).rowCount,1);
 const listing=await owner.request('/companies/current/os/leads');assert.equal(listing.status,200,JSON.stringify(listing.data));assert.equal(listing.data.published,false);assert.equal(listing.data.access.unlocked,false);
 assert.equal((await owner.request('/companies/current/operations/dashboard')).status,403);
 const plans=await owner.request('/companies/current/os/plans');assert.equal(plans.status,200);assert.equal(plans.data.billingAvailable,false);assert.equal(plans.data.mode,'disabled');
 const request={operationKey:randomUUID(),planVersionId:randomUUID(),consent:true};
 assert.equal((await owner.request('/companies/current/os/checkout','POST',request,{'X-CSRF-Token':'invalid'})).status,403);
 assert.equal((await owner.request('/companies/current/os/checkout','POST',request)).status,503);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM os_billing_contracts WHERE company_id=$1',[company])).rows[0].n,0);
 assert.equal((await other.request('/companies/current/os/leads','GET',undefined,{'X-Company-ID':company})).status,409);
 // FUTURE AUTHORISED REHEARSAL ONLY: draft price must not prevent a reviewed free trial.
 const planId=randomUUID(),versionId=randomUUID();
 await env.db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[owner.user.id]);
 const settings=(await env.db.query('SELECT data FROM commercial_settings_versions ORDER BY id DESC LIMIT 1')).rows[0].data;
 const trialTerms={name:'[ISOLATED TEST] Starter trial',currency:'INR',taxMode:'unknown',taxRate:null,pricePaise:null,interval:'monthly',trialDays:7,features:settings.features,limits:{...settings.limits,team:10}};
 await env.db.query("INSERT INTO commercial_plans(id,code,created_by) VALUES($1,'starter',$2)",[planId,owner.user.id]);
 await env.db.query("INSERT INTO commercial_plan_versions(id,plan_id,version,terms,created_by,reason) VALUES($1,$2,1,$3,$4,'Disposable trial fixture')",[versionId,planId,trialTerms,owner.user.id]);
 await env.db.query('UPDATE commercial_plans SET current_version_id=$1 WHERE id=$2',[versionId,planId]);
 await env.db.query("INSERT INTO os_trial_configuration(id,plan_version_id,enabled,updated_by,reason) VALUES(true,$1,true,$2,'Disposable trial fixture')",[versionId,owner.user.id]);
 const trialRequest={planVersionId:versionId,confirm:true};
 assert.equal((await owner.request('/companies/current/os/trial','POST',trialRequest,{'X-CSRF-Token':'invalid'})).status,403);
 const activated=await Promise.all([owner.request('/companies/current/os/trial','POST',trialRequest),owner.request('/companies/current/os/trial','POST',trialRequest)]);
 assert.deepEqual(activated.map(r=>r.status).sort(),[200,201]);
 assert.equal(activated[0].data.id,activated[1].data.id);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM company_subscriptions WHERE company_id=$1 AND trial_granted',[company])).rows[0].n,1);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM os_billing_contracts WHERE company_id=$1',[company])).rows[0].n,0);
 const projected=(await owner.request('/companies/current/os/plans')).data;
 assert.equal(projected.billingAvailable,false);assert.equal(projected.trialEligible,false);assert.equal(projected.access.unlocked,true);
 assert.equal((await owner.request('/companies/current/operations/dashboard')).status,200);
 // An existing company is grandfathered by the absence of enrolment metadata;
 // no historic agreement, company data or member is rewritten by the migration.
 await env.db.query('DELETE FROM company_os_enrolment WHERE company_id=$1',[company]);
 const legacy=await owner.request('/companies/current/os/plans');assert.equal(legacy.data.access.managed,false);assert.equal(legacy.data.access.unlocked,true);
 assert.equal((await owner.request('/companies/current/operations/dashboard')).status,200);
});

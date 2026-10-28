import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';

// Intentionally NOT run by this task. Requires separate authorization for the
// existing disposable-cluster runner and migrations before enabling this suite.
test('company onboarding retries preserve one company, owner, audit and saved address',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);await env.start();
 const owner=env.client(),other=env.client();await owner.register('master-owner');await other.register('master-other');
 const payload={operationKey:randomUUID(),name:'[ISOLATED TEST] Master onboarding',city:'Kozhikode',email:'master-company@example.invalid',phone:'',businessType:'both',businessPreset:'both',countryCode:'IN',state:'Kerala',district:'Kozhikode'};
 const first=await owner.request('/companies','POST',payload);assert.equal(first.status,201,JSON.stringify(first.data));const id=first.data.company.id;await owner.session();
 const replay=await owner.request('/companies','POST',payload);assert.equal(replay.status,200,JSON.stringify(replay.data));assert.equal(replay.data.company.id,id);assert.equal(replay.data.replayed,true);
 const counts=(await db.query("SELECT (SELECT count(*) FROM companies WHERE id=$1)::int AS companies,(SELECT count(*) FROM company_memberships WHERE company_id=$1 AND role_id='owner')::int AS owners,(SELECT count(*) FROM audit_events WHERE company_id=$1 AND action='company.created')::int AS audits",[id])).rows[0];assert.deepEqual(counts,{companies:1,owners:1,audits:1});
 assert.equal((await owner.request('/companies','POST',{...payload,city:'Chennai'})).status,409);
 assert.equal((await owner.request('/companies','POST',{...payload,operationKey:randomUUID()})).status,409);
 const different=await other.request('/companies','POST',payload);assert.equal(different.status,201,JSON.stringify(different.data));assert.notEqual(different.data.company.id,id);
 const profile=(await owner.request('/companies/current/setup')).data;assert.equal(profile.profile.state,'Kerala');assert.equal(profile.profile.district,'Kozhikode');assert.notEqual(profile.company.lifecycle,'active');assert.equal(profile.company.storefront_published,false);
 const indexed=(await db.query("SELECT metadata FROM audit_events WHERE company_id=$1 AND action='company.created'",[id])).rows[0].metadata;assert.match(indexed.creationFingerprint,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(indexed).includes(payload.operationKey),false);
});

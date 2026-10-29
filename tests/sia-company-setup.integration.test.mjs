import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';

// Prepared only. Do not run without separately authorised disposable PostgreSQL.
test('SIA plan creation, retry, owner scope, stale revisions and rollback',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t);await env.applyMigrations(env.db);await env.start();
 const owner=env.client(),other=env.client();await owner.register('sia-plan-owner');await other.register('sia-plan-other');
 const plan={website:'https://company.example.invalid',emergencyContact:'9000000000',whatsapp:'9000000000',products:['solar_panels'],otherProducts:'Street lights',team:[{role:'telecaller',count:2}]};
 const payload={operationKey:randomUUID(),name:'[ISOLATED TEST] SIA Company',city:'Kozhikode',email:'sia-company@example.invalid',phone:'9000000000',businessPreset:'both',businessType:'both',workspacePlan:plan};
 const bad=await owner.request('/companies','POST',{...payload,workspacePlan:{...plan,team:[{role:'owner',count:1}]}});assert.equal(bad.status,400);
 const first=await owner.request('/companies','POST',payload);assert.equal(first.status,201,JSON.stringify(first.data));await owner.session();
 const id=owner.company.id;assert.equal((await owner.request('/companies','POST',payload)).status,200);
 assert.equal((await owner.request('/companies','POST',{...payload,workspacePlan:{...plan,team:[]}})).status,409);
 const saved=await owner.request('/companies/current/setup/sia-plan');assert.equal(saved.status,200);assert.deepEqual(saved.data.plan,plan);assert.notEqual(saved.data.company.lifecycle,'active');
 const row=(await env.db.query('SELECT plan FROM company_workspace_plans WHERE company_id=$1',[id])).rows[0];assert.deepEqual(row.plan,plan);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM company_memberships WHERE company_id=$1',[id])).rows[0].n,1);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM company_role_profiles WHERE company_id=$1',[id])).rows[0].n,0);
 await other.createCompany('sia-other-company');
 assert.equal((await other.request('/companies/current/setup/sia-plan','GET',undefined,{'X-Company-ID':id})).status,409);
 const revision=saved.data.company.revision,next={...plan,otherProducts:'Updated internal product note'};
 assert.equal((await owner.request('/companies/current/setup/sia-plan','PUT',{revision,plan:next},{Origin:'https://untrusted.example.invalid'})).status,403);
 assert.equal((await owner.request('/companies/current/setup/sia-plan','PUT',{revision,plan:next},{'X-CSRF-Token':'invalid'})).status,403);
 assert.equal((await owner.request('/companies/current/setup/sia-plan','PUT',{revision,plan:next})).status,200);
 assert.equal((await owner.request('/companies/current/setup/sia-plan','PUT',{revision,plan})).status,409);
 const latest=(await owner.request('/companies/current/setup/sia-plan')).data;assert.deepEqual(latest.plan,next);assert.equal(latest.company.revision,revision+1);
 await env.db.query("UPDATE companies SET lifecycle='pending_review' WHERE id=$1",[id]);
 assert.equal((await owner.request('/companies/current/setup/sia-plan','PUT',{revision:latest.company.revision,plan})).status,409);
 assert.deepEqual((await env.db.query('SELECT plan FROM company_workspace_plans WHERE company_id=$1',[id])).rows[0].plan,next);
 const event=(await env.db.query("SELECT metadata FROM audit_events WHERE company_id=$1 AND action='company.workspace_plan_saved'",[id])).rows[0];assert.equal(event.metadata.positionCount,2);assert.ok(!JSON.stringify(event).includes(plan.emergencyContact));
});

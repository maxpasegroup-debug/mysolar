import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('company creation allows correction while retaining request and creation limits', {skip:!process.env.TEST_DATABASE_URL,timeout:120000}, async t=>{
 const env=await isolatedApp(t);await env.applyMigrations(env.db);await env.start();
 const owner=env.client(),other=env.client();await owner.register('creation-limit-owner');await other.register('creation-limit-other');
 const valid={operationKey:randomUUID(),name:'[TEST] company',city:'Kochi',email:'company@example.invalid',phone:''};
 assert.equal((await owner.request('/companies','POST',valid,{'X-CSRF-Token':'invalid'})).status,403);
 for(let i=0;i<6;i++)assert.equal((await owner.request('/companies','POST',{...valid,email:'invalid'})).status,400);
 assert.equal((await owner.request('/companies','POST',valid)).status,201);
 for(let i=0;i<4;i++)assert.equal((await owner.request('/companies','POST',valid)).status,200);
 assert.equal((await owner.request('/companies','POST',valid)).status,429);
 assert.equal((await env.db.query('SELECT count(*)::int AS n FROM companies')).rows[0].n,1);
 // A separate account still cannot send an unlimited stream of invalid requests.
 for(let i=0;i<30;i++)assert.equal((await other.request('/companies','POST',{...valid,email:'invalid'})).status,400);
 assert.equal((await other.request('/companies','POST',{...valid,email:'invalid'})).status,429);
});

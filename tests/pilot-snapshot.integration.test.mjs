import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';
import {collectSnapshot} from '../scripts/pilot-snapshot.mjs';

test('pilot evidence is read-only, cohort-scoped and excludes private business content',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,customer,companyA,companyB}=await connectedFixture(t);
 const input={version:1,approval:{reference:'test-approval-01',approvedAt:new Date(Date.now()-2*86400000).toISOString()},window:{start:new Date(Date.now()-86400000).toISOString(),end:new Date().toISOString()},companyIds:[companyA],customerIds:[customer.user.id],participantIds:[a.user.id,customer.user.id]};
 const before=(await db.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count;
 const snapshot=await collectSnapshot(db,input);assert.equal(snapshot.readOnly,true);assert.equal(snapshot.migrations.count,12);assert.equal(snapshot.companies.length,1);assert.equal(snapshot.companies[0].id,companyA);assert.equal(snapshot.companies[0].enquiries,1);assert.equal(snapshot.companies[0].issuedQuotationVersions,1);assert.ok(snapshot.companies[0].recordedActivity.days>=1);assert.equal(snapshot.companies[0].siaRecordedUsage.inputTokens,null);
 assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE-OFFER-COST|fixture@example|journey-owner|billing_address|password_hash|SESSION_SECRET/);assert.ok(!JSON.stringify(snapshot).includes(companyB));assert.equal(snapshot.settings.mode,'pre_billing');assert.deepEqual(snapshot.plans,[]);
 assert.equal((await db.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count,before);assert.equal((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
 await assert.rejects(collectSnapshot(db,{...input,companyIds:[randomUUID()]}),/not found/);assert.equal((await db.query('SELECT 1 AS ready')).rows[0].ready,1);
 const guarded={async query(sql,values){if(sql==='SHOW transaction_read_only'){await assert.rejects(db.query("UPDATE companies SET name='FORBIDDEN TEST WRITE' WHERE id=$1",[companyA]),error=>error.code==='25006');throw new Error('Tested write rejection');}return db.query(sql,values);}};
 await assert.rejects(collectSnapshot(guarded,input),/Tested write rejection/);assert.equal((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';
import {collectSnapshot} from '../scripts/pilot-snapshot.mjs';

test('pilot evidence is read-only, cohort-scoped and excludes private business content',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,companyA,companyB}=await connectedFixture(t);
 const input={version:1,approval:{reference:'test-approval-01',approvedAt:new Date(Date.now()-2*86400000).toISOString()},window:{start:new Date(Date.now()-86400000).toISOString(),end:new Date().toISOString()},companyIds:[companyA],customerIds:[customer.user.id],participantIds:[a.user.id,customer.user.id]};
 const before=(await db.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count;
 const snapshot=await collectSnapshot(db,input);assert.equal(snapshot.readOnly,true);assert.equal(snapshot.migrations.count,12);assert.equal(snapshot.companies.length,1);assert.equal(snapshot.companies[0].id,companyA);assert.equal(snapshot.companies[0].enquiries,1);assert.equal(snapshot.companies[0].issuedQuotationVersions,1);assert.ok(snapshot.companies[0].recordedActivity.days>=1);assert.equal(snapshot.companies[0].siaRecordedUsage.inputTokens,null);
 assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE-OFFER-COST|fixture@example|journey-owner|billing_address|password_hash|SESSION_SECRET/);assert.ok(!JSON.stringify(snapshot).includes(companyB));assert.equal(snapshot.settings.mode,'pre_billing');assert.deepEqual(snapshot.plans,[]);
 assert.equal((await db.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count,before);assert.equal((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
 await assert.rejects(collectSnapshot(db,{...input,companyIds:[randomUUID()]}),/not found/);assert.equal((await db.query('SELECT 1 AS ready')).rows[0].ready,1);
 const guarded={async query(sql,values){if(sql==='SHOW transaction_read_only'){await assert.rejects(db.query("UPDATE companies SET name='FORBIDDEN TEST WRITE' WHERE id=$1",[companyA]),error=>error.code==='25006');throw new Error('Tested write rejection');}return db.query(sql,values);}};
 await assert.rejects(collectSnapshot(guarded,input),/Tested write rejection/);assert.equal((await db.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
 // The directory's new draft price must not replace the company's agreed snapshot.
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] isolated commercial review operator')",[b.user.id]);
 const features=(await db.query('SELECT commercial_policy($1) AS p',[companyA])).rows[0].p.features;
 const terms={name:'[TEST] ELITE fixture',description:'PRIVATE-PLAN-DESCRIPTION',price:'123',currency:'INR',taxMode:'exempt',taxRate:'0',interval:'monthly',trialDays:7,effectiveFrom:new Date(Date.now()-86400000).toISOString(),effectiveTo:null,features,limits:{team:null,publishedOffers:null,siaDaily:null,siaMonthly:null},support:''};
 const plan=await b.request('/platform/commercial/plans','POST',{code:'elite',terms,reason:'[TEST] isolated pricing fixture'});assert.equal(plan.status,201,JSON.stringify(plan.data));
 assert.equal((await b.request('/platform/commercial/plans/'+plan.data.id+'/state','POST',{revision:1,status:'active',reason:'[TEST] publish fixture terms'})).status,200);
 assert.equal((await b.request('/platform/commercial/companies/'+companyA+'/subscriptions','POST',{revision:0,planId:plan.data.id,status:'active',startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+7*86400000).toISOString(),reason:'[TEST] manual fixture assignment'})).status,201);
 assert.equal((await b.request('/platform/commercial/plans/'+plan.data.id+'/versions','POST',{revision:2,terms:{...terms,price:'456'},reason:'[TEST] later draft version'})).status,200);
 const historical=await collectSnapshot(db,input);assert.equal(historical.plans[0].terms.pricePaise,'45600');assert.equal(historical.plans[0].status,'draft');assert.equal(historical.companies[0].agreement.terms.pricePaise,'12300');assert.equal(historical.companies[0].agreement.activation_source,'manual_administration');assert.doesNotMatch(JSON.stringify(historical),/PRIVATE-PLAN-DESCRIPTION/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {documents,reviewed} from '../server/legal/catalogue.js';

test('legal receipts, marketing choices and grievances remain explicit and account scoped',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);await env.start();
 const a=env.client(),b=env.client(),anonymous=env.client();await a.register('legal-owner');await b.register('legal-other');await anonymous.session();
 const {acceptDocuments,marketingPreference,marketingAllowed,assertCommercialAcceptance}=await import('../server/legal/service.js');
 const run=async work=>{await db.query('BEGIN');try{const r=await work();await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}};
 await t.test('public drafts are accessible, with immutable identifiers and no fabricated approval',async()=>{
  const catalogue=await anonymous.request('/legal/documents');assert.equal(catalogue.status,200);assert.equal(catalogue.data.commercialReady,false);assert.equal(catalogue.data.operator.name,'AIRASKILL CITY PVT LTD');assert.ok(catalogue.data.documents.every(d=>d.status==='draft'));
  for(const d of documents){const page=await fetch(env.base+d.path);assert.equal(page.status,200);assert.match(await page.text(),/DRAFT/);assert.equal((await fetch(env.base+d.path+'?digest=wrong')).status,404);}
  const centre=await fetch(env.base+'/legal');assert.equal(centre.status,200);assert.match(await centre.text(),/src\/legal-center.js/);assert.equal((await fetch(env.base+'/src/legal-center.js')).status,200);
  assert.equal((await anonymous.request('/legal/me')).status,401);
 });
 await t.test('draft acceptance is rejected, while reviewed snapshots are durable and idempotent',async()=>{
  const selected=documents.filter(d=>['terms','privacy','refunds','distributor'].includes(d.key)).map(({key,digest})=>({key,digest}));
  assert.equal((await a.request('/legal/accept','POST',{confirm:true,documents:selected})).data.error.code,'LEGAL_REVIEW_PENDING');
  const review={grievance:{name:'[TEST] Officer',email:'officer@example.invalid',designation:'[TEST] Grievance officer'},documents:Object.fromEntries(documents.map(d=>[d.key,{digest:d.digest,status:'approved',legalReviewer:'[TEST ONLY] Fictional reviewer',reference:'[TEST ONLY] Not a real legal opinion',approvedAt:new Date(Date.now()-2000).toISOString(),effectiveAt:new Date(Date.now()-1000).toISOString()}]))};
  assert.ok(documents.every(d=>reviewed(d,review)));assert.equal((await run(()=>acceptDocuments(db,a.user.id,'business',selected,{review}))).added,4);assert.equal((await run(()=>acceptDocuments(db,a.user.id,'business',selected,{review}))).added,0);
  const snapshot=await a.request('/legal/receipts/'+selected[0].digest);assert.equal(snapshot.status,200);assert.deepEqual(snapshot.data.metadata.snapshot,documents[0]);assert.equal((await b.request('/legal/receipts/'+selected[0].digest)).status,404);
  await a.createCompany('legal-company');const company=a.company.id;
  assert.equal((await run(()=>acceptDocuments(db,a.user.id,'business',selected,{review,companyId:company}))).added,4);
  assert.equal((await a.request('/legal/receipts/'+selected[0].digest+'?company='+company)).data.company_id,company);
  const ownerAction=await a.request('/companies/current/os/legal-accept','POST',{confirm:true,documents:selected},{'X-Company-ID':company});assert.equal(ownerAction.status,409);assert.equal(ownerAction.data.error.code,'LEGAL_REVIEW_PENDING');
  assert.equal((await b.request('/companies/current/os/legal-accept','POST',{confirm:true,documents:selected},{'X-Company-ID':company})).status,409);
  await assert.rejects(run(()=>acceptDocuments(db,b.user.id,'business',selected.map((d,i)=>i?d:{...d,digest:'0'.repeat(64)}),{review})),{code:'LEGAL_VERSION_CHANGED'});
  await assert.rejects(run(()=>acceptDocuments(db,b.user.id,'business',selected.slice(1),{review})),/required documents/);
  await assert.rejects(assertCommercialAcceptance(db,a.user.id),{code:'COMMERCIAL_REVIEW_PENDING'});
  Object.assign(process.env,{RAZORPAY_BILLING_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fictional',RAZORPAY_KEY_SECRET:'fixture-only',RAZORPAY_WEBHOOK_SECRET:'fixture-only-not-a-real-secret-0000000000'});
  try{const checkout=await a.request('/companies/current/os/checkout','POST',{operationKey:randomUUID(),planVersionId:randomUUID(),consent:true});assert.equal(checkout.data.error.code,'COMMERCIAL_REVIEW_PENDING');assert.equal((await a.request('/companies/current/os/plans')).data.billingAvailable,false);assert.equal((await db.query('SELECT count(*)::int AS n FROM os_billing_contracts')).rows[0].n,0);}finally{for(const key of ['RAZORPAY_BILLING_MODE','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'])delete process.env[key];}
 });
 await t.test('marketing is off by default, separate, reversible and cannot target another account',async()=>{
  assert.equal(await marketingAllowed(db,a.user.id),false);assert.equal((await a.request('/legal/marketing','POST',{enabled:true},{'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await a.request('/legal/marketing','POST',{enabled:true},{Origin:'https://other.example.invalid'})).status,403);
  assert.equal((await a.request('/legal/marketing','POST',{enabled:true,userId:b.user.id})).status,400);
  assert.equal((await a.request('/legal/marketing','POST',{enabled:true})).data.changed,true);assert.equal((await a.request('/legal/marketing','POST',{enabled:true})).data.changed,false);
  assert.equal(await marketingAllowed(db,a.user.id),true);assert.equal(await marketingAllowed(db,b.user.id),false);
  assert.equal((await a.request('/legal/marketing','POST',{enabled:false})).data.enabled,false);assert.equal(await marketingAllowed(db,a.user.id),false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM mail_jobs')).rows[0].n,0);
 });
 await t.test('grievance retries do not duplicate records; progress is private and privileged',async()=>{
  const body={category:'privacy',reference:'[TEST] record',message:'[TEST] Please review this privacy request.',operationKey:randomUUID()};const responses=await Promise.all([a.request('/legal/grievances','POST',body),a.request('/legal/grievances','POST',body)]);assert.ok(responses.every(r=>r.status===201));assert.equal(responses[0].data.id,responses[1].data.id);const id=responses[0].data.id;
  assert.equal((await a.request('/legal/grievances','POST',{...body,message:'[TEST] changed request body'})).status,409);
  assert.equal((await a.request('/legal/me')).data.grievances.length,1);assert.equal((await b.request('/legal/me')).data.grievances.length,0);
  const copy=await a.request('/legal/grievances/'+id+'/receipt');assert.equal(copy.status,200);assert.equal(copy.data.details.message,body.message);assert.equal(copy.data.details.operationKey,undefined);assert.equal((await b.request('/legal/grievances/'+id+'/receipt')).status,404);
  assert.equal((await a.request('/platform/legal/grievances')).status,403);
  await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST ONLY] grievance operator')",[b.user.id]);
  assert.equal((await b.request('/platform/legal/grievances')).data.items.length,1);
  const update=(state,expectedState)=>b.request('/platform/legal/grievances/'+id,'POST',{state,expectedState,message:'[TEST] Customer-visible progress update.'});
  assert.equal((await update('resolved','submitted')).status,400);assert.equal((await update('acknowledged','submitted')).status,200);assert.equal((await update('investigating','submitted')).status,409);assert.equal((await update('resolved','acknowledged')).status,200);assert.equal((await update('reopened','resolved')).status,200);
  assert.equal((await a.request('/legal/me')).data.grievances[0].progress.state,'reopened');
  const log=(await db.query("SELECT metadata FROM audit_events WHERE action='legal.grievance_submitted'")).rows;assert.equal(log.length,1);assert.ok(Date.parse(log[0].metadata.acknowledgedBy)<Date.parse(log[0].metadata.resolvedBy));
 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();
process.env.RAZORPAY_BILLING_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_unit';process.env.RAZORPAY_KEY_SECRET='unit-secret';process.env.RAZORPAY_WEBHOOK_SECRET='webhook-secret-unit-value-long-enough-32-chars';
const {parseVerifiedWebhook,acceptRazorpayWebhook,insertWebhookInbox,decodeWebhookPayload}=await import('../server/commercial/webhook-inbox.js');
const {seal}=await import('../server/auth/sealed.js');
const {eventHash}=await import('../server/commercial/os-billing.js');
const {claimWebhookEvent,processClaimedWebhook,retryDelayMs,finishWebhookFailure,WEBHOOK_MAX_ATTEMPTS}=await import('../server/commercial/razorpay-webhook-worker.js');
const secret='webhook-secret-unit-value-long-enough-32-chars';
function fixture(event='subscription.updated',status='active'){
 const body=Buffer.from(JSON.stringify({event,created_at:1793900000,payload:{subscription:{entity:{id:'sub_unit',status,plan_id:'plan_unit'}},...(event==='subscription.charged'?{payment:{entity:{id:'pay_unit'}}}:{})}}));
 return {body,eventId:'evt_unit_1',signature:createHmac('sha256',secret).update(body).digest('hex')};
}
const tx=work=>work({query:async()=>({rows:[],rowCount:1})});

test('valid raw-body signature is accepted and the encrypted stored bytes preserve its hash',()=>{
 const f=fixture(),row=parseVerifiedWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test'}),decoded=decodeWebhookPayload(row.encryptedPayload,row.payloadHash);
 assert.equal(row.eventType,'subscription.updated');assert.equal(decoded.rawBody.toString(),f.body.toString());assert.equal(row.payloadHash,eventHash(f.body));
});
test('invalid signature never reaches durable persistence',async()=>{
 const f=fixture();let persisted=false;await assert.rejects(acceptRazorpayWebhook({rawBody:f.body,signature:'0'.repeat(64),secret,eventId:f.eventId,mode:'test',persist:async()=>{persisted=true;}}),{code:'INVALID_WEBHOOK'});assert.equal(persisted,false);
});
test('unsupported signed event is deliberately ignored without entering the billing inbox',async()=>{
 const f=fixture('invoice.paid');let persisted=false;const result=await acceptRazorpayWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test',persist:async()=>{persisted=true;}});assert.deepEqual(result,{ignored:true});assert.equal(persisted,false);
});
test('ack helper resolves only after the durable persistence operation completes and has no provider dependency',async t=>{
 const f=fixture(),durable=new Map(),started=performance.now(),result=await acceptRazorpayWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test',persist:async row=>{await delay(25);durable.set(row.eventId,row);return {accepted:true,id:row.id};},logger:()=>{}}),elapsed=performance.now()-started;
 assert.ok(durable.has(f.eventId));assert.equal(result.accepted,true);assert.ok(elapsed>=20);assert.ok(elapsed<1000,`mocked acknowledgement was ${elapsed.toFixed(1)}ms`);t.diagnostic(`Simulated durable-store acknowledgement: ${elapsed.toFixed(1)}ms (25ms delayed persistence fixture; not a PostgreSQL measurement).`);
});
test('persistence failure does not produce an accepted acknowledgement',async()=>{
 const f=fixture();await assert.rejects(acceptRazorpayWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test',persist:async()=>{throw Object.assign(new Error('offline'),{code:'DB_DOWN'});},logger:()=>{}}),{code:'DB_DOWN'});
});
test('duplicate event delivery returns existing durable event while event-id content collision fails closed',async()=>{
 const f=fixture(),row=parseVerifiedWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test'});let calls=0;
 const duplicate=await insertWebhookInbox({query:async(sql)=>{calls++;if(sql.startsWith('INSERT'))return {rowCount:0,rows:[]};return {rows:[{id:'existing',provider_event_id:f.eventId,payload_hash:row.payloadHash}]};}},row);
 assert.deepEqual(duplicate,{duplicate:true,id:'existing'});assert.equal(calls,2);
 const collision=fixture('subscription.paused','paused');const different=parseVerifiedWebhook({rawBody:collision.body,signature:collision.signature,secret,eventId:f.eventId,mode:'test'});
 await assert.rejects(insertWebhookInbox({query:async sql=>sql.startsWith('INSERT')?{rowCount:0,rows:[]}:{rows:[{id:'existing',provider_event_id:f.eventId,payload_hash:row.payloadHash}]}},different),{code:'WEBHOOK_EVENT_CONFLICT'});
});
test('a new inbox row stores the encrypted payload under mode-scoped identifiers',async()=>{
 const f=fixture(),row=parseVerifiedWebhook({rawBody:f.body,signature:f.signature,secret,eventId:f.eventId,mode:'test'});let values;
 const result=await insertWebhookInbox({query:async(_sql,args)=>{values=args;return {rowCount:1,rows:[{id:args[0]}]};}},row);
 assert.deepEqual(result,{accepted:true,id:row.id});assert.equal(values[1],'test');assert.equal(values[2],f.eventId);assert.equal(values[3],eventHash(f.body));assert.equal(values[6].includes('sub_unit'),false);
});
test('database claim uses row locks with SKIP LOCKED and reclaims expired leases',async()=>{
 const sqls=[],job={id:'inbox',provider_mode:'test',provider_event_id:'evt',payload_hash:'a'.repeat(64),event_type:'subscription.updated',provider_subscription_id:'sub_unit',encrypted_payload:'opaque',attempt_count:2,claim_token:'token'};
 // A concrete claim fixture verifies stale rows are selected only when their lease expired.
 const claimed=await claimWebhookEvent({mode:'test',tx:work=>work({query:async sql=>{sqls.push(sql);if(sql.includes('SELECT id,provider_event_id'))return {rows:[job]};if(sql.includes('RETURNING id,provider_mode'))return {rows:[{...job,attempt_count:3,claim_token:'new-token'}],rowCount:1};return {rows:[],rowCount:0};}})});
 assert.equal(claimed.attempt_count,3);assert.ok(sqls.some(sql=>sql.includes('FOR UPDATE SKIP LOCKED')));assert.ok(sqls.some(sql=>sql.includes("status='processing' AND lease_expires_at<=now()")));
});
test('retry delays are exponential and bounded; exhausted failures become dead',async()=>{
 assert.equal(retryDelayMs(1),5000);assert.equal(retryDelayMs(2),10000);assert.equal(retryDelayMs(20),60*60*1000);
 const values=[],fakeTx=work=>work({query:async(sql,args)=>{values.push({sql,args});return {rowCount:1,rows:[]};}});
 const retry=await finishWebhookFailure({job:{id:'id',claim_token:'claim',attempt_count:2},code:'BILLING_PROVIDER_UNAVAILABLE',tx:fakeTx,nowMs:100000});assert.equal(retry.status,'retry');assert.equal(Date.parse(retry.availableAt)-100000,10000);assert.equal(values[0].args[2],'retry');
 values.length=0;const dead=await finishWebhookFailure({job:{id:'id',claim_token:'claim',attempt_count:WEBHOOK_MAX_ATTEMPTS},code:'WORKER_PROCESSING_FAILED',tx:fakeTx,nowMs:100000});assert.equal(dead.status,'dead');assert.equal(values[0].args[2],'dead');assert.equal(values[0].args[4],'MAX_ATTEMPTS_EXCEEDED');
});
test('integrity and provider-context failures require review instead of blind retry',async()=>{
 const calls=[];const result=await finishWebhookFailure({job:{id:'id',claim_token:'claim',attempt_count:1},code:'BILLING_PROVIDER_CONTEXT_MISMATCH',tx:work=>work({query:async(sql,args)=>{calls.push({sql,args});return {rowCount:1,rows:[]};}})});assert.equal(result.status,'review_required');assert.equal(calls[0].args[2],'review_required');
});

const testContract=()=>({id:'contract_unit',company_id:'company_unit',owner_id:'owner_unit',plan_id:'plan_id',plan_version_id:'version_unit',terms:{name:'Starter',currency:'INR',taxMode:'inclusive',taxRate:'0',pricePaise:'350000',interval:'monthly',trialDays:0,limits:{team:10}},setup_terms:{},settings_version_id:1,commercial_revision:0,mode:'test',state:'created',purpose:'direct_subscription',provider_subscription_id:'sub_unit'});
function workerJob(event){const rawBody=Buffer.from(JSON.stringify(event));return {id:'inbox_unit',provider_mode:'test',provider_event_id:'evt_unit',payload_hash:eventHash(rawBody),event_type:event.event,provider_subscription_id:'sub_unit',encrypted_payload:seal({rawBody:rawBody.toString('base64')}),contract_id:null,attempt_count:1,claim_token:'claim_unit',lease_expires_at:new Date(Date.now()+60000).toISOString()};}
function workerDatabase({job,contract=testContract(),currentEnd=null,paymentInserted=true}={}){
 const calls=[];const db={async query(sql,args=[]){calls.push({sql,args});
  if(sql.includes('SELECT status,claim_token,lease_expires_at FROM razorpay_webhook_inbox'))return {rows:[{status:'processing',claim_token:job.claim_token,lease_expires_at:job.lease_expires_at}],rowCount:1};
  if(sql.startsWith('SELECT id FROM users'))return {rows:[{id:contract.owner_id}],rowCount:1};
  if(sql.startsWith('SELECT status,lifecycle FROM companies'))return {rows:[{status:'active',lifecycle:'active'}],rowCount:1};
  if(sql.startsWith('SELECT * FROM os_billing_contracts'))return {rows:[contract],rowCount:1};
  if(sql.startsWith('INSERT INTO os_billing_events'))return {rows:[{payload_hash:args[0]}],rowCount:1};
  if(sql.includes('FROM razorpay_plan_mappings'))return {rows:[{provider_plan_id:'plan_unit'}],rowCount:1};
  if(sql.startsWith('SELECT revision FROM company_commercial_state'))return {rows:[{revision:0}],rowCount:1};
  if(sql.startsWith('INSERT INTO os_billing_payments'))return paymentInserted?{rows:[{provider_payment_id:args[0]}],rowCount:1}:{rows:[],rowCount:0};
  if(sql.includes('SELECT s.end_at'))return {rows:currentEnd?[{end_at:currentEnd}]:[],rowCount:currentEnd?1:0};
  if(sql.includes('SELECT s.* FROM company_commercial_state'))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO company_commercial_state'))return {rows:[{revision:1}],rowCount:1};
  if(sql.includes('UPDATE razorpay_webhook_inbox SET status=$3,contract_id=$4'))return {rows:[{}],rowCount:1};
  return {rows:[],rowCount:1};
 }};return {db,calls};
}
const providerFor=(subscriptionStatus='active',paymentStatus='captured',invoiceStatus='paid',periodStart=1793900000,periodEnd=1796492000)=>({request:async(_method,path)=>{
 if(path==='subscriptions/sub_unit')return {id:'sub_unit',plan_id:'plan_unit',status:subscriptionStatus};
 if(path==='payments/pay_unit')return {id:'pay_unit',invoice_id:'inv_unit',status:paymentStatus,currency:'INR',amount:350000};
 if(path==='invoices/inv_unit')return {id:'inv_unit',payment_id:'pay_unit',subscription_id:'sub_unit',status:invoiceStatus,currency:'INR',amount_paid:350000,billing_start:periodStart,billing_end:periodEnd};
 throw new Error('unexpected provider path');
 }});
function chargeEvent(){return {event:'subscription.charged',payload:{subscription:{entity:{id:'sub_unit'}},payment:{entity:{id:'pay_unit'}}}};}
test('worker processes pause, resume and update from current provider state without granting access',async()=>{
 for(const [eventName,status] of [['subscription.authenticated','authenticated'],['subscription.activated','active'],['subscription.pending','pending'],['subscription.halted','halted'],['subscription.paused','paused'],['subscription.resumed','resumed'],['subscription.updated','active'],['subscription.cancelled','cancelled'],['subscription.completed','completed']]){
  const event={event:eventName,payload:{subscription:{entity:{id:'sub_unit'}}}},job=workerJob(event),{db,calls}=workerDatabase({job});
  const result=await processClaimedWebhook({job,provider:providerFor(status),tx:work=>work(db),lookup:async()=>({rows:[testContract()] }),logger:()=>{}});
  assert.equal(result.status,'processed');assert.ok(result.observed||result.cancelled);assert.equal(calls.some(c=>c.sql.startsWith('INSERT INTO company_subscriptions')),false);
 }
});
test('worker verifies captured payment and paid invoice before entitlement activation',async()=>{
 const job=workerJob(chargeEvent()),{db,calls}=workerDatabase({job});
 const result=await processClaimedWebhook({job,provider:providerFor(),tx:work=>work(db),lookup:async()=>({rows:[testContract()] }),logger:()=>{}});
 assert.equal(result.captured,true);assert.equal(calls.some(c=>c.sql.startsWith('INSERT INTO company_subscriptions')),true);assert.ok(calls.findIndex(c=>c.sql.startsWith('INSERT INTO os_billing_payments'))<calls.findIndex(c=>c.sql.startsWith('INSERT INTO company_subscriptions')));
});
test('unverified payment and invoice do not create access',async()=>{
 const job=workerJob(chargeEvent()),{db,calls}=workerDatabase({job});
 await assert.rejects(processClaimedWebhook({job,provider:providerFor('active','authorized'),tx:work=>work(db),lookup:async()=>({rows:[testContract()] }),logger:()=>{}}),/BILLING_CAPTURE_NOT_VERIFIED/);
 assert.equal(calls.some(c=>c.sql.startsWith('INSERT INTO company_subscriptions')),false);
});
test('a delayed older renewal never replaces a later paid period',async()=>{
 const oldStart=1793900000,oldEnd=1796492000,job=workerJob(chargeEvent()),newer=new Date((oldEnd+86400)*1000),{db,calls}=workerDatabase({job,currentEnd:newer});
 const result=await processClaimedWebhook({job,provider:providerFor('active','captured','paid',oldStart,oldEnd),tx:work=>work(db),lookup:async()=>({rows:[testContract()] }),logger:()=>{}});
 assert.equal(result.captured,true);assert.equal(calls.some(c=>c.sql.startsWith('INSERT INTO os_billing_payments')),true);assert.equal(calls.some(c=>c.sql.startsWith('INSERT INTO company_subscriptions')),false);
});
test('migration defines durable uniqueness, encrypted payload, retries, lease and history indexes without applying it',async()=>{
 const sql=await readFile(new URL('../server/db/migrations/047_razorpay_webhook_inbox.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE razorpay_webhook_inbox/);assert.match(sql,/UNIQUE\(provider_mode,provider_event_id\)/);assert.match(sql,/UNIQUE\(provider_mode,payload_hash\)/);assert.match(sql,/encrypted_payload text NOT NULL/);assert.match(sql,/attempt_count integer NOT NULL/);assert.match(sql,/lease_expires_at timestamptz/);assert.match(sql,/CREATE INDEX razorpay_webhook_inbox_ready/);assert.match(sql,/CREATE INDEX razorpay_webhook_inbox_lease/);
});

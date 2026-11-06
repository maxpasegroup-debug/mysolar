import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,transaction,audit} from '../db/pool.js';
import {migrationManifest} from '../db/migrations.js';
import {matchesMigrationManifest} from '../db/readiness.js';
import {config} from '../config.js';
import {billingConfiguration,razorpayClient,providerId} from './razorpay.js';
import {decodeWebhookPayload} from './webhook-inbox.js';
import {applyVerifiedProviderEvent} from './payments.js';

export const WEBHOOK_MAX_ATTEMPTS=8,WEBHOOK_LEASE_SECONDS=120;
const safeCodes=new Set(['BILLING_RESPONSE_INVALID','BILLING_PROVIDER_UNAVAILABLE','BILLING_PROVIDER_REJECTED','BILLING_RESULT_UNKNOWN','BILLING_CAPTURE_NOT_VERIFIED','BILLING_CONTEXT_PENDING','BILLING_MODE_MISMATCH','BILLING_PROVIDER_CONTEXT_MISMATCH','BILLING_PROVIDER_STATE_INVALID','TRIAL_ALREADY_GRANTED','WEBHOOK_PAYLOAD_INVALID','WEBHOOK_PAYLOAD_INTEGRITY_FAILED','DATABASE_SCHEMA_MISSING','DATABASE_SCHEMA_OUTDATED','DATABASE_CONNECTION_REFUSED','DEPENDENCY_TIMEOUT','DATABASE_AUTHENTICATION_FAILED','DATABASE_CONNECTION_LIMIT','DATABASE_RESTARTING','SERVICE_NOT_READY']);
const reviewCodes=new Set(['BILLING_MODE_MISMATCH','BILLING_PROVIDER_CONTEXT_MISMATCH','BILLING_PROVIDER_STATE_INVALID','WEBHOOK_PAYLOAD_INVALID','WEBHOOK_PAYLOAD_INTEGRITY_FAILED']);
const logEvent=(logger,event,fields={})=>logger(JSON.stringify({event,at:new Date().toISOString(),...fields}));
function errorCode(error){if(safeCodes.has(error?.code))return error.code;const msg=error instanceof Error?error.message:'';return safeCodes.has(msg)?msg:'WORKER_PROCESSING_FAILED';}
export function retryDelayMs(attempt){return Math.min(5000*2**Math.max(0,attempt-1),60*60*1000);}

export async function claimWebhookEvent({mode,tx=transaction,maxAttempts=WEBHOOK_MAX_ATTEMPTS,leaseSeconds=WEBHOOK_LEASE_SECONDS}){
 return tx(async db=>{
  await db.query(`UPDATE razorpay_webhook_inbox SET status='dead',claim_token=NULL,claimed_at=NULL,lease_expires_at=NULL,last_error_code=coalesce(last_error_code,'MAX_ATTEMPTS_EXCEEDED')
   WHERE provider_mode=$1 AND attempt_count >= $2 AND ((status IN ('pending','retry') AND available_at<=now()) OR (status='processing' AND lease_expires_at<=now()))`,[mode,maxAttempts]);
  const row=(await db.query(`SELECT id,provider_event_id,payload_hash,event_type,provider_subscription_id,encrypted_payload,attempt_count
   FROM razorpay_webhook_inbox WHERE provider_mode=$1 AND attempt_count<$2 AND
   ((status IN ('pending','retry') AND available_at<=now()) OR (status='processing' AND lease_expires_at<=now()))
   ORDER BY available_at,received_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[mode,maxAttempts])).rows[0];
  if(!row)return null;
  const token=randomUUID(),claimed=(await db.query(`UPDATE razorpay_webhook_inbox SET status='processing',attempt_count=attempt_count+1,claim_token=$2,claimed_at=now(),lease_expires_at=now()+($3::int*interval '1 second'),last_error_code=NULL
   WHERE id=$1 RETURNING id,provider_mode,provider_event_id,payload_hash,event_type,provider_subscription_id,contract_id,encrypted_payload,attempt_count,claim_token`,[row.id,token,leaseSeconds])).rows[0];
  return claimed;
 });
}

export async function finishWebhookFailure({job,code,tx,maxAttempts=WEBHOOK_MAX_ATTEMPTS,nowMs=Date.now()}){
 const permanent=reviewCodes.has(code),exhausted=job.attempt_count>=maxAttempts,status=permanent?'review_required':exhausted?'dead':'retry';
 const availableAt=new Date(nowMs+retryDelayMs(job.attempt_count));
 let changed=false;await tx(async db=>{
  const result=await db.query(`UPDATE razorpay_webhook_inbox SET status=$3,available_at=CASE WHEN $3='retry' THEN $4 ELSE available_at END,
   claim_token=NULL,claimed_at=NULL,lease_expires_at=NULL,last_error_code=$5
   WHERE id=$1 AND status='processing' AND claim_token=$2`,[job.id,job.claim_token,status,availableAt,exhausted&&!permanent?'MAX_ATTEMPTS_EXCEEDED':code]);
  changed=Boolean(result.rowCount);if(changed)await db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('razorpay_webhooks',now(),$1) ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status=excluded.last_status",[status]);
 });
 return {status:changed?status:'lease_lost',availableAt:changed&&status==='retry'?availableAt.toISOString():null};
}

export async function processClaimedWebhook({job,provider,tx=transaction,lookup=(sql,args)=>pool.query(sql,args),logger=console.info}){
 logEvent(logger,'razorpay_webhook_processing_started',{inboxId:job.id,eventId:job.provider_event_id,eventType:job.event_type,attempt:job.attempt_count});
 const {event}=decodeWebhookPayload(job.encrypted_payload,job.payload_hash),subId=providerId(job.provider_subscription_id,'sub');
 if(event.event!==job.event_type||event.payload?.subscription?.entity?.id!==subId)throw new Error('WEBHOOK_PAYLOAD_INTEGRITY_FAILED');
 const contract=(await lookup('SELECT * FROM os_billing_contracts WHERE provider_subscription_id=$1 AND mode=$2',[subId,job.provider_mode])).rows[0];
 if(!contract)throw Object.assign(new Error('BILLING_CONTEXT_PENDING'),{code:'BILLING_CONTEXT_PENDING'});
 const subscription=await provider.request('GET','subscriptions/'+subId);let payment,invoice;
 if(event.event==='subscription.charged'){
  const paymentId=providerId(event.payload?.payment?.entity?.id,'pay');payment=await provider.request('GET','payments/'+paymentId);
  if(payment.id!==paymentId)throw new Error('BILLING_PROVIDER_CONTEXT_MISMATCH');
  invoice=await provider.request('GET','invoices/'+providerId(payment.invoice_id,'inv'));
 }
 const applied=await tx(async db=>{
  const inbox=(await db.query("SELECT status,claim_token,lease_expires_at FROM razorpay_webhook_inbox WHERE id=$1 FOR UPDATE",[job.id])).rows[0];
  if(!inbox||inbox.status!=='processing'||inbox.claim_token!==job.claim_token||Date.parse(inbox.lease_expires_at)<=Date.now())return {leaseLost:true};
  await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[contract.owner_id]);
  const company=(await db.query('SELECT status,lifecycle FROM companies WHERE id=$1 FOR UPDATE',[contract.company_id])).rows[0];
  const current=(await db.query('SELECT * FROM os_billing_contracts WHERE id=$1 FOR UPDATE',[contract.id])).rows[0];
  let result;
  if(company?.status!=='active'||company?.lifecycle!=='active'){
   await db.query("UPDATE os_billing_contracts SET state='review_required' WHERE id=$1",[contract.id]);
   await audit(db,{actor:contract.owner_id,company:contract.company_id,action:'commercial.provider_event_requires_review',target:contract.id});result={reviewRequired:true};
  }else result=await applyVerifiedProviderEvent({db,contract:current,event:{...event,mode:job.provider_mode},providerSubscription:subscription,payment,invoice,eventId:job.provider_event_id,hash:job.payload_hash});
  const status=result.reviewRequired?'review_required':'processed';
  const updated=await db.query(`UPDATE razorpay_webhook_inbox SET status=$3,contract_id=$4,completed_at=CASE WHEN $3='processed' THEN now() ELSE NULL END,claim_token=NULL,claimed_at=NULL,lease_expires_at=NULL,last_error_code=CASE WHEN $3='review_required' THEN 'COMPANY_REVIEW_REQUIRED' ELSE NULL END
   WHERE id=$1 AND status='processing' AND claim_token=$2`,[job.id,job.claim_token,status,contract.id]);
  if(!updated.rowCount)throw new Error('WEBHOOK_CLAIM_LOST');
  await db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('razorpay_webhooks',now(),$1) ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status=excluded.last_status",[status]);
  return {...result,status};
 });
 if(applied.leaseLost){logEvent(logger,'razorpay_webhook_claim_lost',{inboxId:job.id,eventId:job.provider_event_id});return applied;}
 logEvent(logger,applied.reviewRequired?'razorpay_webhook_processing_failed':'razorpay_webhook_processing_completed',{inboxId:job.id,eventId:job.provider_event_id,eventType:job.event_type,status:applied.status});return applied;
}

export async function webhookWorkerTick({mode,provider=razorpayClient(),tx=transaction,lookup=(sql,args)=>pool.query(sql,args),logger=console.info}={}){
 const job=await claimWebhookEvent({mode,tx});if(!job){await tx(db=>db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('razorpay_webhooks',now(),'idle') ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status='idle'"));return {state:'idle'};}
 logEvent(logger,'razorpay_webhook_event_claimed',{inboxId:job.id,eventId:job.provider_event_id,eventType:job.event_type,attempt:job.attempt_count});
 try{return {state:'processed',result:await processClaimedWebhook({job,provider,tx,lookup,logger})};}
 catch(error){const code=errorCode(error),failure=await finishWebhookFailure({job,code,tx});if(failure.status==='lease_lost'){logEvent(logger,'razorpay_webhook_claim_lost',{inboxId:job.id,eventId:job.provider_event_id,eventType:job.event_type});return {state:'lease_lost'};}const eventName=failure.status==='retry'?'razorpay_webhook_retry_scheduled':failure.status==='dead'?'razorpay_webhook_permanently_failed':'razorpay_webhook_processing_failed';logEvent(logger,eventName,{inboxId:job.id,eventId:job.provider_event_id,eventType:job.event_type,attempt:job.attempt_count,status:failure.status,errorCode:code,nextAttemptAt:failure.availableAt});return {state:failure.status,errorCode:code,nextAttemptAt:failure.availableAt};}
}

async function ready(){const expected=await migrationManifest(),result=await pool.query('SELECT name,checksum FROM schema_migrations');return matchesMigrationManifest(expected,result.rows);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let stopping=false;const controller=new AbortController();for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;controller.abort();});
 try{
  if(!config.dataEncryptionKey)throw new Error('WEBHOOK_ENCRYPTION_KEY_UNAVAILABLE');
  const settings=billingConfiguration();if(!settings.available)throw new Error('WEBHOOK_BILLING_CONFIGURATION_UNAVAILABLE');
  if(!await ready())throw new Error('WEBHOOK_INBOX_MIGRATION_REQUIRED');
  do{try{const result=await webhookWorkerTick({mode:settings.mode});if(result.state!=='idle')console.log(JSON.stringify({event:'razorpay_webhook_worker_tick',...result}));}
   catch{console.error(JSON.stringify({event:'razorpay_webhook_worker_tick_failed'}));if(process.argv.includes('--once')){process.exitCode=1;break;}}
   if(stopping||process.argv.includes('--once'))break;try{await delay(1000,undefined,{signal:controller.signal});}catch{}
  }while(!stopping);
 }catch(error){console.error(JSON.stringify({event:'razorpay_webhook_worker_start_blocked',code:['WEBHOOK_ENCRYPTION_KEY_UNAVAILABLE','WEBHOOK_BILLING_CONFIGURATION_UNAVAILABLE','WEBHOOK_INBOX_MIGRATION_REQUIRED'].includes(error.message)?error.message:'WORKER_START_FAILED'}));process.exitCode=1;}
 finally{await pool.end();}
}

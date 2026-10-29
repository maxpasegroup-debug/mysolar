import {createPaymentSession,applyVerifiedProviderEvent} from './payments.js';
import {freeTrialConfiguration,startFreeTrial} from './free-trial.js';
import {policy} from './policy.js';
import {Router,raw} from 'express';
import {randomUUID} from 'node:crypto';
import {requireUser,csrf} from '../auth/sessions.js';
import {withCompany} from '../tenancy/context.js';
import {withPlatform} from '../platform/routes.js';
import {pool,transaction,audit} from '../db/pool.js';
import {setupData} from '../setup/service.js';
import {osAccess} from './os-access.js';
import {billingConfiguration,razorpayClient,verifyWebhook,providerId,renewalAmount} from './razorpay.js';
import {prepareContract,publicContract,planMatches,approvedOsOffer,eventHash} from './os-billing.js';
import {HttpError,badInput} from '../errors.js';
import * as v from '../validation.js';
import {limit} from '../auth/security.js';
export const osRoutes=Router(),billingAdmin=Router(),billingWebhook=Router();
const owner=ctx=>{if(ctx.role!=='owner')throw new HttpError(403,'OWNER_REQUIRED','The company owner must review subscription terms.');};
osRoutes.use(requireUser);osRoutes.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
osRoutes.post('/trial',async(req,res)=>{
 v.body(req.body,['planVersionId','confirm']);const version=v.uuid(req.body.planVersionId);if(req.body.confirm!==true)throw badInput('Confirm starting the seven-day free trial. No payment or autopay is required.');
 await limit(req,'os-free-trial',req.session.user_id,10,86400);
 const trial=await withCompany(req,'subscription.read',(db,ctx)=>startFreeTrial(db,ctx,version));
 res.status(trial.replayed?200:201).json({...trial,message:trial.replayed?'Your existing free trial is active. Its dates have not changed.':'Your seven-day free trial is active. No payment or autopay was set up.'});
});
osRoutes.get('/leads',async(req,res)=>res.json(await withCompany(req,'company.setup.read',async(db,ctx)=>{
 owner(ctx);const d=await setupData(db,ctx.companyId);const published=(await db.query('SELECT 1 FROM marketplace_vendors WHERE id=$1',[ctx.companyId])).rowCount===1;
 const enquiries=ctx.permissions.includes('leads.read')?(await db.query('SELECT count(*)::int AS n FROM enquiry_recipients WHERE company_id=$1',[ctx.companyId])).rows[0].n:null;
 return {company:d.company,brand:d.brand,profile:d.profile,business:d.business,published,enquiries,access:await osAccess(db,ctx.companyId),notice:'Once approved and published, customers can discover your company and send enquiries. Listing does not guarantee enquiries.'};
})));
osRoutes.get('/plans',async(req,res)=>res.json(await withCompany(req,'subscription.read',async(db,ctx)=>{
 owner(ctx);const settings=billingConfiguration(),rows=(await db.query("SELECT p.id,v.id AS version_id,p.code,v.terms,m.mode,m.total_count FROM commercial_plans p JOIN commercial_plan_versions v ON v.id=p.current_version_id LEFT JOIN razorpay_plan_mappings m ON m.plan_version_id=v.id WHERE p.status='active' AND (v.terms->>'effectiveFrom')::timestamptz<=now() AND (v.terms->>'effectiveTo' IS NULL OR (v.terms->>'effectiveTo')::timestamptz>now()) ORDER BY p.code LIMIT 30")).rows;
 const plans=rows.map(row=>{let eligible=false;try{renewalAmount(row.terms);eligible=approvedOsOffer(row.code,row.terms)&&row.mode===settings.mode&&settings.available;}catch{}return {...row,eligible};});
 const contract=(await db.query('SELECT * FROM os_billing_contracts WHERE company_id=$1 ORDER BY consent_at DESC LIMIT 1',[ctx.companyId])).rows[0];
 const current=(await db.query("SELECT s.terms->>'name' AS name,s.status,s.start_at,s.end_at,s.activation_source FROM company_commercial_state cs JOIN company_subscriptions s ON s.id=cs.current_subscription_id AND s.company_id=cs.company_id WHERE cs.company_id=$1",[ctx.companyId])).rows[0]||null;
 const access=await osAccess(db,ctx.companyId),company=(await db.query('SELECT name,lifecycle,status FROM companies WHERE id=$1',[ctx.companyId])).rows[0],history=(await db.query('SELECT 1 FROM company_subscriptions WHERE company_id=$1 LIMIT 1',[ctx.companyId])).rowCount,verified=(await db.query("SELECT 1 FROM users WHERE id=$1 AND status='active' AND email_verified_at IS NOT NULL",[ctx.userId])).rowCount;
 const freeTrial=await freeTrialConfiguration(db),trial=(await db.query('SELECT id,start_at,end_at FROM company_subscriptions WHERE company_id=$1 AND trial_granted ORDER BY created_at,id LIMIT 1',[ctx.companyId])).rows[0]||null;
 return {plans,current,policy:await policy(db,ctx.companyId),contract:publicContract(contract),access,company,freeTrial,trial,trialEligible:Boolean(freeTrial.configured&&access.managed&&company.status==='active'&&company.lifecycle==='active'&&!contract&&!history&&verified),subscriptionEligible:Boolean(access.managed&&company.status==='active'&&company.lifecycle==='active'&&trial&&Date.parse(trial.end_at)<=Date.now()&&!access.unlocked&&(!contract||['failed','cancelled'].includes(contract.state))&&verified),billingAvailable:settings.available,mode:settings.available?settings.mode:'disabled',reminders:contract?(await db.query('SELECT r.day,r.due_at,r.status,m.status AS delivery_state,m.last_code FROM os_trial_reminders r LEFT JOIN mail_jobs m ON m.id=r.mail_id WHERE r.contract_id=$1 ORDER BY r.day',[contract.id])).rows:[],trialDays:7};
})));
osRoutes.post('/checkout',async(req,res)=>{
 v.body(req.body,['operationKey','planVersionId','consent']);if(req.body.consent!==true)throw badInput('Review the renewal price, dates, reminder policy and cancellation terms before authorising autopay.');const input={operationKey:v.uuid(req.body.operationKey),planVersionId:v.uuid(req.body.planVersionId)};
 await limit(req,'os-checkout',req.session.user_id,5,3600);const provider=razorpayClient(),prepared=await withCompany(req,'subscription.read',(db,ctx)=>prepareContract(db,ctx,input,provider.settings));
 if(prepared.replayed){if(!['created','trial','paid','cancelled'].includes(prepared.contract.state))throw new HttpError(409,'MANDATE_RECONCILIATION_REQUIRED','This mandate is pending or uncertain. Contact support rather than creating another.');return res.json({contract:publicContract(prepared.contract)});}
 try{
  const created=await createPaymentSession({provider,contract:prepared.contract,mapping:prepared.mapping});
  const contract=await withCompany(req,'subscription.read',async(db,ctx)=>{owner(ctx);const row=(await db.query("UPDATE os_billing_contracts SET provider_subscription_id=$1,checkout_url=$2,state='created' WHERE id=$3 AND company_id=$4 AND owner_id=$5 AND state='preparing' RETURNING *",[created.id,created.url,prepared.contract.id,ctx.companyId,ctx.userId])).rows[0];if(!row)throw new Error('MANDATE_CONTEXT_CHANGED');return row;});
  res.status(201).json({contract:publicContract(contract),message:'Open Razorpay to pay for your subscription and authorise recurring payments. Solar OS access resumes only after a verified captured subscription payment.'});
 }catch(error){await transaction(async db=>{await db.query("UPDATE os_billing_contracts SET state=CASE WHEN $2='PROVIDER_PLAN_MISMATCH' THEN 'failed' ELSE 'unknown' END WHERE id=$1 AND state='preparing'",[prepared.contract.id,error.code||'UNKNOWN']);await audit(db,{actor:prepared.contract.owner_id,company:prepared.contract.company_id,action:'commercial.mandate_creation_unconfirmed',target:prepared.contract.id});});throw error;}
});
osRoutes.post('/cancel',async(req,res)=>{
 v.body(req.body,['contractId','confirm']);const id=v.uuid(req.body.contractId);if(req.body.confirm!==true)throw badInput('Confirm stopping future automatic charges. This does not request a refund.');
 const provider=razorpayClient();const c=await withCompany(req,'subscription.read',async(db,ctx)=>{owner(ctx);const row=(await db.query('SELECT * FROM os_billing_contracts WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,ctx.companyId])).rows[0];if(!row)throw new HttpError(404,'NOT_FOUND','Subscription mandate not found.');if(row.mode!==provider.settings.mode)throw new HttpError(409,'BILLING_MODE_CHANGED','The provider mode differs from this agreement. Contact support.');if(['cancelled','cancel_requested'].includes(row.state))return row;if(!row.provider_subscription_id)throw new HttpError(409,'MANDATE_RECONCILIATION_REQUIRED','Provider status needs reconciliation before cancellation can be confirmed.');await db.query("UPDATE os_billing_contracts SET state='cancel_requested' WHERE id=$1",[id]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'commercial.mandate_cancellation_requested',target:id});return row;});
 if(['cancelled','cancel_requested'].includes(c.state))return res.json({message:c.state==='cancelled'?'Future charges stopped.':'Cancellation is awaiting provider confirmation.'});
 const result=await provider.request('POST','subscriptions/'+providerId(c.provider_subscription_id,'sub')+'/cancel',{cancel_at_cycle_end:0});
 if(result.id!==c.provider_subscription_id||result.status!=='cancelled')throw new HttpError(503,'CANCELLATION_UNCONFIRMED','Cancellation is not yet confirmed. Contact support and manage the mandate through your payment provider.');
 await withCompany(req,'subscription.read',async(db,ctx)=>{owner(ctx);await db.query("UPDATE os_billing_contracts SET state='cancelled' WHERE id=$1 AND company_id=$2",[id,ctx.companyId]);await db.query("UPDATE os_trial_reminders SET status='cancelled' WHERE contract_id=$1 AND status IN ('pending','blocked')",[id]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'commercial.mandate_cancellation_confirmed',target:id});});res.json({message:'Razorpay confirmed cancellation of future automatic charges. Existing access lasts only for its recorded period. No refund was issued.'});
});
billingAdmin.use(requireUser);billingAdmin.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
billingAdmin.get('/',async(req,res)=>res.json(await withPlatform(req,'platform.commercial.read',async db=>({freeTrial:await freeTrialConfiguration(db),mode:billingConfiguration().mode,available:billingConfiguration().available,plans:(await db.query('SELECT p.code,p.status,v.id AS version_id,v.terms,m.provider_plan_id,m.mode,m.total_count FROM commercial_plans p JOIN commercial_plan_versions v ON v.id=p.current_version_id LEFT JOIN razorpay_plan_mappings m ON m.plan_version_id=v.id ORDER BY p.created_at DESC LIMIT 30')).rows,unresolved:(await db.query("SELECT id,company_id,state,mode,consent_at FROM os_billing_contracts WHERE state IN ('preparing','unknown','cancel_requested','review_required') ORDER BY consent_at LIMIT 50")).rows}))));
billingAdmin.post('/trial-config',async(req,res)=>{
 v.body(req.body,['planVersionId','enabled','revision','reason']);const version=v.uuid(req.body.planVersionId),reason=v.text(req.body.reason,'review reason',500,10);if(typeof req.body.enabled!=='boolean'||!Number.isSafeInteger(req.body.revision)||req.body.revision<0)throw badInput('Review the trial configuration and refresh before saving.');
 await withPlatform(req,'platform.commercial.subscriptions',async(db,ctx)=>{
  await db.query("SELECT pg_advisory_xact_lock(hashtext('os-free-trial-configuration'))");
  const old=(await db.query('SELECT * FROM os_trial_configuration WHERE id=true FOR UPDATE')).rows[0];if((old?.revision||0)!==req.body.revision)throw new HttpError(409,'TRIAL_CONFIG_CHANGED','Trial configuration changed. Refresh before saving.');
  const plan=(await db.query('SELECT p.code,p.status,v.terms FROM commercial_plan_versions v JOIN commercial_plans p ON p.id=v.plan_id WHERE v.id=$1 FOR SHARE OF p',[version])).rows[0];
  if(!plan||plan.status==='inactive'||!approvedOsOffer(plan.code,plan.terms)||plan.terms.trialDays!==7)throw badInput('Choose reviewed monthly Starter/Pro/Elite scope with its approved team allowance and exactly seven trial days. Draft price/tax terms are allowed for the free trial; this does not publish them for sale.');
  await db.query('INSERT INTO os_trial_configuration(id,plan_version_id,enabled,updated_by,reason) VALUES(true,$1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET plan_version_id=excluded.plan_version_id,enabled=excluded.enabled,updated_by=excluded.updated_by,reason=excluded.reason,revision=os_trial_configuration.revision+1,updated_at=now()',[version,req.body.enabled,ctx.userId,reason]);
  await audit(db,{actor:ctx.userId,action:'commercial.free_trial_configuration_changed',target:version,metadata:{previous:old?{version:old.plan_version_id,enabled:old.enabled,revision:old.revision}:null,version,enabled:req.body.enabled,reason}});
 });res.json({message:'Free trial access scope saved. No payment provider, published price, customer trial or charge was created.'});
});
billingAdmin.post('/mapping',async(req,res)=>{
 v.body(req.body,['planVersionId','providerPlanId','totalCount','reason']);const version=v.uuid(req.body.planVersionId),providerPlan=providerId(req.body.providerPlanId,'plan'),count=req.body.totalCount,reason=v.text(req.body.reason,'review reason',500,10);if(!Number.isSafeInteger(count)||count<1||count>1000)throw badInput('Choose 1 to 1000 billing cycles.');
 const terms=await withPlatform(req,'platform.commercial.plans',async db=>{const row=(await db.query('SELECT terms FROM commercial_plan_versions WHERE id=$1',[version])).rows[0];if(!row)throw badInput('Choose a real plan version.');return row.terms;});const provider=razorpayClient(),remote=await provider.request('GET','plans/'+providerPlan);if(!planMatches(remote,terms))throw badInput('Provider plan amount, currency or interval differs from the approved application terms.');
 await withPlatform(req,'platform.commercial.plans',async(db,ctx)=>{await db.query('INSERT INTO razorpay_plan_mappings(plan_version_id,provider_plan_id,mode,total_count,created_by) VALUES($1,$2,$3,$4,$5)',[version,providerPlan,provider.settings.mode,count,ctx.userId]);await audit(db,{actor:ctx.userId,action:'commercial.razorpay_plan_mapped',target:version,metadata:{providerPlan,mode:provider.settings.mode,totalCount:count,reason}});});res.status(201).json({message:'Provider mapping verified and saved. No subscription or charge was created.'});
});
billingWebhook.post('/',raw({type:'application/json',limit:'256kb'}),async(req,res)=>{
 await limit(req,'razorpay-webhook',req.ip,600,60);const provider=razorpayClient(),settings=provider.settings;if(!settings.available)throw new HttpError(503,'BILLING_UNAVAILABLE','Billing webhook unavailable.');if(!verifyWebhook(req.body,req.get('X-Razorpay-Signature'),settings.webhook))throw new HttpError(400,'INVALID_WEBHOOK','Invalid webhook signature.');
 let event;try{event=JSON.parse(req.body.toString('utf8'));}catch{throw badInput('Invalid webhook.');}if(!['subscription.authenticated','subscription.activated','subscription.charged','subscription.cancelled','subscription.completed','subscription.halted','subscription.pending'].includes(event.event))return res.json({ignored:true});
 const id=providerId(event.payload?.subscription?.entity?.id,'sub'),eventId=v.text(req.get('X-Razorpay-Event-Id'),'event reference',200),hash=eventHash(req.body);
 const c=(await pool.query('SELECT * FROM os_billing_contracts WHERE provider_subscription_id=$1',[id])).rows[0];if(!c)throw new HttpError(409,'BILLING_CONTEXT_PENDING','Subscription is not yet associated with a confirmed application request. Retry later.');if(c.mode!==settings.mode)throw new HttpError(409,'BILLING_MODE_MISMATCH','Billing mode mismatch.');
 if((await pool.query('SELECT 1 FROM os_billing_events WHERE payload_hash=$1 OR provider_event_id=$2',[hash,eventId])).rowCount)return res.json({duplicate:true});
 const sub=await provider.request('GET','subscriptions/'+id);let payment,invoice;if(event.event==='subscription.charged'){payment=await provider.request('GET','payments/'+providerId(event.payload?.payment?.entity?.id,'pay'));invoice=await provider.request('GET','invoices/'+providerId(payment.invoice_id,'inv'));}
 const result=await transaction(async db=>{await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[c.owner_id]);const company=(await db.query('SELECT status,lifecycle FROM companies WHERE id=$1 FOR UPDATE',[c.company_id])).rows[0];const current=(await db.query('SELECT * FROM os_billing_contracts WHERE id=$1 FOR UPDATE',[c.id])).rows[0];if(company?.status!=='active'||company?.lifecycle!=='active'){await db.query("UPDATE os_billing_contracts SET state='review_required' WHERE id=$1",[c.id]);return {reviewRequired:true};}return applyVerifiedProviderEvent({db,contract:current,event:{...event,mode:settings.mode},providerSubscription:sub,payment,invoice,eventId,hash});});res.json(result);
});

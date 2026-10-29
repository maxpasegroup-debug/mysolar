import {randomUUID,createHash} from 'node:crypto';
import {audit} from '../db/pool.js';
import {HttpError} from '../errors.js';
import {renewalAmount,providerId,safeCheckout} from './razorpay.js';
export function trialDates(now=new Date()){const start=new Date(Math.floor(now.getTime()/1000)*1000);return {start,end:new Date(start.getTime()+7*86400000),reminders:[5,6,7].map(day=>({day,due:new Date(start.getTime()+(day-1)*86400000)}))};}
export function planMatches(plan,terms){return plan?.item?.currency==='INR'&&plan.item.amount===renewalAmount(terms)&&plan.period===(terms.interval==='annual'?'yearly':'monthly')&&plan.interval===1;}
export function approvedOsOffer(code,terms){const capacities={starter:10,pro:25,elite:50};return Object.hasOwn(capacities,code)&&terms.interval==='monthly'&&terms.limits?.team===capacities[code];}
export function publicContract(row){return row?{id:row.id,state:row.state,mode:row.mode,purpose:row.purpose||'legacy_trial_mandate',trialStart:row.trial_start,trialEnd:row.trial_end,terms:row.terms,checkoutUrl:row.state==='created'?row.checkout_url:null}:null;}
export async function prepareContract(db,ctx,{operationKey,planVersionId},settings){
 if(ctx.role!=='owner')throw new HttpError(403,'OWNER_REQUIRED','Only the owner can authorise the company subscription.');
 if(!settings.available)throw new HttpError(503,'BILLING_UNAVAILABLE','Razorpay subscriptions are not configured. No payment or autopay mandate was created.');
 if(!(await db.query("SELECT 1 FROM users WHERE id=$1 AND status='active' AND email_verified_at IS NOT NULL",[ctx.userId])).rowCount)throw new HttpError(403,'EMAIL_VERIFICATION_REQUIRED','Verify your owner email before authorising recurring billing.');
 const old=(await db.query('SELECT * FROM os_billing_contracts WHERE company_id=$1 AND operation_key=$2',[ctx.companyId,operationKey])).rows[0];
 if(old){if(old.owner_id!==ctx.userId||old.plan_version_id!==planVersionId)throw new HttpError(409,'BILLING_REQUEST_CHANGED','This request belongs to different approved terms.');return {contract:old,replayed:true};}
 if((await db.query('SELECT status FROM companies WHERE id=$1',[ctx.companyId])).rows[0]?.status!=='active')throw new HttpError(403,'COMPANY_SUSPENDED','Company access is suspended. Contact the platform team.');
 if(ctx.lifecycle!=='active')throw new HttpError(409,'COMPANY_NOT_ACTIVE','Complete company setup and activation review before subscribing.');
 if(!(await db.query('SELECT 1 FROM company_os_enrolment WHERE company_id=$1',[ctx.companyId])).rowCount)throw new HttpError(409,'EXISTING_ACCESS_POLICY','This company uses an existing access agreement. Contact the platform team before changing its terms.');
 const trial=(await db.query('SELECT * FROM company_subscriptions WHERE company_id=$1 AND trial_granted ORDER BY created_at,id LIMIT 1',[ctx.companyId])).rows[0];
 if(!trial||Date.parse(trial.end_at)>Date.now())throw new HttpError(409,'TRIAL_NOT_FINISHED','Your free trial needs no autopay. Review plans now and subscribe after its recorded end.');
 const current=(await db.query('SELECT s.* FROM company_commercial_state cs JOIN company_subscriptions s ON s.id=cs.current_subscription_id AND s.company_id=cs.company_id WHERE cs.company_id=$1',[ctx.companyId])).rows[0];
 if(current&&['active','trial'].includes(current.status)&&Date.parse(current.end_at)>Date.now())throw new HttpError(409,'CURRENT_ACCESS_EXISTS','A current agreement already provides access. Review that agreement instead of buying again.');
 if((await db.query("SELECT 1 FROM os_billing_contracts WHERE company_id=$1 AND state NOT IN ('failed','cancelled') LIMIT 1",[ctx.companyId])).rowCount)throw new HttpError(409,'MANDATE_RECONCILIATION_REQUIRED','Review your existing subscription request before creating another.');
 const row=(await db.query("SELECT p.id AS plan_id,p.code,v.id AS version_id,v.terms,m.provider_plan_id,m.mode,m.total_count FROM commercial_plans p JOIN commercial_plan_versions v ON v.id=p.current_version_id JOIN razorpay_plan_mappings m ON m.plan_version_id=v.id WHERE v.id=$1 AND p.status='active' FOR SHARE OF p",[planVersionId])).rows[0];
 if(!row||!approvedOsOffer(row.code,row.terms)||row.mode!==settings.mode||Date.parse(row.terms.effectiveFrom)>Date.now()||row.terms.effectiveTo&&Date.parse(row.terms.effectiveTo)<=Date.now())throw new HttpError(409,'PLAN_UNAVAILABLE','Select a reviewed, active monthly plan with its approved team allowance, and a matching provider configuration.');renewalAmount(row.terms);
 const cfg=(await db.query('SELECT * FROM commercial_settings_versions WHERE effective_at<=now() ORDER BY effective_at DESC,id DESC LIMIT 1')).rows[0];if(!cfg)throw new HttpError(503,'COMMERCIAL_UNAVAILABLE','Commercial settings are unavailable.');
 const revision=(await db.query('SELECT revision FROM company_commercial_state WHERE company_id=$1',[ctx.companyId])).rows[0]?.revision||0;
 const id=randomUUID();const contract=(await db.query(`INSERT INTO os_billing_contracts(id,company_id,owner_id,operation_key,plan_id,plan_version_id,terms,setup_terms,settings_version_id,commercial_revision,mode,state,trial_start,trial_end,purpose,consent_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'preparing',$12,$13,'post_trial_subscription','os-paid-v2') RETURNING *`,[id,ctx.companyId,ctx.userId,operationKey,row.plan_id,row.version_id,row.terms,cfg.data.setupFee,cfg.id,revision,settings.mode,trial.start_at,trial.end_at])).rows[0];
 await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'commercial.subscription_consent_recorded',target:id,metadata:{planVersion:row.version_id,mode:settings.mode,priorTrialEnd:trial.end_at,consentVersion:'os-paid-v2'}});
 return {contract,mapping:row,replayed:false};
}
export async function createProviderContract(provider,contract,mapping){
 const plan=await provider.request('GET','plans/'+providerId(mapping.provider_plan_id,'plan'));if(!planMatches(plan,contract.terms))throw new HttpError(409,'PROVIDER_PLAN_MISMATCH','The mapped provider price or billing interval differs from the approved plan.');
 const paid=contract.purpose==='post_trial_subscription';
 const sub=await provider.request('POST','subscriptions',{plan_id:mapping.provider_plan_id,total_count:mapping.total_count,quantity:1,customer_notify:true,...(paid?{}:{start_at:Math.floor(new Date(contract.trial_end).getTime()/1000)}),expire_by:Math.floor(Date.now()/1000)+900,notes:{mysolar_contract_id:contract.id}});
 providerId(sub.id,'sub');if(sub.plan_id!==mapping.provider_plan_id||sub.status!=='created'||!paid&&sub.start_at!==Math.floor(new Date(contract.trial_end).getTime()/1000))throw new HttpError(502,'BILLING_RESULT_UNKNOWN','The provider mandate could not be matched. Contact support; do not create another.');return {id:sub.id,url:safeCheckout(sub.short_url)};
}
export async function assignAccessPeriod(db,c,status,start,end,trial){
 const id=randomUUID(),previous=(await db.query('SELECT s.* FROM company_commercial_state cs JOIN company_subscriptions s ON s.id=cs.current_subscription_id AND s.company_id=cs.company_id WHERE cs.company_id=$1',[c.company_id])).rows[0];
 if(previous)await db.query("UPDATE company_subscriptions SET status=CASE WHEN end_at<=now() THEN 'expired' ELSE 'cancelled' END,revision=revision+1 WHERE id=$1",[previous.id]);
 const trialReason=c.id?'Legacy verified trial mandate. No paid renewal recorded.':'Owner activated a seven-day free trial. No payment or autopay authorisation.';
 await db.query(`INSERT INTO company_subscriptions(id,company_id,plan_id,plan_version_id,terms,setup_terms,settings_version_id,status,start_at,end_at,trial_granted,activation_source,created_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[id,c.company_id,c.plan_id,c.plan_version_id,c.terms,c.setup_terms,c.settings_version_id,status,start,end,trial,trial?'owner_trial':'razorpay_verified',c.owner_id,trial?trialReason:'Verified captured Razorpay subscription invoice.']);
 const state=(await db.query('INSERT INTO company_commercial_state(company_id,current_subscription_id) VALUES($1,$2) ON CONFLICT(company_id) DO UPDATE SET current_subscription_id=$2,revision=company_commercial_state.revision+1 RETURNING revision',[c.company_id,id])).rows[0];
 if(c.id)await db.query('UPDATE os_billing_contracts SET commercial_revision=$1 WHERE id=$2',[state.revision,c.id]);
 await db.query('INSERT INTO commercial_subscription_events(company_id,subscription_id,actor_id,action,previous,new_values,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[c.company_id,id,c.owner_id,trial?'owner_trial_activated':'razorpay_charge_verified',previous||null,{status,start,end,contract:c.id},trial?trialReason:'Captured provider invoice, not a browser success callback.']);
 await audit(db,{actor:c.owner_id,company:c.company_id,action:trial?'commercial.trial_activated':'commercial.paid_period_verified',target:id,metadata:{contract:c.id,status,start,end}});
 return id;
}
export function capturedInvoice(invoice,payment,c){
 return payment?.status==='captured'&&payment.currency==='INR'&&payment.amount===renewalAmount(c.terms)&&invoice?.status==='paid'&&invoice.currency==='INR'&&invoice.amount_paid===payment.amount&&invoice.payment_id===payment.id&&payment.invoice_id===invoice.id&&(!invoice.subscription_id||invoice.subscription_id===c.provider_subscription_id)&&Number.isSafeInteger(invoice.billing_start)&&Number.isSafeInteger(invoice.billing_end)&&invoice.billing_end>invoice.billing_start&&invoice.billing_start>=Math.floor(new Date(c.trial_end).getTime()/1000);
}
export async function processBillingEvent({db,contract:c,event,providerSubscription:sub,payment,invoice,eventId,hash,now=Date.now()}){
 if(!['created','authenticated','active','pending','halted','cancelled','completed','paused'].includes(sub.status))throw new Error('BILLING_PROVIDER_STATE_INVALID');
 const inserted=await db.query('INSERT INTO os_billing_events(payload_hash,provider_event_id,contract_id,kind) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING payload_hash',[hash,eventId,c.id,event.event]);if(!inserted.rowCount)return {duplicate:true};
 if(c.mode!==event.mode)throw new Error('BILLING_MODE_MISMATCH');
 const mapped=(await db.query('SELECT provider_plan_id FROM razorpay_plan_mappings WHERE plan_version_id=$1',[c.plan_version_id])).rows[0];if(!mapped||sub.id!==c.provider_subscription_id||sub.plan_id!==mapped.provider_plan_id||c.purpose!=='post_trial_subscription'&&sub.start_at!==Math.floor(new Date(c.trial_end).getTime()/1000))throw new Error('BILLING_PROVIDER_CONTEXT_MISMATCH');
 if(event.event==='subscription.charged'){
  if(!capturedInvoice(invoice,payment,c))throw new Error('BILLING_CAPTURE_NOT_VERIFIED');
  const recorded=await db.query('INSERT INTO os_billing_payments(provider_payment_id,contract_id,amount_paise,currency,period_start,period_end) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING provider_payment_id',[payment.id,c.id,payment.amount,payment.currency,new Date(invoice.billing_start*1000),new Date(invoice.billing_end*1000)]);if(!recorded.rowCount)return {duplicate:true};
 }
 const state=(await db.query('SELECT revision FROM company_commercial_state WHERE company_id=$1',[c.company_id])).rows[0];if((state?.revision||0)!==c.commercial_revision){await db.query("UPDATE os_billing_contracts SET state='review_required' WHERE id=$1",[c.id]);await audit(db,{actor:c.owner_id,company:c.company_id,action:'commercial.provider_event_requires_review',target:c.id});return {reviewRequired:true};}
 if(event.event==='subscription.charged'){
  const current=(await db.query('SELECT s.end_at FROM company_commercial_state cs JOIN company_subscriptions s ON s.id=cs.current_subscription_id WHERE cs.company_id=$1',[c.company_id])).rows[0];
  if(!current||new Date(current.end_at).getTime()<invoice.billing_end*1000)await assignAccessPeriod(db,c,'active',new Date(invoice.billing_start*1000),new Date(invoice.billing_end*1000),false);
  if(!['cancelled','cancel_requested'].includes(c.state))await db.query("UPDATE os_billing_contracts SET state='paid' WHERE id=$1",[c.id]);return {captured:true};
 }
 if(['cancelled','completed'].includes(sub.status)){
  await db.query("UPDATE os_billing_contracts SET state='cancelled' WHERE id=$1",[c.id]);await db.query("UPDATE os_trial_reminders SET status='cancelled' WHERE contract_id=$1 AND status IN ('pending','blocked')",[c.id]);await audit(db,{actor:c.owner_id,company:c.company_id,action:'commercial.mandate_stopped',target:c.id});return {cancelled:true};
 }
 if(c.purpose!=='post_trial_subscription'&&['created','preparing','unknown'].includes(c.state)&&['authenticated','active'].includes(sub.status)&&new Date(c.trial_end).getTime()>now){
  if((await db.query('SELECT 1 FROM company_subscriptions WHERE company_id=$1 AND trial_granted',[c.company_id])).rowCount)throw new Error('TRIAL_ALREADY_GRANTED');
  await assignAccessPeriod(db,c,'trial',c.trial_start,c.trial_end,true);await db.query("UPDATE os_billing_contracts SET state='trial' WHERE id=$1",[c.id]);
  for(const {day,due} of trialDates(new Date(c.trial_start)).reminders)await db.query('INSERT INTO os_trial_reminders(contract_id,day,due_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[c.id,day,due]);return {trial:true};
 }
 // Failure events do not claim money received or grant additional access.
 await audit(db,{actor:c.owner_id,company:c.company_id,action:'commercial.provider_state_observed',target:c.id,metadata:{providerStatus:sub.status}});return {observed:true};
}
export const eventHash=raw=>createHash('sha256').update(raw).digest('hex');

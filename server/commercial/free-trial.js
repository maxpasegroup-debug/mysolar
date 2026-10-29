import {HttpError} from '../errors.js';
import {audit} from '../db/pool.js';
import {approvedOsOffer,assignAccessPeriod,trialDates} from './os-billing.js';

export async function freeTrialConfiguration(db){
 const row=(await db.query(`SELECT t.revision,t.enabled,t.plan_version_id,p.code,p.status,v.terms FROM os_trial_configuration t JOIN commercial_plan_versions v ON v.id=t.plan_version_id JOIN commercial_plans p ON p.id=v.plan_id WHERE t.id=true`)).rows[0];
 const valid=Boolean(row?.enabled&&row.status!=='inactive'&&approvedOsOffer(row.code,row.terms)&&row.terms.trialDays===7);
 return {configured:valid,revision:row?.revision||0,versionId:row?.plan_version_id||null,name:row?.terms?.name||null,features:valid?row.terms.features:{},limits:valid?row.terms.limits:{}};
}
// Caller must hold the existing authenticated user/company locks (withCompany).
// There is no provider, mail, token/price input or payment operation in this path.
export async function startFreeTrial(db,ctx,versionId,{now=new Date()}={}){
 if(ctx.role!=='owner')throw new HttpError(403,'OWNER_REQUIRED','Only the company owner can start its free trial.');
 if((await db.query('SELECT status FROM companies WHERE id=$1',[ctx.companyId])).rows[0]?.status!=='active')throw new HttpError(403,'COMPANY_SUSPENDED','Company access is suspended. Contact the platform team.');
 if(ctx.lifecycle!=='active')throw new HttpError(409,'COMPANY_NOT_ACTIVE','Complete company setup and activation review before starting your seven-day trial.');
 if(!(await db.query("SELECT 1 FROM users WHERE id=$1 AND status='active' AND email_verified_at IS NOT NULL",[ctx.userId])).rowCount)throw new HttpError(403,'EMAIL_VERIFICATION_REQUIRED','Verify your owner email first.');
 if(!(await db.query('SELECT 1 FROM company_os_enrolment WHERE company_id=$1',[ctx.companyId])).rowCount)throw new HttpError(409,'EXISTING_ACCESS_POLICY','This company has an existing access policy. Ask the platform team before changing its agreement.');
 const previous=(await db.query('SELECT s.* FROM company_subscriptions s WHERE company_id=$1 ORDER BY created_at DESC,id LIMIT 1',[ctx.companyId])).rows[0];
 if(previous){
  const current=(await db.query('SELECT current_subscription_id FROM company_commercial_state WHERE company_id=$1',[ctx.companyId])).rows[0];
  if(current?.current_subscription_id===previous.id&&previous.trial_granted&&previous.plan_version_id===versionId&&previous.status==='trial'&&Date.parse(previous.start_at)<=now.getTime()&&Date.parse(previous.end_at)>now.getTime())return {id:previous.id,start:previous.start_at,end:previous.end_at,replayed:true};
  throw new HttpError(409,'TRIAL_ALREADY_USED','A trial or agreement already exists. Trials cannot be restarted; choose a subscription to continue after expiry.');
 }
 if((await db.query("SELECT 1 FROM os_billing_contracts WHERE company_id=$1 AND state<>'failed' LIMIT 1",[ctx.companyId])).rowCount)throw new HttpError(409,'AGREEMENT_REVIEW_REQUIRED','An existing mandate needs review before trial access can change.');
 const row=(await db.query(`SELECT t.plan_version_id,t.enabled,p.id AS plan_id,p.code,p.status,v.terms FROM os_trial_configuration t JOIN commercial_plan_versions v ON v.id=t.plan_version_id JOIN commercial_plans p ON p.id=v.plan_id WHERE t.id=true FOR SHARE OF t,p`)).rows[0];
 if(!row?.enabled||row.plan_version_id!==versionId||row.status==='inactive'||!approvedOsOffer(row.code,row.terms)||row.terms.trialDays!==7)throw new HttpError(409,'TRIAL_NOT_CONFIGURED','The platform trial scope is not configured or changed. Refresh or contact support.');
 const cfg=(await db.query('SELECT * FROM commercial_settings_versions WHERE effective_at<=now() ORDER BY effective_at DESC,id DESC LIMIT 1')).rows[0];if(!cfg)throw new HttpError(503,'COMMERCIAL_UNAVAILABLE','Trial access configuration is unavailable.');
 const dates=trialDates(now),c={id:null,company_id:ctx.companyId,owner_id:ctx.userId,plan_id:row.plan_id,plan_version_id:row.plan_version_id,terms:row.terms,setup_terms:cfg.data.setupFee,settings_version_id:cfg.id};
 const id=await assignAccessPeriod(db,c,'trial',dates.start,dates.end,true);
 await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'commercial.free_trial_started',target:id,metadata:{planVersion:row.plan_version_id,start:dates.start,end:dates.end,autopay:false}});
 return {id,start:dates.start,end:dates.end,replayed:false};
}

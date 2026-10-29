import {HttpError} from '../errors.js';
export function accessFromRow(row,now=Date.now()){
 if(!row?.managed)return {managed:false,unlocked:true,hadAccess:true,status:'existing_policy'};
 const unlocked=['trial','active'].includes(row.status)&&Date.parse(row.start_at)<=now&&Date.parse(row.end_at)>now;
 const trial=row.status==='trial',start=Date.parse(row.start_at),end=Date.parse(row.end_at);
 return {managed:true,unlocked,hadAccess:Boolean(row.had_access),status:unlocked?row.status:row.status?'expired_or_restricted':'trial_required',trialStart:trial?row.start_at:null,trialEnd:trial?row.end_at:null,trialDay:trial&&now>=start?Math.min(7,Math.floor((now-start)/86400000)+1):null,renewalReminder:trial&&unlocked&&now>=start+4*86400000,serverNow:new Date(now).toISOString()};
}
export async function osAccess(db,company){return accessFromRow((await db.query(`SELECT EXISTS(SELECT 1 FROM company_os_enrolment WHERE company_id=$1) AS managed,s.status,s.start_at,s.end_at,EXISTS(SELECT 1 FROM company_subscriptions WHERE company_id=$1) AS had_access FROM (SELECT 1) x LEFT JOIN company_commercial_state cs ON cs.company_id=$1 LEFT JOIN company_subscriptions s ON s.id=cs.current_subscription_id AND s.company_id=$1`,[company])).rows[0]);}
export function freeOsPath(path){return path===''||/^(?:os(?:\/|$)|subscription(?:\/|$)|setup(?:\/|$)|onboarding(?:\/|$)|branding(?:\/|$)|service-areas(?:\/|$)|marketplace-request(?:\/|$))/.test(path);}
export async function osGate(db,ctx,req){
 const a=await osAccess(db,ctx.companyId);if(!a.managed)return false;
 const path=req.originalUrl.split('?')[0].replace(/\/{2,}/g,'/').replace(/^\/api\/companies\/current\/?/,'');
 if(freeOsPath(path))return true;
 if(a.unlocked)return false;
 if(path.includes('/revoke')||/^members\//.test(path)&&['suspended','removed'].includes(req.body?.status)||/^offers\//.test(path)&&['unpublish','deactivate'].includes(req.body?.action)||/^domains\//.test(path)&&['suspend','remove'].includes(req.body?.action))return false;
 if(['GET','HEAD'].includes(req.method)&&(a.hadAccess||/^enquiries(?:\/|$)/.test(path)||['operations/notifications','audit','members','team'].includes(path)))return false;
 throw new HttpError(403,'OS_ACTIVATION_REQUIRED','Activate an eligible seven-day trial or subscription to use Solar OS. Your approved public marketplace listing remains separate; existing authorised records stay readable after expiry.');
}

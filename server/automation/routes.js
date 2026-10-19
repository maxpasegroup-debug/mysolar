import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {requireUser,csrf} from '../auth/sessions.js';
import {withCompany} from '../tenancy/context.js';
import {withCustomer} from '../purchase/service.js';
import {policy,requireFeature} from '../commercial/policy.js';
import {audit} from '../db/pool.js';
import {HttpError,badInput} from '../errors.js';
import * as v from '../validation.js';
import {reminders} from './catalogue.js';

export const automation=Router(),reminderPreferences=Router();
automation.use(requireUser);automation.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
reminderPreferences.use(requireUser);reminderPreferences.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
const active=ctx=>{if(ctx.lifecycle!=='active')throw new HttpError(409,'COMPANY_INACTIVE','Activate the company before approving reminders.');};
automation.get('/',async(req,res)=>{v.body(req.query,['page'],[]);const page=Number(req.query.page||1);if(!Number.isSafeInteger(page)||page<1||page>10000)throw badInput('Invalid page.');res.json(await withCompany(req,'automation.read',async(db,ctx)=>{
 const rules=(await db.query('SELECT id,kind,enabled,customers,email_enabled,hour_ist,lead_days,revision,approved_at FROM automation_rules WHERE company_id=$1 ORDER BY kind',[ctx.companyId])).rows;
 const jobs=(await db.query('SELECT id,kind,record_id,audience,channel,status,attempts,last_error,created_at,available_at,finished_at FROM automation_jobs WHERE company_id=$1 ORDER BY created_at DESC,id LIMIT 20 OFFSET $2',[ctx.companyId,(page-1)*20])).rows;
 const counts=(await db.query('SELECT status,count(*)::int AS count FROM automation_jobs WHERE company_id=$1 GROUP BY status',[ctx.companyId])).rows;
 const attempts=(await db.query('SELECT a.job_id,a.attempt,a.outcome,a.code,a.created_at FROM automation_attempts a JOIN automation_jobs j ON j.id=a.job_id WHERE j.company_id=$1 ORDER BY a.id DESC LIMIT 30',[ctx.companyId])).rows;
 const worker=(await db.query("SELECT last_finished_at,last_status FROM automation_worker_state WHERE worker='reminders'")).rows[0];
 return {catalogue:Object.entries(reminders).map(([kind,d])=>({kind,label:d.label,recordKind:d.recordKind,message:d.message,feature:d.feature})),rules,jobs,counts,attempts,page,pageSize:20,total:counts.reduce((n,x)=>n+x.count,0),canManage:ctx.permissions.includes('automation.manage'),worker:worker||null,channel:'in_app',timezone:'Asia/Kolkata',deliveryMeaning:'Delivered means stored in MY SOLAR, not read by the recipient. Email is separately queued only for approved rules and opted-in verified recipients; SMTP acceptance does not confirm inbox receipt. SMS and WhatsApp are unavailable.'};
}));});
automation.put('/rules/:kind',async(req,res)=>{
 const kind=v.choice(req.params.kind,Object.keys(reminders),'reminder type');v.body(req.body,['revision','enabled','customers','email','hour','leadDays','confirm','reason'],['revision','enabled','customers','hour','leadDays','confirm','reason']);
 const d={...req.body,email:req.body.email??false};if(typeof d.email!=='boolean')throw badInput();if(!Number.isSafeInteger(d.revision)||d.revision<0||typeof d.enabled!=='boolean'||typeof d.customers!=='boolean'||!Number.isInteger(d.hour)||d.hour<8||d.hour>18||!Number.isInteger(d.leadDays)||d.leadDays<0||d.leadDays>14||d.confirm!==true)throw badInput('Review and confirm the exact reminder settings. Use a sending hour from 8 to 18 India time.');
 const reason=v.text(d.reason,'reason',300,10);if(kind==='followup'&&d.customers||!['quotation','milestone','maintenance','renewal'].includes(kind)&&d.leadDays!==0)throw badInput('Lead follow-ups are staff-only. Advance days are available for quotations and installation schedules.');
 res.json(await withCompany(req,'automation.manage',async(db,ctx)=>{
  if(d.enabled){active(ctx);if(!ctx.permissions.includes(reminders[kind].permission))throw new HttpError(403,'PERMISSION_DENIED','Your role cannot approve reminders for this module.');requireFeature(await policy(db,ctx.companyId),reminders[kind].feature);}
  const old=(await db.query('SELECT * FROM automation_rules WHERE company_id=$1 AND kind=$2 FOR UPDATE',[ctx.companyId,kind])).rows[0];
  if((old?.revision||0)!==d.revision)throw new HttpError(409,'REMINDER_RULE_CHANGED','The settings changed. Refresh and review again.');
  const id=old?.id||randomUUID(),revision=d.revision+1;
  await db.query(`INSERT INTO automation_rules(id,company_id,kind,enabled,customers,hour_ist,lead_days,revision,approved_by,approved_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10) ON CONFLICT(company_id,kind) DO UPDATE SET enabled=excluded.enabled,customers=excluded.customers,hour_ist=excluded.hour_ist,lead_days=excluded.lead_days,revision=excluded.revision,approved_by=excluded.approved_by,approved_at=now(),reason=excluded.reason,cursor_id=NULL,cursor_day=NULL,last_planned_at=NULL`,[id,ctx.companyId,kind,d.enabled,d.customers,d.hour,d.leadDays,revision,ctx.userId,reason]);
  await db.query('UPDATE automation_rules SET email_enabled=$1 WHERE id=$2',[d.email,id]);
  await db.query("UPDATE automation_jobs SET status='cancelled',claim_token=NULL,lease_until=NULL,last_error='APPROVAL_CHANGED',finished_at=now() WHERE rule_id=$1 AND company_id=$2 AND status IN ('pending','retry','running')",[id,ctx.companyId]);
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:d.enabled?'automation.rule_approved':'automation.rule_paused',target:id,metadata:{kind,previous:old?{email:old.email_enabled,enabled:old.enabled,customers:old.customers,hour:old.hour_ist,leadDays:old.lead_days,revision:old.revision}:null,next:{email:d.email,enabled:d.enabled,customers:d.customers,hour:d.hour,leadDays:d.leadDays,revision},reason}});
  return {message:d.enabled?'Reminder rule approved. A running worker will schedule eligible in-app reminders. No record or payment status will change.':'Rule paused. Unfinished jobs for the prior approval were cancelled.',revision};
 }));
});
automation.post('/jobs/:id/retry',async(req,res)=>{const id=v.uuid(req.params.id);v.body(req.body,['confirm','reason']);if(req.body.confirm!==true)throw badInput('Confirm retrying this reminder.');const reason=v.text(req.body.reason,'retry reason',300,10);res.json(await withCompany(req,'automation.manage',async(db,ctx)=>{
 active(ctx);const job=(await db.query('SELECT * FROM automation_jobs WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,ctx.companyId])).rows[0];if(!job)throw new HttpError(404,'NOT_FOUND','Reminder not found.');if(job.status!=='dead')throw new HttpError(409,'REMINDER_NOT_FAILED','Only exhausted deliveries can be retried. Delivered and skipped jobs are never replayed.');
 const rule=(await db.query('SELECT enabled,revision FROM automation_rules WHERE id=$1 AND company_id=$2',[job.rule_id,ctx.companyId])).rows[0];if(!rule?.enabled||rule.revision!==job.rule_revision)throw badInput('This reminder approval changed. Review the current rule.');requireFeature(await policy(db,ctx.companyId),reminders[job.kind].feature);
 if(!(await db.query("SELECT 1 WHERE $1::date=(now() AT TIME ZONE 'Asia/Kolkata')::date",[job.occurrence])).rowCount)throw badInput('This occurrence has ended. Wait for the next eligible reminder.');
 await db.query("UPDATE automation_jobs SET status='retry',attempts=0,available_at=now(),last_error=NULL,finished_at=NULL WHERE id=$1",[id]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'automation.retry_approved',target:id,metadata:{reason}});return {message:'Retry approved for the same delivery identity. The worker will recheck all access and preferences.'};
}));});
reminderPreferences.get('/',async(req,res)=>{v.body(req.query,[]);res.json(await withCustomer(req,'customer.profile',async(db,user)=>{const row=(await db.query('SELECT enabled,kinds,email_enabled,updated_at FROM reminder_preferences WHERE user_id=$1',[user.id])).rows[0];return {email:row?.email_enabled??false,enabled:row?.enabled??true,kinds:row?.kinds??Object.keys(reminders),catalogue:Object.entries(reminders).map(([kind,d])=>({kind,label:d.label})),channel:'in_app; email only with separate consent and approval',description:'Optional reminders respect your selected channels. Existing account, order and security updates remain available.'};}));});
reminderPreferences.put('/',async(req,res)=>{v.body(req.body,['enabled','kinds','email'],['enabled','kinds']);const d={...req.body,email:req.body.email??false};if(typeof d.email!=='boolean')throw badInput();if(typeof d.enabled!=='boolean'||!Array.isArray(d.kinds)||d.kinds.length>Object.keys(reminders).length||new Set(d.kinds).size!==d.kinds.length||d.kinds.some(kind=>!Object.hasOwn(reminders,kind)))throw badInput('Choose valid reminder preferences.');res.json(await withCustomer(req,'customer.profile',async(db,user)=>{await db.query('INSERT INTO reminder_preferences(user_id,enabled,kinds) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,kinds=excluded.kinds,updated_at=now()',[user.id,d.enabled,d.kinds]);await db.query('UPDATE reminder_preferences SET email_enabled=$1 WHERE user_id=$2',[d.email,user.id]);await audit(db,{actor:user.id,action:'automation.preferences_updated',target:user.id,metadata:{enabled:d.enabled,email:d.email,kinds:d.kinds}});return {message:'Your automated reminder preferences were saved.'};}));});

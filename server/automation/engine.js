import {quotationStaffAccess,quotationCustomer} from './quotation-scope.js';
import {config} from '../config.js';
import {enqueueMail} from '../mail-queue.js';
import {randomUUID} from 'node:crypto';
import {transaction,audit} from '../db/pool.js';
import {permissionsFor,companyPermissions} from '../permissions.js';
import {policy,enabled} from '../commercial/policy.js';
import {requireStaffEntitlement} from '../commercial/growth.js';
import * as operations from '../operations/core.js';
import {reminders,dueCondition} from './catalogue.js';

const log=(db,job,outcome,code)=>db.query('INSERT INTO automation_attempts(job_id,attempt,outcome,code) VALUES($1,$2,$3,$4)',[job.id,job.attempts,outcome,code]);
const day=async db=>(await db.query("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day")).rows[0].day;
async function member(db,companyId,userId){const row=(await db.query("SELECT m.role_id FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.user_id=$2 AND m.status='active' AND u.status='active'",[companyId,userId])).rows[0];if(!row)return null;return {companyId,userId,role:row.role_id,permissions:await companyPermissions(db,row.role_id,companyId,userId)};}
async function source(db,rule,recordId=null,after=null){const d=reminders[rule.kind];return (await db.query(`SELECT r.*,r.${d.date}::text AS ${d.date} FROM ${d.table} r WHERE r.company_id=$1 AND ($2::uuid IS NULL OR r.id=$2) AND ${dueCondition(rule.kind)} AND ($4::uuid IS NULL OR r.id>$4) ORDER BY r.id LIMIT 100 ${recordId?'FOR SHARE':''}`,[rule.company_id,recordId,rule.lead_days,after])).rows;}
async function customerId(db,kind,row){return kind==='quotation'?await quotationCustomer(db,row):(await db.query('SELECT user_id FROM company_contacts WHERE id=$1 AND company_id=$2',[row.contact_id,row.company_id])).rows[0]?.user_id;}
async function allowedRecipient(db,rule,row,userId,audience){
 const d=reminders[rule.kind];
 const preference=(await db.query('SELECT enabled,kinds FROM reminder_preferences WHERE user_id=$1 FOR SHARE',[userId])).rows[0];
 if(preference&&(!preference.enabled||!preference.kinds.includes(rule.kind)))return false;
 if(audience==='customer'&&rule.kind==='milestone'&&!(await db.query("SELECT 1 FROM project_milestones WHERE company_id=$1 AND project_id=$2 AND customer_visible AND status NOT IN ('done','not_applicable') LIMIT 1",[rule.company_id,row.id])).rowCount)return false;
 if(audience==='customer'&&d.staffOnly)return false;
 if(audience==='customer')return rule.customers&&d.customerPermission&&(rule.kind!=='quotation'||(await permissionsFor(db,'customer')).includes('customer.enquiries.own'))&&(await permissionsFor(db,'customer')).includes(d.customerPermission)&&await customerId(db,rule.kind,row)===userId;
 const ctx=await member(db,rule.company_id,userId);if(!ctx)return false;
 const assigned=d.assignee&&row[d.assignee]===userId;
 const projectAssignment=['milestone','stage'].includes(rule.kind)&&(await db.query('SELECT 1 FROM project_assignments WHERE project_id=$1 AND company_id=$2 AND user_id=$3',[row[d.target||'id'],rule.company_id,userId])).rowCount>0;
 if(ctx.role!=='owner'&&!assigned&&!projectAssignment)return false;
 try{await requireStaffEntitlement(db,ctx.companyId,ctx.role);}catch(error){if(error.status)return false;throw error;}
 if(rule.kind==='quotation')return quotationStaffAccess(ctx.permissions,row);
 try{operations.readPermission(ctx,d.recordKind);}catch(error){if(error.status)return false;throw error;}
 const b=new operations.Bindings(),where=operations.scope(ctx,d.recordKind,b);where.push(`r.id=${b.add(['maintenance','renewal'].includes(rule.kind)?row.order_id:row[d.target||'id'])}`);
 return (await db.query(`SELECT 1 FROM ${operations.definitions[d.recordKind][0]} r WHERE ${where.join(' AND ')}`,b.values)).rowCount>0;
}

// Called inside a transaction. Company-before-rule locking matches interactive changes.
export async function planRule(db,id){
 const initial=(await db.query('SELECT company_id FROM automation_rules WHERE id=$1',[id])).rows[0];if(!initial)return 0;
 const company=(await db.query('SELECT status,lifecycle FROM companies WHERE id=$1 FOR UPDATE',[initial.company_id])).rows[0];
 const rule=(await db.query('SELECT *,cursor_day::text FROM automation_rules WHERE id=$1 FOR UPDATE SKIP LOCKED',[id])).rows[0];if(!rule?.enabled)return 0;
 const today=await day(db);let queued=0;
 if(company.status==='active'&&company.lifecycle==='active'&&enabled(await policy(db,rule.company_id),reminders[rule.kind].feature)){
  const rows=await source(db,rule,null,rule.cursor_day===today?rule.cursor_id:null);
  for(const row of rows){
   const recipients=(await db.query(`SELECT m.user_id FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.status='active' AND u.status='active' AND (m.role_id='owner' OR m.user_id=$2 ${['milestone','stage'].includes(rule.kind)?'OR EXISTS(SELECT 1 FROM project_assignments p WHERE p.company_id=m.company_id AND p.project_id=$3 AND p.user_id=m.user_id)':''}) ORDER BY m.user_id LIMIT 200`,['milestone','stage'].includes(rule.kind)?[rule.company_id,row[reminders[rule.kind].assignee],row[reminders[rule.kind].target||'id']]:[rule.company_id,reminders[rule.kind].assignee?row[reminders[rule.kind].assignee]:null])).rows.map(x=>({id:x.user_id,audience:'staff'}));
   if(rule.customers){const customer=await customerId(db,rule.kind,row);if(customer&&!recipients.some(x=>x.id===customer))recipients.push({id:customer,audience:'customer'});}
   for(const recipient of recipients){if(!await allowedRecipient(db,rule,row,recipient.id,recipient.audience))continue;
    queued+=(await db.query(`INSERT INTO automation_jobs(id,company_id,rule_id,rule_revision,kind,record_id,recipient_id,audience,occurrence,source_date,available_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,($9::date+make_time($11,0,0)) AT TIME ZONE 'Asia/Kolkata') ON CONFLICT(company_id,kind,record_id,recipient_id,channel,occurrence) DO NOTHING RETURNING id`,[randomUUID(),rule.company_id,rule.id,rule.revision,rule.kind,row.id,recipient.id,recipient.audience,today,row[reminders[rule.kind].date],rule.hour_ist])).rowCount;
   }
  }
  await db.query('UPDATE automation_rules SET cursor_day=$1,cursor_id=$2,last_planned_at=now() WHERE id=$3',[today,rows.length===100?rows.at(-1).id:null,id]);
 }else await db.query('UPDATE automation_rules SET last_planned_at=now() WHERE id=$1',[id]);
 return queued;
}
export async function claim(db){
 const abandoned=(await db.query("SELECT * FROM automation_jobs WHERE status='running' AND lease_until<now() ORDER BY lease_until,id LIMIT 50 FOR UPDATE SKIP LOCKED")).rows;
 for(const job of abandoned){const status=job.attempts>=5?'dead':'retry';await db.query('UPDATE automation_jobs SET status=$1,lease_until=NULL,claim_token=NULL,available_at=now(),last_error=$2,finished_at=CASE WHEN $1=\'dead\' THEN now() ELSE NULL END WHERE id=$3',[status,'WORKER_LEASE_EXPIRED',job.id]);await log(db,job,'lease_expired','WORKER_LEASE_EXPIRED');}
 const job=(await db.query("SELECT * FROM automation_jobs WHERE status IN ('pending','retry') AND available_at<=now() AND attempts<5 ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!job)return null;
 const result=(await db.query("UPDATE automation_jobs SET status='running',attempts=attempts+1,claim_token=$1,lease_until=now()+interval '2 minutes' WHERE id=$2 RETURNING *,occurrence::text,source_date::text",[randomUUID(),job.id])).rows[0];await log(db,result,'claimed','CLAIMED');return result;
}
async function finish(db,job,status,code){await db.query('UPDATE automation_jobs SET status=$1,last_error=$2,lease_until=NULL,claim_token=NULL,finished_at=now() WHERE id=$3',[status,code,job.id]);await log(db,job,status,code);return status;}
export async function deliver(db,claimed,{afterNotification=async()=>{}}={}){
 const initial=(await db.query('SELECT approved_by FROM automation_rules WHERE id=$1 AND company_id=$2',[claimed.rule_id,claimed.company_id])).rows[0];
 // Match request lock order: users, company, then reminder rows. Lock no unrelated tenant.
 const users=(await db.query('SELECT id,status FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[[claimed.recipient_id,initial?.approved_by].filter(Boolean)])).rows;
 const company=(await db.query('SELECT status,lifecycle FROM companies WHERE id=$1 FOR UPDATE',[claimed.company_id])).rows[0];
 const job=(await db.query("SELECT *,occurrence::text,source_date::text FROM automation_jobs WHERE id=$1 AND status='running' AND claim_token=$2 AND lease_until>now() FOR UPDATE",[claimed.id,claimed.claim_token])).rows[0];if(!job)return 'claim_changed';
 const rule=(await db.query('SELECT * FROM automation_rules WHERE id=$1 AND company_id=$2 FOR SHARE',[job.rule_id,job.company_id])).rows[0];
 if(!rule?.enabled||rule.kind!==job.kind||rule.revision!==job.rule_revision)return finish(db,job,'cancelled','APPROVAL_CHANGED');
 const approver=await member(db,job.company_id,rule.approved_by);
 if(!approver?.permissions.includes('automation.manage')||!approver.permissions.includes(reminders[job.kind].permission)||company.status!=='active'||company.lifecycle!=='active'||!enabled(await policy(db,job.company_id),reminders[job.kind].feature))return finish(db,job,'skipped','ACCESS_UNAVAILABLE');
 if(job.occurrence!==await day(db)||!users.some(x=>x.id===job.recipient_id&&x.status==='active'))return finish(db,job,'skipped','STALE_OR_DISABLED');
 const row=(await source(db,rule,job.record_id))[0];if(!row||row[reminders[job.kind].date]!==job.source_date)return finish(db,job,'skipped','SOURCE_CHANGED');
 if(!await allowedRecipient(db,rule,row,job.recipient_id,job.audience))return finish(db,job,'skipped','PREFERENCE_OR_ACCESS');
 const d=reminders[job.kind],notificationId=job.id;
 if(job.kind==='quotation')await db.query('INSERT INTO workflow_notifications(id,user_id,company_id,enquiry_id,version_id,message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[notificationId,job.recipient_id,job.audience==='staff'?job.company_id:null,row.enquiry_id,row.id,'Reminder: '+d.message]);
 else await db.query('INSERT INTO operations_notifications(id,user_id,company_id,record_type,record_id,message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[notificationId,job.recipient_id,job.audience==='staff'?job.company_id:null,d.recordKind,['maintenance','renewal'].includes(job.kind)?row.order_id:row[d.target||'id'],'Reminder: '+d.message]);
 if(rule.email_enabled&&config.mailEnabled&&config.dataEncryptionKey){const recipient=(await db.query('SELECT u.email FROM users u JOIN reminder_preferences p ON p.user_id=u.id WHERE u.id=$1 AND u.email_verified_at IS NOT NULL AND p.email_enabled AND p.enabled',[job.recipient_id])).rows[0];if(recipient&&! (await db.query("SELECT 1 FROM mail_jobs WHERE kind='reminder' AND reference_hash=$1",[job.id])).rowCount)await enqueueMail(db,{kind:'reminder',userId:job.recipient_id,companyId:job.company_id,email:recipient.email,referenceHash:job.id,subject:'MY Solar reminder: '+d.label,text:'A saved reminder is available. Sign in to review the authorized source record: '+config.origin+'/#/'+(job.audience==='staff'?'distributor':'customer')+'/notifications',expiresAt:new Date(Date.now()+6*3600000)});}
 await afterNotification(); // Dependency injection for rollback/recovery integration tests only.
 await db.query("INSERT INTO automation_deliveries(job_id,notification_id,channel) VALUES($1,$2,'in_app') ON CONFLICT(job_id) DO NOTHING",[job.id,notificationId]);
 await audit(db,{actor:rule.approved_by,company:job.company_id,action:'automation.reminder_delivered',target:job.id,metadata:{kind:job.kind,channel:'in_app'}});
 return finish(db,job,'delivered','DELIVERED');
}
export async function fail(db,claimed){
 const job=(await db.query("SELECT * FROM automation_jobs WHERE id=$1 AND status='running' AND claim_token=$2 FOR UPDATE",[claimed.id,claimed.claim_token])).rows[0];if(!job)return;
 const status=job.attempts>=5?'dead':'retry',seconds=Math.min(3600,30*2**(job.attempts-1));
 await db.query('UPDATE automation_jobs SET status=$1,last_error=$2,lease_until=NULL,claim_token=NULL,available_at=now()+make_interval(secs=>$3),finished_at=CASE WHEN $1=\'dead\' THEN now() ELSE NULL END WHERE id=$4',[status,'DELIVERY_FAILED',seconds,job.id]);await log(db,job,status,'DELIVERY_FAILED');
}
export async function tick({run=transaction,limit=50,deliveryOptions}={}){
 if(!Number.isInteger(limit)||limit<1||limit>200)throw new Error('Invalid worker batch size');
 await run(db=>db.query("INSERT INTO automation_worker_state(worker,last_started_at,last_status) VALUES('reminders',now(),'running') ON CONFLICT(worker) DO UPDATE SET last_started_at=now(),last_status='running'"));
 try{
  const ids=await run(async db=>(await db.query('SELECT id FROM automation_rules WHERE enabled ORDER BY last_planned_at NULLS FIRST,id LIMIT 20')).rows);
  let planned=0;for(const row of ids)planned+=await run(db=>planRule(db,row.id));
  let processed=0;for(;processed<limit;processed++){const job=await run(claim);if(!job)break;try{await run(db=>deliver(db,job,deliveryOptions));}catch{await run(db=>fail(db,job));}}
  await run(db=>db.query("UPDATE automation_worker_state SET last_finished_at=now(),last_status='ok' WHERE worker='reminders'"));return {planned,processed};
 }catch(error){try{await run(db=>db.query("UPDATE automation_worker_state SET last_finished_at=now(),last_status='failed' WHERE worker='reminders'"));}catch{}throw error;}
}

export async function emailStillAuthorized(db,mail){const j=(await db.query("SELECT *,occurrence::text,source_date::text FROM automation_jobs WHERE id=$1 AND recipient_id=$2 AND company_id=$3 AND status='delivered'",[mail.reference_hash,mail.user_id,mail.company_id])).rows[0];if(!j)return false;const rule=(await db.query('SELECT * FROM automation_rules WHERE id=$1 AND company_id=$2',[j.rule_id,j.company_id])).rows[0];const user=(await db.query("SELECT 1 FROM users u JOIN reminder_preferences p ON p.user_id=u.id WHERE u.id=$1 AND u.email=$2 AND u.status='active' AND u.email_verified_at IS NOT NULL AND p.enabled AND p.email_enabled",[mail.user_id,mail.recipient])).rowCount;const company=(await db.query('SELECT status,lifecycle FROM companies WHERE id=$1',[mail.company_id])).rows[0];if(!user||!rule?.enabled||!rule.email_enabled||rule.revision!==j.rule_revision||company?.status!=='active'||company?.lifecycle!=='active'||j.occurrence!==await day(db)||!enabled(await policy(db,mail.company_id),reminders[j.kind].feature))return false;const approver=await member(db,mail.company_id,rule.approved_by);if(!approver?.permissions.includes('automation.manage')||!approver.permissions.includes(reminders[j.kind].permission))return false;const row=(await source(db,rule,j.record_id))[0];return Boolean(row&&row[reminders[j.kind].date]===j.source_date&&await allowedRecipient(db,rule,row,mail.user_id,j.audience));}

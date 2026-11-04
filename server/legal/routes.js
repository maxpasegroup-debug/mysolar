import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {pool,transaction,audit} from '../db/pool.js';
import {csrf,requireUser,lockedUser} from '../auth/sessions.js';
import {withPlatform} from '../platform/routes.js';
import {withCompany} from '../tenancy/context.js';
import {limit} from '../auth/security.js';
import {badInput,HttpError} from '../errors.js';
import * as v from '../validation.js';
import {publicCatalogue} from './catalogue.js';
import {acceptDocuments,marketingPreference,marketingAllowed} from './service.js';

export const legal=Router();
legal.get('/documents',(req,res)=>res.json(publicCatalogue()));
legal.use(requireUser);
legal.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
legal.get('/receipts/:digest',async(req,res)=>{
 if(!/^[a-f0-9]{64}$/.test(req.params.digest))throw badInput();
 v.body(req.query,['company'],[]);const company=req.query.company===undefined?null:v.uuid(req.query.company);
 const snapshot=await transaction(async db=>{const user=await lockedUser(db,req);return (await db.query("SELECT metadata,created_at,company_id FROM audit_events WHERE actor_user_id=$1 AND action='legal.accepted' AND metadata->>'digest'=$2 AND company_id IS NOT DISTINCT FROM $3::uuid ORDER BY id LIMIT 1",[user.id,req.params.digest,company])).rows[0];});
 if(!snapshot)throw new HttpError(404,'NOT_FOUND','Your policy receipt was not found.');
 res.set('Content-Disposition','attachment; filename="my-solar-policy-'+req.params.digest+'.json"').json(snapshot);
});
legal.get('/me',async(req,res)=>res.json(await transaction(async db=>{
 v.body(req.query,['page'],[]);const page=req.query.page===undefined?1:Number(req.query.page);if(!Number.isSafeInteger(page)||page<1||page>10000)throw badInput();
 const user=await lockedUser(db,req);
 const receipts=(await db.query("SELECT metadata->>'key' AS key,metadata->>'digest' AS digest,metadata->>'version' AS version,company_id,created_at FROM audit_events WHERE actor_user_id=$1 AND action='legal.accepted' ORDER BY id DESC LIMIT 50",[user.id])).rows;
 const grievances=(await db.query("SELECT g.target_id AS id,g.metadata,g.created_at,coalesce((SELECT e.metadata FROM audit_events e WHERE e.action='legal.grievance_updated' AND e.target_id=g.target_id ORDER BY e.id DESC LIMIT 1),'{\"state\":\"submitted\"}'::jsonb) AS progress FROM audit_events g WHERE g.actor_user_id=$1 AND g.action='legal.grievance_submitted' ORDER BY g.id DESC LIMIT 30 OFFSET $2",[user.id,(page-1)*30])).rows;
 return {receipts,marketingEmail:await marketingAllowed(db,user.id),grievances,accountType:user.account_type,page,hasNext:grievances.length===30};
})));
legal.post('/accept',async(req,res)=>{
 v.body(req.body,['documents','confirm']);if(req.body.confirm!==true)throw badInput('Explicit agreement is required.');
 await limit(req,'legal-accept',req.session.user_id,20,3600);
 res.json(await transaction(async db=>{const user=await lockedUser(db,req);return acceptDocuments(db,user.id,user.account_type,req.body.documents);}));
});
legal.post('/marketing',async(req,res)=>{
 v.body(req.body,['enabled']);await limit(req,'marketing-preference',req.session.user_id,20,3600);
 res.json(await transaction(async db=>{const user=await lockedUser(db,req);return marketingPreference(db,user.id,req.body.enabled);}));
});
export async function companyLegalAcceptance(req,res){
 v.body(req.body,['documents','confirm']);if(req.body.confirm!==true)throw badInput('Explicit company-owner agreement is required.');
 await limit(req,'legal-company-accept',req.session.user_id,20,3600);
 res.json(await withCompany(req,'company.onboarding.manage',async(db,ctx)=>{
  if(ctx.role!=='owner')throw new HttpError(403,'OWNER_REQUIRED','Only the current company owner can record its agreement.');
  return acceptDocuments(db,ctx.userId,'business',req.body.documents,{companyId:ctx.companyId});
 }));
}
export function grievanceDeadlines(now=new Date()){
 const acknowledgedBy=new Date(now.getTime()+48*3600000),resolvedBy=new Date(now),day=now.getUTCDate();resolvedBy.setUTCDate(1);resolvedBy.setUTCMonth(resolvedBy.getUTCMonth()+1);const last=new Date(Date.UTC(resolvedBy.getUTCFullYear(),resolvedBy.getUTCMonth()+1,0)).getUTCDate();resolvedBy.setUTCDate(Math.min(day,last));return {acknowledgedBy:acknowledgedBy.toISOString(),resolvedBy:resolvedBy.toISOString()};
}
legal.get('/grievances/:id/receipt',async(req,res)=>{
 const id=v.uuid(req.params.id);const record=await transaction(async db=>{
  const user=await lockedUser(db,req);const original=(await db.query("SELECT metadata,created_at FROM audit_events WHERE action='legal.grievance_submitted' AND actor_user_id=$1 AND target_id=$2 ORDER BY id LIMIT 1",[user.id,id])).rows[0];
  if(!original)throw new HttpError(404,'NOT_FOUND','Your grievance was not found.');
  const updates=(await db.query("SELECT metadata,created_at FROM audit_events WHERE action='legal.grievance_updated' AND target_id=$1 ORDER BY id",[id])).rows;
  const {operationKey,...details}=original.metadata;return {id,submittedAt:original.created_at,details,updates};
 });res.set('Content-Disposition','attachment; filename="my-solar-grievance-'+id+'.json"').json(record);
});
legal.post('/grievances',async(req,res)=>{
 v.body(req.body,['category','reference','message','operationKey']);
 const category=v.choice(req.body.category,['account','privacy','subscription','seller','branded_web','other'],'issue type'),reference=v.text(req.body.reference,'record reference',120,0),message=v.text(req.body.message,'issue description',1200,10),key=v.uuid(req.body.operationKey);
 await limit(req,'legal-grievance',req.session.user_id,10,86400);
 res.status(201).json(await transaction(async db=>{
  const user=await lockedUser(db,req);await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['grievance:'+user.id+':'+key]);
  const previous=(await db.query("SELECT target_id,metadata FROM audit_events WHERE actor_user_id=$1 AND action='legal.grievance_submitted' AND metadata->>'operationKey'=$2 LIMIT 1",[user.id,key])).rows[0];
  if(previous){if(previous.metadata.category!==category||previous.metadata.reference!==reference||previous.metadata.message!==message)throw new HttpError(409,'REQUEST_CHANGED','This request identifier was already used with different details.');return {id:previous.target_id,replayed:true,message:'Your existing grievance is recorded. Resolution is not yet confirmed.'};}
  const id=randomUUID();await audit(db,{actor:user.id,action:'legal.grievance_submitted',target:id,metadata:{operationKey:key,category,reference,message,...grievanceDeadlines()}});return {id,replayed:false,message:'Your grievance was recorded. This confirms intake only; acknowledgment by an officer and resolution are pending.'};
 }));
});
export const legalAdmin=Router();legalAdmin.use(requireUser);legalAdmin.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
legalAdmin.get('/grievances',async(req,res)=>res.json(await withPlatform(req,'platform.audit.read',async db=>{
 v.body(req.query,['page'],[]);const page=req.query.page===undefined?1:Number(req.query.page);if(!Number.isSafeInteger(page)||page<1||page>10000)throw badInput();
 return {page,items:(await db.query("SELECT g.target_id AS id,g.metadata,g.created_at,coalesce((SELECT e.metadata FROM audit_events e WHERE e.target_id=g.target_id AND e.action='legal.grievance_updated' ORDER BY e.id DESC LIMIT 1),'{\"state\":\"submitted\"}'::jsonb) AS progress FROM audit_events g WHERE g.action='legal.grievance_submitted' ORDER BY g.id DESC LIMIT 30 OFFSET $1",[(page-1)*30])).rows};
})));
legalAdmin.post('/grievances/:id',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['state','message','expectedState']);const state=v.choice(req.body.state,['acknowledged','investigating','resolved','reopened'],'grievance state'),message=v.text(req.body.message,'customer-visible update',1000,5);
 res.json(await withPlatform(req,'platform.commercial.settings',async(db,ctx)=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['grievance-status:'+id]);
  if(!(await db.query("SELECT 1 FROM audit_events WHERE target_id=$1 AND action='legal.grievance_submitted'",[id])).rowCount)throw new HttpError(404,'NOT_FOUND','Grievance not found.');
  const previous=(await db.query("SELECT metadata->>'state' AS state FROM audit_events WHERE target_id=$1 AND action='legal.grievance_updated' ORDER BY id DESC LIMIT 1",[id])).rows[0]?.state||'submitted';
  if(req.body.expectedState!==previous)throw new HttpError(409,'REVISION_CONFLICT','The grievance changed. Refresh before updating.');
  const allowed={submitted:['acknowledged'],acknowledged:['investigating','resolved'],investigating:['resolved'],resolved:['reopened'],reopened:['investigating','resolved']};if(!allowed[previous]?.includes(state))throw badInput('Acknowledge a request before investigating or resolving it.');
  await audit(db,{actor:ctx.userId,action:'legal.grievance_updated',target:id,metadata:{previous,state,message}});return {state};
 }));
});

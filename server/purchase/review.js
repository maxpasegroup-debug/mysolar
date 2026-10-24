import {salesPolicy} from '../people-sales.js';
import {companyPermissions} from '../permissions.js';
import {decimal} from './money.js';
import {audit} from '../db/pool.js';
import {HttpError,badInput} from '../errors.js';
const conflict=message=>new HttpError(409,'QUOTATION_REVIEW_REQUIRED',message);
export async function reviewRequirement(db,ctx,q,items){
 const policy=await salesPolicy(db,ctx.companyId);
 const members=(await db.query('SELECT p.discount_limit_bps FROM company_memberships m JOIN company_role_profiles p ON p.id=m.role_profile_id AND p.company_id=m.company_id WHERE m.company_id=$1 AND m.user_id=ANY($2::uuid[]) AND p.active',[ctx.companyId,[ctx.userId,q.created_by]])).rows;
 const limit=Math.min(policy.discount_limit_bps,...members.map(m=>m.discount_limit_bps??10000));
 let gross=0n,discount=0n,exceeds=false;
 for(const x of items){const quantity=decimal(String(x.quantity),3,'quantity',999999999999n),unit=BigInt(x.unit_price_paise??x.unitPricePaise),amount=(quantity*unit+500n)/1000n,d=BigInt(x.discount_paise??x.discountPaise);gross+=amount;discount+=d;if(d*10000n>amount*BigInt(limit))exceeds=true;}
 return {required:policy.require_review||exceeds,exceedsDiscount:exceeds,limitBps:limit,grossPaise:String(gross),discountPaise:String(discount),policyRevision:policy.revision,reviewStatus:q.review_status,approvalRevision:q.approval_revision,reviewerId:q.reviewer_id};
}
export async function enforceQuoteReview(db,ctx,q,items){
 const r=await reviewRequirement(db,ctx,q,items);if(!r.required)return r;
 if(q.review_status!=='approved'||q.approval_revision!==q.revision||q.reviewed_policy_revision!==r.policyRevision)throw conflict('Submit this exact draft for approval before sending. Its content, policy or discount requires review.');
 const member=(await db.query("SELECT m.role_id FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.user_id=$2 AND m.status='active' AND u.status='active'",[ctx.companyId,q.reviewer_id])).rows[0];
 if(!member||!(await companyPermissions(db,member.role_id,ctx.companyId,q.reviewer_id)).includes('quotations.approve')||q.reviewer_id===q.created_by&&!(q.approval_override&&member.role_id==='owner'))throw conflict('The recorded reviewer is no longer authorised. Request approval again.');
 return r;
}
export async function reviewDraft(db,ctx,q,action,why){
 if(q.status!=='draft')throw conflict('Only private drafts can enter internal review.');
 if(typeof why!=='string'||why.trim().length<10||why.length>300)throw badInput('Record a review reason between 10 and 300 characters.');
 const policy=await salesPolicy(db,ctx.companyId),approve=['approve','override'].includes(action);
 if(action==='submit'){if(!ctx.permissions.includes('quotations.manage'))throw new HttpError(403,'PERMISSION_DENIED','Quotation drafting permission is required.');}
 else{
  if(!ctx.permissions.includes('quotations.approve'))throw new HttpError(403,'PERMISSION_DENIED','Quotation approval permission is required.');
  if(q.review_status!=='pending')throw conflict('The draft must be submitted for review first.');
  if(action==='override'){if(ctx.role!=='owner')throw new HttpError(403,'PERMISSION_DENIED','Only the owner may explicitly override independent review.');}
  else if(q.created_by===ctx.userId)throw conflict('Ask another authorised reviewer, or use the explicit owner override with a reason.');
 }
 const next=action==='submit'?'pending':approve?'approved':'rejected',nextRevision=q.revision+1;
 await db.query('UPDATE quotation_versions SET review_status=$1,revision=revision+1,approval_revision=$2,reviewed_policy_revision=$3,reviewer_id=$4,approval_override=$5 WHERE id=$6 AND company_id=$7',[next,approve?nextRevision:null,approve?policy.revision:null,approve?ctx.userId:null,action==='override',q.id,ctx.companyId]);
 await db.query('INSERT INTO quotation_review_events(company_id,version_id,actor_id,action,quote_revision,policy_revision,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[ctx.companyId,q.id,ctx.userId,action,nextRevision,policy.revision,why.trim()]);
 await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'quotation.review_'+action,target:q.id,metadata:{previous:q.review_status,next,revision:nextRevision,policyRevision:policy.revision,reason:why.trim()}});
 if(action==='submit')await db.query(`INSERT INTO workflow_notifications(id,user_id,company_id,enquiry_id,version_id,message) SELECT gen_random_uuid(),m.user_id,m.company_id,$1,$2,'A private quotation is awaiting authorised review.' FROM company_memberships m WHERE m.company_id=$3 AND m.status='active' AND (m.role_id='owner' OR EXISTS(SELECT 1 FROM company_role_profiles p WHERE p.id=m.role_profile_id AND p.company_id=m.company_id AND p.active AND 'quotations.approve'=ANY(p.permissions) AND 'quotations.read'=ANY(p.permissions)))`,[q.enquiry_id,q.id,ctx.companyId]);
 return {id:q.id,message:action==='submit'?'Draft submitted for internal review. It has not been sent to the customer.':approve?'Approval recorded for this exact draft revision and policy. It has not been sent.':'Draft rejected. Edit it and submit again.'};
}

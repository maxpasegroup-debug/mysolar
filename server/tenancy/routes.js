import {resolveBusinessPreset} from '../setup/presets.js';
import {requireBusiness} from '../auth/account-type.js';
import {requireNoOutstandingWork,ensureWorkPermissions} from '../operations/work-handoffs.js';
import {validateRoleProfile} from '../people-sales.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { transaction, audit } from '../db/pool.js';
import { lockedUser, requireUser, csrf } from '../auth/sessions.js';
import { limit } from '../auth/security.js';
import { withCompany } from './context.js';
import { permissionsFor, staffRoles, modulePermissions } from '../permissions.js';
import { HttpError, badInput } from '../errors.js';
import * as v from '../validation.js';
import { editable,markChanged } from '../setup/service.js';
import { teamCapacity } from '../commercial/policy.js';
import {requireStaffEntitlement,PART_TIME_ROLE} from '../commercial/growth.js';
export const companies=Router();
companies.use(requireUser);
companies.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));

const companyFields='id,name,city,business_email,phone,storefront_description,storefront_published';
companies.post('/',async(req,res)=>{
  await limit(req,'company-create',req.session.user_id,5,86400);
  const input=v.body(req.body,['name','city','email','phone','businessType','businessPreset'],['name','city','email','phone']);
  const {businessType,businessPreset}=resolveBusinessPreset(input.businessType,input.businessPreset);
  const name=v.text(input.name,'company name'),city=v.text(input.city,'city'),email=v.email(input.email),phone=v.phone(input.phone);
  const company=await transaction(async db=>{
    const user=await lockedUser(db,req);requireBusiness(user);const id=randomUUID();
    const result=await db.query(`INSERT INTO companies(id,name,city,business_email,phone,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${companyFields}`,[id,name,city,email,phone,user.id]);
    await db.query('UPDATE company_profiles SET business_type=$1,business_preset=$3 WHERE company_id=$2',[businessType,id,businessPreset]);
    // Ownership is granted only by this atomic, server-controlled creation path.
    await db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES($1,$2,$3,'owner')",[randomUUID(),id,user.id]);
    await db.query('UPDATE sessions SET active_company_id=$1 WHERE token_hash=$2',[id,req.session.token_hash]);
    await audit(db,{actor:user.id,company:id,action:'company.created',target:id,metadata:{businessType,businessPreset}});
    return result.rows[0];
  });
  res.status(201).json({company});
});
companies.post('/select',async(req,res)=>{
  const input=v.body(req.body,['companyId']);const id=v.uuid(input.companyId);
  await transaction(async db=>{
    const user=await lockedUser(db,req);
    const allowed=await db.query(`SELECT m.id FROM company_memberships m JOIN companies c ON c.id=m.company_id WHERE m.company_id=$1 AND m.user_id=$2 AND m.status='active' AND (c.status='active' OR m.role_id='owner') FOR SHARE OF m,c`,[id,user.id]);
    if(!allowed.rowCount)throw new HttpError(403,'COMPANY_ACCESS_DENIED','You do not have access to this company.');
    await db.query('UPDATE sessions SET active_company_id=$1 WHERE token_hash=$2',[id,req.session.token_hash]);
    await audit(db,{actor:user.id,company:id,action:'session.company_selected',target:id});
  });res.json({message:'Active company updated.'});
});
companies.get('/current',async(req,res)=>res.json(await withCompany(req,'company.read',async(db,ctx)=>{
  const result=await db.query(`SELECT ${companyFields} FROM companies WHERE id=$1`,[ctx.companyId]);
  return {company:result.rows[0],role:ctx.role,permissions:ctx.permissions};
})));
companies.patch('/current',async(req,res)=>{
  const input=v.body(req.body,['name','city','email','phone','description','published']);
  const values=[v.text(input.name,'company name'),v.text(input.city,'city'),v.email(input.email),v.phone(input.phone),v.description(input.description)];
  if(typeof input.published!=='boolean')throw badInput();
  res.json(await withCompany(req,'company.manage',async(db,ctx)=>{
    const company=(await db.query('SELECT * FROM companies WHERE id=$1',[ctx.companyId])).rows[0];editable(company);
    if(input.published)throw new HttpError(403,'PUBLICATION_REQUIRES_APPROVAL','Marketplace publication requires a platform approval and publication decision.');
    await db.query('UPDATE companies SET name=$1,city=$2,business_email=$3,phone=$4,storefront_description=$5 WHERE id=$6',[...values,ctx.companyId]);
    await db.query('UPDATE company_branding SET description=$1 WHERE company_id=$2',[values[4],ctx.companyId]);
    await db.query('UPDATE company_onboarding SET profile_saved_at=NULL WHERE company_id=$1',[ctx.companyId]);
    await markChanged(db,ctx,company,'company.profile_updated');
    const result=await db.query(`SELECT ${companyFields} FROM companies WHERE id=$1`,[ctx.companyId]);
    return {company:result.rows[0],message:'Profile saved. Complete the onboarding profile before requesting review.'};
  }));
});
companies.get('/current/members',async(req,res)=>res.json(await withCompany(req,'members.read',async(db,ctx)=>{
  const rows=await db.query(`SELECT m.id,u.display_name AS name,u.email,m.role_id AS role,m.status FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 ORDER BY m.created_at`,[ctx.companyId]);
  return {members:rows.rows,assignableRoles:staffRoles};
})));
companies.post('/current/members',async(req,res)=>{
  const input=v.body(req.body,['email','role','profileId'],['email','role']);const email=v.email(input.email),role=v.choice(input.role,staffRoles,'company role');
  await limit(req,'member-add',req.session.user_id,30,3600);
  res.status(201).json(await withCompany(req,'members.manage',async(db,ctx)=>{
    if(role===PART_TIME_ROLE)throw new HttpError(400,'INVITATION_REQUIRED','Invite part-time executives through Team so they can accept their assigned access.');
    const user=await db.query("SELECT id FROM users WHERE email=$1 AND status='active' AND (account_type='business' OR account_type IS NULL)",[email]);
    if(user.rowCount!==1)throw new HttpError(400,'MEMBER_UNAVAILABLE','This account cannot be added. Ask the person to register first and confirm their account email.');
    const existing=await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[ctx.companyId,user.rows[0].id]);
    if(existing.rowCount)throw new HttpError(409,'MEMBER_EXISTS','This account already has a membership. Update that membership instead.');
    await teamCapacity(db,ctx.companyId);
    const id=randomUUID(),profile=await validateRoleProfile(db,ctx.companyId,role,input.profileId);
    await db.query('INSERT INTO company_memberships(id,company_id,user_id,role_id,role_profile_id) VALUES($1,$2,$3,$4,$5)',[id,ctx.companyId,user.rows[0].id,role,profile]);
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'membership.created',target:id,metadata:{role}});
    return {message:'Company membership created.'};
  }));
});
companies.patch('/current/members/:membershipId',async(req,res)=>{
  const id=v.uuid(req.params.membershipId);const input=v.body(req.body,['role','status']);
  const role=v.choice(input.role,staffRoles,'company role'),status=v.choice(input.status,['active','suspended','removed'],'membership status');
  res.json(await withCompany(req,'members.manage',async(db,ctx)=>{
    const member=await db.query('SELECT id,user_id,role_id,status FROM company_memberships WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,ctx.companyId]);
    if(!member.rowCount)throw new HttpError(404,'NOT_FOUND','Membership not found.');
    if(member.rows[0].role_id==='owner')throw new HttpError(403,'OWNER_PROTECTED','Owner changes require a separate ownership-transfer workflow.');
    if(role!==member.rows[0].role_id&&(role===PART_TIME_ROLE||member.rows[0].role_id===PART_TIME_ROLE))throw new HttpError(409,'ROLE_TRANSFER_REQUIRED','Part-time sales access cannot be converted into a broader role here. Suspend or remove access and use a separately reviewed invitation.');
    if(status==='active')await requireStaffEntitlement(db,ctx.companyId,role);
    if(status==='active'&&member.rows[0].status!=='active')await teamCapacity(db,ctx.companyId);
    if(status!=='active')await requireNoOutstandingWork(db,ctx,member.rows[0].user_id);else if(role!==member.rows[0].role_id)await ensureWorkPermissions(db,ctx,member.rows[0].user_id,await permissionsFor(db,role));
    await db.query('UPDATE company_memberships SET role_id=$1,status=$2,updated_at=now() WHERE id=$3 AND company_id=$4',[role,status,id,ctx.companyId]);
    // Membership is checked on every request. Session retrieval clears a revoked selection.
    // Avoid taking another user's session lock here; that would invert the authorization lock order.
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'membership.updated',target:id,metadata:{role,status}});
    return {message:'Membership updated.'};
  }));
});
companies.get('/current/audit',async(req,res)=>res.json(await withCompany(req,'audit.read',async(db,ctx)=>{
  const result=await db.query("SELECT id,action,target_id,metadata,created_at FROM audit_events WHERE company_id=$1 AND action NOT LIKE 'commercial.%' ORDER BY id DESC LIMIT 50",[ctx.companyId]);
  return {events:result.rows};
})));
companies.get('/current/modules/:module',async(req,res)=>{
  const module=req.params.module;let permission=modulePermissions[module];
  if(!permission)throw new HttpError(404,'NOT_FOUND','Module not found.');
  // Assigned installations is a narrower capability, never a substitute for company-wide records.
  if(module==='projects')permission='workspace.read';
  res.json(await withCompany(req,permission,async(db,ctx)=>{
    if(ctx.lifecycle!=='active')throw new HttpError(409,'COMPANY_NOT_ACTIVE','Company activation is required before accessing operational modules.');
    if(module==='projects'&&!ctx.permissions.includes('projects.read')&&!ctx.permissions.includes('projects.assigned.read'))throw new HttpError(403,'PERMISSION_DENIED','Your role does not allow access to installations.');
    return {module,enabled:false,scope:ctx.permissions.includes('projects.assigned.read')?'assigned':'company',message:'Operational workflows will be implemented in a later phase.'};
  }));
});
export async function platformAudit(req,res) {
  res.json(await transaction(async db=>{
    const user=await lockedUser(db,req);
    const grant=await db.query('SELECT role_id FROM platform_admin_grants WHERE user_id=$1 FOR SHARE',[user.id]);
    if(!grant.rowCount||!(await permissionsFor(db,grant.rows[0].role_id)).includes('platform.audit.read'))throw new HttpError(403,'PLATFORM_ACCESS_DENIED','Platform administrator access is required.');
    const events=await db.query('SELECT id,action,created_at FROM audit_events WHERE company_id IS NULL ORDER BY id DESC LIMIT 50');
    return {events:events.rows};
  }));
}

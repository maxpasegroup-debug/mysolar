import {requireBusiness,requireCustomer} from '../auth/account-type.js';
import {validateRoleProfile} from '../people-sales.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { transaction,audit } from '../db/pool.js';
import { requireUser,csrf,lockedUser } from '../auth/sessions.js';
import { randomToken,digest,limit } from '../auth/security.js';
import { withCompany } from '../tenancy/context.js';
import { staffRoles } from '../permissions.js';
import * as v from '../validation.js';
import { HttpError } from '../errors.js';
import { teamCapacity } from '../commercial/policy.js';
import {requireStaffEntitlement} from '../commercial/growth.js';
import {staffDetails} from './staff.js';
import {deliveryChoice,deliverInvitation,invitationUrl} from './invitation-delivery.js';
import {acceptCustomerInvitation} from '../operations/customer-invitations.js';
export const invitations=Router();
invitations.use(['/companies/current/invitations','/invitations/accept','/invitations/customer/accept','/invitations/preview'],requireUser);
invitations.use(['/companies/current/invitations','/invitations/accept','/invitations/customer/accept','/invitations/preview'],(req,res,next)=>req.method==='GET'?next():csrf(req,res,next));
invitations.post('/invitations/preview',async(req,res)=>{
 v.body(req.body,['token','kind']);const kind=v.choice(req.body.kind,['customer','employee'],'invitation type'),token=v.text(req.body.token,'invitation',43,43);
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new HttpError(400,'INVALID_INVITATION','Open a valid invitation link.');
 await limit(req,'invite-preview',req.session.user_id,30,900);
 res.json(await transaction(async db=>{
  const user=await lockedUser(db,req);if(kind==='employee')requireBusiness(user);else requireCustomer(user);
  const table=kind==='customer'?'customer_access_invitations':'company_invitations';
  const result=await db.query(`SELECT c.name AS company_name,i.expires_at,${kind==='customer'?"'customer'::text":"i.role_id"} AS role
    FROM ${table} i JOIN companies c ON c.id=i.company_id
    WHERE i.token_hash=$1 AND i.email=$2 AND i.status='pending' AND i.expires_at>now() AND c.status='active'
    ${kind==='customer'?"AND c.lifecycle='active' AND EXISTS(SELECT 1 FROM company_contacts x WHERE x.id=i.contact_id AND x.company_id=i.company_id AND x.user_id IS NULL AND lower(x.email)=i.email AND x.revision=i.contact_revision)":''}
    AND EXISTS(SELECT 1 FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=i.company_id AND m.user_id=i.invited_by AND m.status='active' AND u.status='active'
      AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id=$3)
      ${kind==='customer'?"AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id='members.manage')":''})`,[digest(token),user.email,kind==='customer'?'customers.manage':'invitations.manage']);
  if(!result.rowCount)throw new HttpError(400,'INVALID_INVITATION','This invitation is unavailable, changed, expired or belongs to another email. Sign in with the invited email or ask the company for a new link.');
  return {kind,...result.rows[0]};
 }));
});
invitations.get('/companies/current/invitations',async(req,res)=>res.json(await withCompany(req,'members.read',async(db,ctx)=>{
  const rows=await db.query(`SELECT id,email,role_id AS role,CASE WHEN status='pending' AND expires_at<=now() THEN 'expired' ELSE status END AS status,delivery,expires_at,created_at FROM company_invitations WHERE company_id=$1 ORDER BY created_at DESC LIMIT 100`,[ctx.companyId]);
  return {invitations:rows.rows,deliveryMode:config.invitationDelivery,available:true,emailAvailable:config.mailEnabled&&Boolean(config.dataEncryptionKey),assignableRoles:staffRoles};
})));
invitations.post('/companies/current/invitations',async(req,res)=>{
  v.body(req.body,['email','role','delivery','staffDetails','profileId'],['email','role']);const email=v.email(req.body.email),role=v.choice(req.body.role,staffRoles,'company role'),details=staffDetails(req.body.staffDetails,role);
  const delivery=req.body.delivery===undefined&&config.invitationDelivery==='manual'?'manual':deliveryChoice(req.body.delivery);
  await limit(req,'invite-create',req.session.user_id,20,3600);
  const token=randomToken(),tokenHash=digest(token),id=randomUUID();
  const result=await withCompany(req,'invitations.manage',async(db,ctx)=>{
    const profile=await validateRoleProfile(db,ctx.companyId,role,req.body.profileId);await requireStaffEntitlement(db,ctx.companyId,role);
    const existing=await db.query('SELECT m.id FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND u.email=$2',[ctx.companyId,email]);
    if(existing.rowCount)throw new HttpError(409,'MEMBER_EXISTS','This account already has a membership. Manage that membership instead.');
    await db.query("UPDATE company_invitations SET status='revoked' WHERE company_id=$1 AND email=$2 AND status='pending' AND expires_at<=now()",[ctx.companyId,email]);
    await teamCapacity(db,ctx.companyId);
    await db.query("INSERT INTO company_invitations(id,company_id,email,role_id,token_hash,delivery,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '48 hours')",[id,ctx.companyId,email,role,tokenHash,delivery,ctx.userId]);
    await db.query('UPDATE company_invitations SET staff_details=$1,role_profile_id=$2 WHERE id=$3',[details,profile,id]);
    const company=(await db.query('SELECT name FROM companies WHERE id=$1',[ctx.companyId])).rows[0];
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'invitation.created',target:id,metadata:{role,delivery}});
    return {companyId:ctx.companyId,name:company.name};
  });
  const url=invitationUrl(token);
  if(delivery==='manual')return res.status(201).json({message:'Development-only invitation created. No email was sent. Share this one-time link privately with the named recipient; it will not be shown again.',manualUrl:url});
  let receipt;
  try{receipt=await deliverInvitation({delivery,email,companyName:result.name,companyId:result.companyId,url});}
  catch{
    await transaction(async db=>{await db.query("UPDATE company_invitations SET status='delivery_failed' WHERE id=$1 AND company_id=$2 AND status='pending'",[id,result.companyId]);await audit(db,{actor:req.session.user_id,company:result.companyId,action:'invitation.delivery_failed',target:id});});
    throw new HttpError(503,'INVITATION_DELIVERY_FAILED','The email service could not accept the invitation. The token has been invalidated.');
  }
  res.status(201).json(receipt);
});
invitations.post('/companies/current/invitations/:id/revoke',async(req,res)=>{
  const id=v.uuid(req.params.id);v.body(req.body,[]);
  res.json(await withCompany(req,'invitations.manage',async(db,ctx)=>{
    const result=await db.query("UPDATE company_invitations SET status='revoked' WHERE id=$1 AND company_id=$2 AND status='pending' RETURNING id",[id,ctx.companyId]);
    if(!result.rowCount)throw new HttpError(409,'INVITATION_UNAVAILABLE','No pending invitation was found.');
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'invitation.revoked',target:id});return {message:'Invitation revoked.'};
  }));
});
invitations.post('/invitations/accept',async(req,res)=>{
  v.body(req.body,['token']);const token=v.text(req.body.token,'invitation',43,43);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new HttpError(400,'INVALID_INVITATION','This invitation cannot be accepted.');
  await limit(req,'invitation-accept',req.session.user_id,15,3600);
  res.json(await transaction(async db=>{
    const user=await lockedUser(db,req);requireBusiness(user);
    const ref=(await db.query('SELECT company_id FROM company_invitations WHERE token_hash=$1',[digest(token)])).rows[0];
    const denied=()=>new HttpError(400,'INVALID_INVITATION','This invitation is expired, unavailable, or belongs to another account.');
    if(!ref)throw denied();
    const company=await db.query("SELECT id FROM companies WHERE id=$1 AND status='active' FOR UPDATE",[ref.company_id]);if(!company.rowCount)throw denied();
    const result=await db.query(`SELECT i.id,i.company_id,i.role_id,i.role_profile_id FROM company_invitations i WHERE i.token_hash=$1 AND i.company_id=$2 AND i.email=$3 AND i.status='pending' AND i.expires_at>now()
      AND EXISTS(SELECT 1 FROM company_memberships m JOIN users u ON u.id=m.user_id JOIN role_permissions p ON p.role_id=m.role_id WHERE m.company_id=i.company_id AND m.user_id=i.invited_by AND m.status='active' AND u.status='active' AND p.permission_id='invitations.manage') FOR UPDATE OF i`,[digest(token),ref.company_id,user.email]);
    if(!result.rowCount)throw denied();const invite=result.rows[0];v.choice(invite.role_id,staffRoles,'company role');
    await requireStaffEntitlement(db,invite.company_id,invite.role_id);
    const existing=await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[invite.company_id,user.id]);if(existing.rowCount)throw new HttpError(409,'MEMBER_EXISTS','A membership already exists. Ask the company owner to manage it.');
    await teamCapacity(db,invite.company_id,invite.id);
    const id=randomUUID(),profile=await validateRoleProfile(db,invite.company_id,invite.role_id,invite.role_profile_id);await db.query('INSERT INTO company_memberships(id,company_id,user_id,role_id,role_profile_id) VALUES($1,$2,$3,$4,$5)',[id,invite.company_id,user.id,invite.role_id,profile]);
    await db.query('UPDATE company_memberships SET staff_details=i.staff_details FROM company_invitations i WHERE company_memberships.id=$1 AND i.id=$2 AND i.company_id=company_memberships.company_id',[id,invite.id]);
    await db.query("UPDATE company_invitations SET status='accepted',accepted_by=$1,accepted_at=now() WHERE id=$2 AND company_id=$3",[user.id,invite.id,invite.company_id]);
    await db.query('UPDATE sessions SET active_company_id=$1 WHERE token_hash=$2',[invite.company_id,req.session.token_hash]);
    await audit(db,{actor:user.id,company:invite.company_id,action:'invitation.accepted',target:invite.id,metadata:{role:invite.role_id}});return {message:'Invitation accepted. Your authorized company workspace is ready.'};
  }));
});

invitations.post('/invitations/customer/accept',acceptCustomerInvitation);

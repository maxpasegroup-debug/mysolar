import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {requireUser,csrf,lockedUser} from '../auth/sessions.js';
import {withCompany} from '../tenancy/context.js';
import {transaction,audit} from '../db/pool.js';
import {digest,randomToken,limit} from '../auth/security.js';
import {growthAccess,requirePro} from '../commercial/growth.js';
import {invitationUrl} from '../setup/invitation-delivery.js';
import * as v from '../validation.js';
import {HttpError,badInput} from '../errors.js';
const unavailable=()=>new HttpError(400,'PARTNER_INVITATION_UNAVAILABLE','This partner invitation is unavailable or belongs to another email.');
const fields='id,company_id,partner_company_id,partner_name,email,status,expires_at,assignee_id,notes,revision,created_at,accepted_at';
export const partners=Router();
partners.use(['/companies/current/partners','/invitations/preview'],requireUser);
partners.use(['/companies/current/partners','/invitations/preview'],(req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
partners.get('/companies/current/partners',async(req,res)=>{
 v.body(req.query,['page'],[]);const page=Number(req.query.page||1);if(!Number.isSafeInteger(page)||page<1||page>10000)throw badInput();
 res.json(await withCompany(req,'partners.read',async(db,ctx)=>({access:await growthAccess(db,ctx.companyId),page,
 events:(await db.query("SELECT action,created_at FROM audit_events WHERE company_id=$1 AND action LIKE 'partner.%' ORDER BY id DESC LIMIT 20",[ctx.companyId])).rows,
 items:(await db.query(`SELECT ${fields} FROM company_partner_relationships WHERE company_id=$1 ORDER BY created_at DESC,id LIMIT 20 OFFSET $2`,[ctx.companyId,(page-1)*20])).rows,
 incoming:(await db.query(`SELECT r.id,c.name AS company_name,r.status,r.accepted_at,r.revision FROM company_partner_relationships r JOIN companies c ON c.id=r.company_id WHERE r.partner_company_id=$1 ORDER BY r.created_at DESC,r.id LIMIT 20 OFFSET $2`,[ctx.companyId,(page-1)*20])).rows,
 employees:(await db.query("SELECT m.user_id,u.display_name FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.status='active' AND u.status='active' AND m.role_id<>'part_time_sales' ORDER BY u.display_name LIMIT 100",[ctx.companyId])).rows
 })));
});
partners.post('/companies/current/partners',async(req,res)=>{
 v.body(req.body,['name','email']);const name=v.text(req.body.name,'partner name'),email=v.email(req.body.email);
 await limit(req,'partner-invite',req.session.user_id,20,3600);const token=randomToken(),id=randomUUID();
 res.status(201).json(await withCompany(req,'partners.manage',async(db,ctx)=>{
  await requirePro(db,ctx.companyId);
  await db.query("UPDATE company_partner_relationships SET status='revoked',revision=revision+1,updated_at=now() WHERE company_id=$1 AND email=$2 AND status='pending' AND expires_at<=now()",[ctx.companyId,email]);
  await db.query("INSERT INTO company_partner_relationships(id,company_id,partner_name,email,token_hash,expires_at,invited_by) VALUES($1,$2,$3,$4,$5,now()+interval '48 hours',$6)",[id,ctx.companyId,name,email,digest(token),ctx.userId]);
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'partner.invited',target:id,metadata:{status:'pending'}});
  const company=(await db.query('SELECT name FROM companies WHERE id=$1',[ctx.companyId])).rows[0];
  return {message:'Private partner invitation created. No company access was granted and no message was sent.',shareUrl:invitationUrl(token,'partner'),recipient:email,companyName:company.name,companyId:ctx.companyId,kind:'partner'};
 }));
});
partners.patch('/companies/current/partners/:id',async(req,res)=>{
 v.body(req.body,['revision','status','assigneeId','notes']);const id=v.uuid(req.params.id),d=req.body;
 const status=v.choice(d.status,['active','suspended','revoked','declined'],'relationship status');if(!Number.isSafeInteger(d.revision)||d.revision<1)throw badInput();
 res.json(await withCompany(req,'partners.manage',async(db,ctx)=>{
  const r=(await db.query('SELECT * FROM company_partner_relationships WHERE id=$1 AND (company_id=$2 OR partner_company_id=$2) FOR UPDATE',[id,ctx.companyId])).rows[0];
  if(!r||r.revision!==d.revision)throw new HttpError(409,'PARTNER_CHANGED','Refresh this relationship before making changes.');
  const owner=r.company_id===ctx.companyId;
  if(!owner&&(!['suspended','declined'].includes(status)||d.assigneeId!==''||d.notes!==''))throw new HttpError(403,'PERMISSION_DENIED','You can suspend or decline the relationship, but cannot change the other company’s records.');
  // Once suspended, a relationship needs a new private invitation and acceptance.
  if(status==='active'&&r.status!=='active'||['revoked','declined'].includes(r.status)||r.status==='suspended'&&status!=='revoked')throw new HttpError(409,'NEW_INVITATION_REQUIRED','Revoke a suspended relationship, then create and accept a new invitation to restore it.');
  if(status==='active')await requirePro(db,ctx.companyId);
  const assignee=d.assigneeId?v.uuid(d.assigneeId):null,notes=v.description(d.notes);
  if(owner&&(assignee!==r.assignee_id||notes!==r.notes))await requirePro(db,ctx.companyId);
  if(assignee&&assignee!==r.assignee_id&&!(await db.query("SELECT 1 FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.user_id=$2 AND m.status='active' AND u.status='active' AND m.role_id<>'part_time_sales'",[ctx.companyId,assignee])).rowCount)throw badInput('Choose an active internal relationship contact.');
  if(!['active','suspended'].includes(status)&&owner&&(notes!==r.notes||assignee!==r.assignee_id))throw badInput('Close the relationship without changing its internal details.');
  await db.query('UPDATE company_partner_relationships SET status=$1,assignee_id=$2,notes=$3,revision=revision+1,updated_at=now() WHERE id=$4',[status,owner?assignee:r.assignee_id,owner?notes:r.notes,id]);
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'partner.updated',target:id,metadata:owner?{previous:{status:r.status,assignee:r.assignee_id,notes:r.notes},next:{status,assignee,notes},revision:d.revision}:{previous:{status:r.status},next:{status},revision:d.revision}});
  return {message:'Relationship updated. Memberships and private company data are unchanged.'};
 }));
});
async function invite(db,token,email){
 const row=(await db.query(`SELECT r.*,c.name AS company_name FROM company_partner_relationships r JOIN companies c ON c.id=r.company_id
 WHERE r.token_hash=$1 AND r.email=$2 AND r.status='pending' AND r.expires_at>now() AND c.status='active' AND c.lifecycle='active'
 AND EXISTS(SELECT 1 FROM company_memberships m JOIN users u ON u.id=m.user_id JOIN role_permissions p ON p.role_id=m.role_id WHERE m.company_id=r.company_id AND m.user_id=r.invited_by AND m.status='active' AND u.status='active' AND p.permission_id='partners.manage')`,[digest(token),email])).rows[0];
 if(!row)throw unavailable();return row;
}
partners.post('/invitations/preview',async(req,res,next)=>{
 if(req.body?.kind!=='partner')return next();v.body(req.body,['token','kind']);const token=v.text(req.body.token,'invitation',43,43);await limit(req,'partner-preview',req.session.user_id,30,900);
 res.json(await transaction(async db=>{const user=await lockedUser(db,req),r=await invite(db,token,user.email);return {kind:'partner',company_name:r.company_name,role:'Partner relationship only',expires_at:r.expires_at};}));
});
partners.post('/companies/current/partners/accept',async(req,res)=>{
 v.body(req.body,['token','confirmAccess']);if(req.body.confirmAccess!==true)throw badInput('Confirm the company partnership first.');const token=v.text(req.body.token,'invitation',43,43);await limit(req,'partner-accept',req.session.user_id,15,3600);
 res.json(await withCompany(req,'partners.manage',async(db,ctx)=>{
  await requirePro(db,ctx.companyId);const user=(await db.query('SELECT email FROM users WHERE id=$1',[ctx.userId])).rows[0],r=await invite(db,token,user.email);
  if(r.company_id===ctx.companyId)throw badInput('Select your own separate partner company before accepting.');
  // withCompany already holds the recipient company lock. Never wait on an
  // opposite company lock: concurrent A->B / B->A acceptance must safely retry.
  try{await db.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE NOWAIT',[r.company_id]);}
  catch(error){if(error.code==='55P03')throw new HttpError(409,'PARTNER_BUSY','The inviting company is being updated. Wait a moment, refresh and accept this invitation again.');throw error;}
  await requirePro(db,r.company_id);await invite(db,token,user.email);
  const updated=await db.query("UPDATE company_partner_relationships SET partner_company_id=$1,status='active',accepted_by=$2,accepted_at=now(),revision=revision+1,updated_at=now() WHERE id=$3 AND status='pending' AND expires_at>now() RETURNING id",[ctx.companyId,ctx.userId,r.id]);if(!updated.rowCount)throw unavailable();
  for(const company of [ctx.companyId,r.company_id])await audit(db,{actor:ctx.userId,company,action:'partner.accepted',target:r.id,metadata:{status:'active',dataAccessGranted:false}});
  return {message:'Partnership accepted. Both companies remain separate; no dashboard or customer access was granted.'};
 }));
});

import {requireCustomer} from '../auth/account-type.js';
import * as c from './core.js';
import {HttpError} from '../errors.js';
import {transaction,audit} from '../db/pool.js';
import {lockedUser} from '../auth/sessions.js';
import {randomToken,digest,limit} from '../auth/security.js';
import {deliveryChoice,deliverInvitation,invitationUrl} from '../setup/invitation-delivery.js';
import {policy,requireFeature} from '../commercial/policy.js';

export const customerInvitations=c.router();
customerInvitations.post('/contacts/:id/invitations',async(req,res)=>{
 c.v.body(req.body,['revision','delivery','confirmCustomerAccess']);
 if(req.body.confirmCustomerAccess!==true)throw c.badInput('Confirm that this customer may access their existing and future customer-visible records.');
 const delivery=deliveryChoice(req.body.delivery),token=randomToken(),id=c.randomUUID();
 await limit(req,'customer-invite',req.session.user_id,20,3600);
 const prepared=await c.context(req,async(db,ctx)=>{
  const contact=await c.record(db,ctx,'contacts',req.params.id,{lock:true,write:true});c.expect(contact,req.body.revision);
  // Granting customer account access is an owner decision, distinct from editing CRM details.
  c.permit(ctx,'members.manage');
  if(contact.user_id)throw c.fail('This customer is already connected to an account.');
  const email=c.v.email(contact.email);
  await db.query("UPDATE customer_access_invitations SET status='revoked' WHERE company_id=$1 AND contact_id=$2 AND status='pending'",[ctx.companyId,contact.id]);
  await db.query('INSERT INTO customer_access_invitations(id,company_id,contact_id,email,contact_revision,token_hash,delivery,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval \'48 hours\')',[id,ctx.companyId,contact.id,email,contact.revision,digest(token),delivery,ctx.userId]);
  const company=(await db.query('SELECT name FROM companies WHERE id=$1',[ctx.companyId])).rows[0];
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'customer.invitation_created',target:id,metadata:{contactId:contact.id,contactRevision:contact.revision,delivery,existingCustomerRecordsApproved:true}});
  return {companyId:ctx.companyId,companyName:company.name,email,contactId:contact.id};
 });
 try{res.status(201).json(await deliverInvitation({...prepared,delivery,url:invitationUrl(token,'customer'),kind:'customer'}));}
 catch{
  await transaction(async db=>{
   await db.query("UPDATE customer_access_invitations SET status='delivery_failed' WHERE id=$1 AND company_id=$2 AND status='pending'",[id,prepared.companyId]);
   await audit(db,{actor:req.session.user_id,company:prepared.companyId,action:'customer.invitation_delivery_failed',target:id});
  });
  throw new HttpError(503,'INVITATION_DELIVERY_FAILED','The email service could not accept this invitation. Create a private sharing link instead.');
 }
});
customerInvitations.post('/contacts/:id/invitations/:inviteId/revoke',async(req,res)=>{
 c.v.body(req.body,[]);
 res.json(await c.context(req,async(db,ctx)=>{
  const contact=await c.record(db,ctx,'contacts',req.params.id,{lock:true,write:true});c.permit(ctx,'members.manage');
  const r=await db.query("UPDATE customer_access_invitations SET status='revoked' WHERE id=$1 AND company_id=$2 AND contact_id=$3 AND status='pending' RETURNING id",[c.v.uuid(req.params.inviteId),ctx.companyId,contact.id]);
  if(!r.rowCount)throw c.fail('No pending customer invitation was found.');
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'customer.invitation_revoked',target:r.rows[0].id});
  return {message:'Customer invitation revoked.'};
 }));
});

export async function acceptCustomerInvitation(req,res){
 c.v.body(req.body,['token','confirmAccess']);
 if(req.body.confirmAccess!==true)throw c.badInput('Confirm that you want to connect this company’s customer records to your account.');
 const token=c.v.text(req.body.token,'invitation',43,43);
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw c.badInput('Open a valid private invitation link.');
 await limit(req,'customer-invite-accept',req.session.user_id,15,3600);
 res.json(await transaction(async db=>{
  const user=await lockedUser(db,req);requireCustomer(user);const denied=()=>new HttpError(400,'INVALID_INVITATION','This invitation is expired, changed, unavailable or belongs to another account. Ask the company for a new invitation.');
  const ref=(await db.query('SELECT company_id,contact_id FROM customer_access_invitations WHERE token_hash=$1',[digest(token)])).rows[0];
  if(!ref)throw denied();
  const company=(await db.query("SELECT id FROM companies WHERE id=$1 AND status='active' AND lifecycle='active' FOR UPDATE",[ref.company_id])).rows[0];if(!company)throw denied();
  const contact=(await db.query('SELECT id,user_id,email,revision FROM company_contacts WHERE id=$1 AND company_id=$2 FOR UPDATE',[ref.contact_id,company.id])).rows[0];
  const invite=(await db.query(`SELECT i.* FROM customer_access_invitations i WHERE token_hash=$1 AND status='pending' AND expires_at>now() AND email=$2
    AND EXISTS(SELECT 1 FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=i.company_id AND m.user_id=i.invited_by AND m.status='active' AND u.status='active'
      AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id='customers.manage')
      AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id='members.manage')) FOR UPDATE OF i`,[digest(token),user.email])).rows[0];
  if(!invite||!contact||contact.email.toLowerCase()!==user.email||contact.revision!==invite.contact_revision||contact.user_id)throw denied();
  requireFeature(await policy(db,company.id),'crm');
  if((await db.query('SELECT 1 FROM company_contacts WHERE company_id=$1 AND user_id=$2',[company.id,user.id])).rowCount)throw c.fail('Your account is already connected to a different customer record in this company. Contact the owner.');
  await db.query('UPDATE company_contacts SET user_id=$1,revision=revision+1 WHERE id=$2 AND company_id=$3',[user.id,contact.id,company.id]);
  await db.query("UPDATE customer_access_invitations SET status='accepted',accepted_by=$1,accepted_at=now() WHERE id=$2",[user.id,invite.id]);
  await audit(db,{actor:user.id,company:company.id,action:'customer.invitation_accepted',target:invite.id,metadata:{contactId:contact.id,invitedBy:invite.invited_by}});
  await c.event(db,{companyId:company.id,userId:user.id},'contacts',contact.id,'customer_access_accepted');
  return {message:'Your customer account is connected. Open your dashboard to view shared orders, installation updates and service requests.'};
 }));
}

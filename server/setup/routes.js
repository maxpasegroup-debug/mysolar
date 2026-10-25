import { Router } from 'express';
import { config } from '../config.js';
import { requireUser,csrf } from '../auth/sessions.js';
import { withCompany } from '../tenancy/context.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import { expectRevision,editable,markChanged,setupData,reviewEvent,brandDefaults,assertReady } from './service.js';
import { HttpError } from '../errors.js';
import { staffRoles } from '../permissions.js';
import {growthAccess,requirePro} from '../commercial/growth.js';
import {staffDetails} from './staff.js';
import {audit} from '../db/pool.js';
import {peopleData} from '../people-sales.js';
export const setup=Router();
setup.use(requireUser);
setup.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
setup.patch('/team/:id/details',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['revision','staffDetails']);
 const details=staffDetails(req.body.staffDetails,'part_time_sales');if(!Number.isSafeInteger(req.body.revision)||req.body.revision<1)throw new HttpError(400,'INVALID_INPUT','Refresh the executive details.');
 res.json(await withCompany(req,'members.manage',async(db,ctx)=>{
  await requirePro(db,ctx.companyId);
  const old=(await db.query("SELECT staff_details,staff_revision FROM company_memberships WHERE id=$1 AND company_id=$2 AND role_id='part_time_sales' FOR UPDATE",[id,ctx.companyId])).rows[0];
  if(!old||old.staff_revision!==req.body.revision)throw new HttpError(409,'MEMBER_CHANGED','Refresh the team before updating these details.');
  await db.query('UPDATE company_memberships SET staff_details=$1,staff_revision=staff_revision+1,updated_at=now() WHERE id=$2 AND company_id=$3',[details,id,ctx.companyId]);
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'membership.business_details_updated',target:id,metadata:{previous:old.staff_details,next:details,revision:req.body.revision}});
  return {message:'Executive business details saved. Account identity and permissions are unchanged.'};
 }));
});
setup.get('/setup',async(req,res)=>res.json(await withCompany(req,'company.setup.read',async(db,ctx)=>({...(await setupData(db,ctx.companyId,{team:true})),logoHosts:config.logoHosts,defaults:brandDefaults}))));
setup.get('/team',async(req,res)=>res.json(await withCompany(req,'company.setup.read',async(db,ctx)=>{
  if(!ctx.permissions.includes('members.read'))throw new HttpError(403,'PERMISSION_DENIED','Team access is not allowed.');
  const members=await db.query('SELECT m.id,m.user_id,u.display_name AS name,u.email,m.role_id AS role,m.status,m.staff_details,m.staff_revision FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 ORDER BY m.created_at',[ctx.companyId]);
  const invitations=await db.query("SELECT id,email,role_id AS role,CASE WHEN status='pending' AND expires_at<=now() THEN 'expired' ELSE status END AS status,delivery,expires_at FROM company_invitations WHERE company_id=$1 ORDER BY created_at DESC LIMIT 100",[ctx.companyId]);
  const events=await db.query("SELECT id,action,metadata,created_at FROM audit_events WHERE company_id=$1 AND (action LIKE 'membership.%' OR action LIKE 'invitation.%' OR action LIKE 'controls.%') ORDER BY id DESC LIMIT 30",[ctx.companyId]);
  return {controls:ctx.role==='owner'?await peopleData(db,ctx):null,growth:await growthAccess(db,ctx.companyId),members:members.rows,invitations:invitations.rows,events:events.rows,assignableRoles:staffRoles,deliveryMode:config.invitationDelivery,available:true,emailAvailable:config.mailEnabled&&Boolean(config.dataEncryptionKey),readOnly:ctx.lifecycle==='suspended'||!ctx.permissions.includes('members.manage')};
})));
setup.get('/branding',async(req,res)=>res.json(await withCompany(req,'company.brand.read',async(db,ctx)=>{
  const brand=(await db.query('SELECT public_name,logo_url,primary_color,secondary_color,accent_color,welcome_text,public_email,public_phone,description,appearance FROM company_branding WHERE company_id=$1',[ctx.companyId])).rows[0];return {brand};
})));
async function saveStep(req,res,parse,save,step,permission='company.onboarding.manage'){
  const data=parse(req.body);
  res.json(await withCompany(req,permission,async(db,ctx)=>{
    const company=(await db.query('SELECT * FROM companies WHERE id=$1',[ctx.companyId])).rows[0];expectRevision(company,data.revision);editable(company);
    await save(db,ctx,data);
    const columns={profile:'profile_saved_at',brand:'brand_saved_at',business:'business_saved_at'};
    await db.query(`UPDATE company_onboarding SET ${columns[step]}=now() WHERE company_id=$1`,[ctx.companyId]);
    await markChanged(db,ctx,company,`company.${step}_saved`,step==='business'?{marketplaceRequested:data.marketplaceRequested}:{});
    return {message:'Progress saved.',revision:company.revision+1};
  }));
}
setup.put('/onboarding/profile',async(req,res)=>saveStep(req,res,input.profile,async(db,ctx,d)=>{
  await db.query('UPDATE companies SET name=$1,city=$2,business_email=$3,phone=$4 WHERE id=$5',[d.displayName,d.district,d.email,d.phone,ctx.companyId]);
  await db.query('UPDATE company_profiles SET legal_name=$1,business_type=$2,primary_contact=$3,address=$4,state=$5,district=$6,pin_code=$7,language=$8,website=$9,updated_at=now() WHERE company_id=$10',[d.legalName,d.businessType,d.contactPerson,d.address,d.state,d.district,d.pin,d.language,d.website,ctx.companyId]);
},'profile'));
setup.put('/branding',async(req,res)=>saveStep(req,res,input.brand,async(db,ctx,d)=>{
  await db.query('UPDATE company_branding SET public_name=$1,logo_url=$2,primary_color=$3,secondary_color=$4,accent_color=$5,welcome_text=$6,public_email=$7,public_phone=$8,description=$9,appearance=$10,requested_domain=$11,updated_at=now() WHERE company_id=$12',[d.publicName,d.logoUrl,d.primary,d.secondary,d.accent,d.welcome,d.email,d.phone,d.description,d.appearance,d.requestedDomain,ctx.companyId]);
  await db.query('UPDATE companies SET storefront_description=$1 WHERE id=$2',[d.description,ctx.companyId]);
},'brand','company.brand.manage'));
setup.put('/onboarding/business',async(req,res)=>saveStep(req,res,input.business,async(db,ctx,d)=>{
  await db.query('UPDATE company_business_profiles SET services=$1,rooftop_available=$2,service_areas=$3,preferred_contact=$4,marketplace_requested=$5,updated_at=now() WHERE company_id=$6',[d.services,d.rooftop,d.areas,d.contactMethod,d.marketplaceRequested,ctx.companyId]);
},'business'));
setup.post('/onboarding/submit',async(req,res)=>{
  v.body(req.body,['revision']);const revision=input.revision(req.body.revision);
  res.json(await withCompany(req,'company.onboarding.manage',async(db,ctx)=>{
    const data=await setupData(db,ctx.companyId);const c=data.company;expectRevision(c,revision);
    if(!['draft','onboarding'].includes(c.lifecycle))throw new HttpError(409,'INVALID_TRANSITION','This company cannot submit onboarding from its current state.');
    assertReady(data);
    const market=data.business.marketplace_requested?'pending':'not_requested';
    await db.query("UPDATE companies SET lifecycle='pending_review',marketplace_status=$1,storefront_published=false,revision=revision+1,updated_at=now() WHERE id=$2",[market,ctx.companyId]);
    await db.query('UPDATE company_onboarding SET submitted_at=now() WHERE company_id=$1',[ctx.companyId]);
    await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'submission',previous:c.lifecycle,next:'pending_review',revision:revision+1});
    if(c.marketplace_status!==market)await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'marketplace',previous:c.marketplace_status,next:market,reason:'Marketplace preference recorded with onboarding submission.',revision:revision+1});
    return {message:'Submitted for platform review. Your company is not yet activated or verified.'};
  }));
});
setup.post('/onboarding/withdraw',async(req,res)=>{
  v.body(req.body,['revision']);const revision=input.revision(req.body.revision);
  res.json(await withCompany(req,'company.onboarding.manage',async(db,ctx)=>{
    const c=(await db.query('SELECT lifecycle,revision FROM companies WHERE id=$1',[ctx.companyId])).rows[0];expectRevision(c,revision);
    if(c.lifecycle!=='pending_review')throw new HttpError(409,'INVALID_TRANSITION','Only a pending onboarding submission can be withdrawn.');
    await db.query("UPDATE companies SET lifecycle='onboarding',marketplace_status='withdrawn',storefront_published=false,revision=revision+1,updated_at=now() WHERE id=$1",[ctx.companyId]);
    await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'submission',previous:c.lifecycle,next:'onboarding',reason:'Owner withdrew submission to edit.',revision:revision+1});return {message:'Submission withdrawn. You can continue editing.'};
  }));
});
setup.post('/marketplace-request',async(req,res)=>{
  v.body(req.body,['revision','requested']);const revision=input.revision(req.body.revision),requested=input.bool(req.body.requested);
  res.json(await withCompany(req,'company.onboarding.manage',async(db,ctx)=>{
    const d=await setupData(db,ctx.companyId);const c=d.company;expectRevision(c,revision);
    if(c.lifecycle!=='active')throw new HttpError(409,'INVALID_TRANSITION','The company must be active before requesting a separate marketplace review.');
    if(requested)assertReady(d);
    if(requested&&['pending','approved'].includes(c.marketplace_status))throw new HttpError(409,'REVIEW_EXISTS','A marketplace request or approval already exists.');
    const next=requested?'pending':'withdrawn';
    await db.query('UPDATE company_business_profiles SET marketplace_requested=$1 WHERE company_id=$2',[requested,ctx.companyId]);
    await db.query('UPDATE companies SET marketplace_status=$1,storefront_published=false,revision=revision+1,updated_at=now() WHERE id=$2',[next,ctx.companyId]);
    await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'marketplace',previous:c.marketplace_status,next,reason:requested?'Owner requested review.':'Owner withdrew marketplace inclusion.',revision:revision+1});return {message:requested?'Marketplace review requested. Publication requires platform approval.':'Marketplace request withdrawn and profile unpublished.'};
  }));
});

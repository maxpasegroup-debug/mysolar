import { audit } from '../db/pool.js';
import { HttpError } from '../errors.js';
export const brandDefaults=Object.freeze({primary:'#601c2b',secondary:'#292b29',accent:'#d8ab55',welcome:'Good energy starts here.',appearance:'warm',description:'Learn about our company and the areas we serve.'});
export function expectRevision(company,revision){if(company.revision!==revision)throw new HttpError(409,'REVISION_CHANGED','This company changed in another session. Refresh before saving or reviewing.');}
export function editable(company){if(company.lifecycle==='pending_review')throw new HttpError(409,'REVIEW_PENDING','Withdraw the submission before editing onboarding details.');if(company.lifecycle==='suspended')throw new HttpError(403,'COMPANY_SUSPENDED','This company is suspended. Only a platform operator can reactivate it.');}
export function assertReady(data){
  if(!data.onboarding.profile_saved_at||!data.onboarding.brand_saved_at||!data.onboarding.business_saved_at)throw new HttpError(409,'SETUP_INCOMPLETE','Save all three setup steps before requesting approval.');
  if(!data.brand.description)throw new HttpError(400,'SETUP_INCOMPLETE','Add a basic company description.');
  if(data.business.preferred_contact==='email'&&!data.brand.public_email||data.business.preferred_contact==='phone'&&!data.brand.public_phone)throw new HttpError(400,'SETUP_INCOMPLETE','Configure the preferred public customer contact method in your brand settings.');
}
export async function reviewEvent(db,{company,actor,kind,previous,next,reason='',revision}){
  await db.query('INSERT INTO company_reviews(company_id,actor_user_id,kind,previous_state,new_state,reason,revision) VALUES($1,$2,$3,$4,$5,$6,$7)',[company,actor,kind,previous,next,reason,revision]);
  await audit(db,{actor,company,action:`company.${kind}_changed`,target:company,metadata:{previous,next,reason,revision}});
}
export async function markChanged(db,ctx,company,action,{marketplaceRequested}={}){
  const next=company.lifecycle==='draft'?'onboarding':company.lifecycle;
  const marketplace=marketplaceRequested===false&&company.marketplace_status!=='not_requested'?'withdrawn':['approved','pending'].includes(company.marketplace_status)?'pending':company.marketplace_status;
  await db.query('UPDATE companies SET lifecycle=$1,marketplace_status=$2,storefront_published=false,revision=revision+1,updated_at=now() WHERE id=$3',[next,marketplace,ctx.companyId]);
  if(next!==company.lifecycle)await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'lifecycle',previous:company.lifecycle,next,reason:'Company setup started.',revision:company.revision+1});
  if(company.storefront_published||marketplace!==company.marketplace_status)await reviewEvent(db,{company:ctx.companyId,actor:ctx.userId,kind:'marketplace',previous:company.marketplace_status,next:marketplace,reason:'Company details changed; publication withdrawn for review.',revision:company.revision+1});
  await audit(db,{actor:ctx.userId,company:ctx.companyId,action,target:ctx.companyId,metadata:{revision:company.revision+1}});
}
export async function setupData(db,companyId,{team=false}={}){
  const company=(await db.query('SELECT id,name,city,business_email,phone,status,lifecycle,marketplace_status,storefront_published,revision FROM companies WHERE id=$1',[companyId])).rows[0];
  if(!company)throw new HttpError(404,'NOT_FOUND','Company not found.');
  const brand=(await db.query('SELECT public_name,logo_url,primary_color,secondary_color,accent_color,welcome_text,public_email,public_phone,description,appearance,requested_domain,domain_status FROM company_branding WHERE company_id=$1',[companyId])).rows[0];
  const business=(await db.query('SELECT services,rooftop_available,service_areas,preferred_contact,marketplace_requested FROM company_business_profiles WHERE company_id=$1',[companyId])).rows[0];
  const onboarding=(await db.query('SELECT profile_saved_at,brand_saved_at,business_saved_at,submitted_at FROM company_onboarding WHERE company_id=$1',[companyId])).rows[0];
  const profile=(await db.query('SELECT legal_name,business_type,business_preset,primary_contact,address,state,district,pin_code,language,website FROM company_profiles WHERE company_id=$1',[companyId])).rows[0];
  const history=(await db.query('SELECT r.id,r.kind,r.previous_state,r.new_state,r.reason,r.revision,r.created_at,u.display_name AS operator FROM company_reviews r JOIN users u ON u.id=r.actor_user_id WHERE r.company_id=$1 ORDER BY r.id DESC LIMIT 50',[companyId])).rows;
  const members=team?(await db.query("SELECT count(*) FILTER(WHERE status='active')::int AS active,count(*) FILTER(WHERE status='suspended')::int AS suspended FROM company_memberships WHERE company_id=$1",[companyId])).rows[0]:undefined;
  const activity=team?(await db.query('SELECT a.id,a.action,a.created_at,u.display_name AS operator FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.company_id=$1 ORDER BY a.id DESC LIMIT 25',[companyId])).rows:undefined;
  return {company,profile,brand,business,onboarding,history,members,activity};
}

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireUser,csrf } from '../auth/sessions.js';
import { withCompany } from '../tenancy/context.js';
import { audit } from '../db/pool.js';
import { markChanged,expectRevision,editable } from '../setup/service.js';
import { Bindings,paged,publishedProduct,eligibleCompany,offerHistory } from './service.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import { HttpError } from '../errors.js';
export const listings=Router();listings.use(requireUser);listings.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
listings.get('/offer-template',async(req,res)=>{v.body(req.query,['productId']);const id=v.uuid(req.query.productId);res.json(await withCompany(req,'offers.manage',async(db,ctx)=>({product:await publishedProduct(db,id),areas:(await db.query('SELECT label FROM company_service_areas WHERE company_id=$1 ORDER BY label LIMIT 20',[ctx.companyId])).rows.map(a=>a.label),units:input.units,permissions:ctx.permissions})));});
listings.get('/offers',async(req,res)=>{
  v.body(req.query,['search','page'],[]);const q=input.query(req.query);
  res.json(await withCompany(req,'offers.read',async(db,ctx)=>{
    const bind=new Bindings(),conditions=[`o.company_id=${bind.add(ctx.companyId)}`];if(q.search)conditions.push(`p.search_document @@ websearch_to_tsquery('simple',${bind.add(q.search)})`);
    const result=await paged(db,'o.id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.availability,o.status,o.published,o.revision,o.approved_product_revision,p.name AS product_name,p.brand,p.model,p.revision AS product_revision,p.status AS product_status', 'FROM distributor_offers o JOIN catalogue_products p ON p.id=o.product_id',conditions.join(' AND '),bind,q.page,'o.updated_at DESC,o.id');
    return {...result,permissions:ctx.permissions,lifecycle:ctx.lifecycle};
  }));
});
listings.get('/offers/:id',async(req,res)=>{
  const id=v.uuid(req.params.id);
  res.json(await withCompany(req,'offers.read',async(db,ctx)=>{
    const result=await db.query('SELECT o.*,p.name AS product_name,p.unit AS product_unit,p.revision AS product_revision FROM distributor_offers o JOIN catalogue_products p ON p.id=o.product_id WHERE o.id=$1 AND o.company_id=$2',[id,ctx.companyId]);
    if(!result.rowCount)throw new HttpError(404,'NOT_FOUND','Offer not found.');const offer=result.rows[0];if(!ctx.permissions.includes('offers.manage'))delete offer.private_notes;
    const areas=(await db.query('SELECT label FROM company_service_areas WHERE company_id=$1 ORDER BY label LIMIT 20',[ctx.companyId])).rows.map(a=>a.label);
    return {offer,areas,history:await offerHistory(db,ctx.companyId,id),permissions:ctx.permissions};
  }));
});
async function save(req,res,create){const data=input.offer(req.body),id=create?randomUUID():v.uuid(req.params.id);
  if(data.taxRate!==null)input.decimal(data.taxRate,'tax rate',2,0,100);
  if(data.minimumOrder!==null)input.decimal(data.minimumOrder,'minimum order',3,0.001,999999999);
  res.status(create?201:200).json(await withCompany(req,'offers.manage',async(db,ctx)=>{
    if(create&&(await db.query('SELECT id FROM distributor_offers WHERE company_id=$1 AND product_id=$2',[ctx.companyId,data.productId])).rowCount)throw new HttpError(409,'OFFER_EXISTS','Your company already has an offer for this definition. Open My offers to edit it.');
    const old=create?null:(await db.query('SELECT * FROM distributor_offers WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,ctx.companyId])).rows[0];
    if(!create&&!old)throw new HttpError(404,'NOT_FOUND','Offer not found.');if(old){expectRevision(old,data.revision);if(old.product_id!==data.productId)throw new HttpError(400,'PRODUCT_IMMUTABLE','Create a separate offer to change the product.');}
    await db.query('SELECT id FROM catalogue_products WHERE id=$1 FOR SHARE',[data.productId]);if(create)await publishedProduct(db,data.productId);
    const areas=(await db.query('SELECT label FROM company_service_areas WHERE company_id=$1',[ctx.companyId])).rows.map(a=>a.label);
    if(data.coverage.some(label=>!areas.includes(label)))throw new HttpError(400,'INVALID_COVERAGE','Choose coverage from your company’s saved service areas.');
    const values=[data.sku,data.priceMode,data.pricePaise,data.currency,data.priceUnit,data.estimated,data.taxMode,data.taxRate,data.availability,data.stockMaintained,data.stockQuantity,data.minimumOrder,data.coverage,data.terms,data.termsConfirmed,data.privateNotes];
    if(create)await db.query(`INSERT INTO distributor_offers(distributor_sku,price_mode,price_paise,currency,price_unit,estimated,tax_mode,tax_rate,availability,stock_maintained,stock_quantity,minimum_order,coverage_labels,public_terms,terms_confirmed,private_notes,id,company_id,product_id,created_by) VALUES(${Array.from({length:20},(_,i)=>`$${i+1}`).join(',')})`,[...values,id,ctx.companyId,data.productId,ctx.userId]);
    else await db.query(`UPDATE distributor_offers SET distributor_sku=$1,price_mode=$2,price_paise=$3,currency=$4,price_unit=$5,estimated=$6,tax_mode=$7,tax_rate=$8,availability=$9,stock_maintained=$10,stock_quantity=$11,minimum_order=$12,coverage_labels=$13,public_terms=$14,terms_confirmed=$15,private_notes=$16,status='draft',published=false,approved_revision=NULL,approved_product_revision=NULL,reviewed_by=NULL,reviewed_at=NULL,revision=revision+1,updated_at=now() WHERE id=$17 AND company_id=$18`,[...values,id,ctx.companyId]);
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:create?'offer.created':'offer.edited_unpublished',target:id,metadata:{productId:data.productId,revision:old?old.revision+1:1}});
    return {id,message:'Offer saved privately. Submit it for review before publication.'};
  }));
}
listings.post('/offers',async(req,res)=>save(req,res,true));listings.put('/offers/:id',async(req,res)=>save(req,res,false));
listings.post('/offers/:id/actions',async(req,res)=>{
  const id=v.uuid(req.params.id);v.body(req.body,['revision','action']);const revision=input.revision(req.body.revision),action=v.choice(req.body.action,['submit','publish','unpublish','deactivate'],'offer action');
  const permissions={submit:'offers.submit',publish:'offers.publish',unpublish:'offers.deactivate',deactivate:'offers.deactivate'};
  res.json(await withCompany(req,permissions[action],async(db,ctx)=>{
    const result=await db.query('SELECT * FROM distributor_offers WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,ctx.companyId]);if(!result.rowCount)throw new HttpError(404,'NOT_FOUND','Offer not found.');const offer=result.rows[0];expectRevision(offer,revision);
    if(['submit','publish'].includes(action)){await eligibleCompany(db,ctx.companyId);await db.query('SELECT id FROM catalogue_products WHERE id=$1 FOR SHARE',[offer.product_id]);await publishedProduct(db,offer.product_id);}
    if(action==='submit'){if(offer.status==='pending')throw new HttpError(409,'REVIEW_PENDING','This offer is already awaiting review.');await db.query("UPDATE distributor_offers SET status='pending',published=false,approved_revision=NULL,approved_product_revision=NULL,reviewed_by=NULL,reviewed_at=NULL,revision=revision+1,updated_at=now() WHERE id=$1 AND company_id=$2",[id,ctx.companyId]);}
    if(action==='publish'){const product=await publishedProduct(db,offer.product_id);if(offer.status!=='approved'||offer.approved_revision!==offer.revision||offer.approved_product_revision!==product.revision)throw new HttpError(409,'OFFER_NOT_APPROVED','This offer or its product needs a current review before publishing.');await db.query('UPDATE distributor_offers SET published=true,updated_at=now() WHERE id=$1 AND company_id=$2',[id,ctx.companyId]);}
    if(action==='unpublish')await db.query('UPDATE distributor_offers SET published=false,updated_at=now() WHERE id=$1 AND company_id=$2',[id,ctx.companyId]);
    if(action==='deactivate')await db.query("UPDATE distributor_offers SET status='inactive',published=false,revision=revision+1,approved_revision=NULL,approved_product_revision=NULL,updated_at=now() WHERE id=$1 AND company_id=$2",[id,ctx.companyId]);
    await audit(db,{actor:ctx.userId,company:ctx.companyId,action:`offer.${action}`,target:id,metadata:{previous:offer.status,published:action==='publish',revision}});return {message:'Offer state updated.'};
  }));
});
listings.get('/service-areas',async(req,res)=>res.json(await withCompany(req,'company.setup.read',async(db,ctx)=>{
  const company=(await db.query('SELECT revision,lifecycle FROM companies WHERE id=$1',[ctx.companyId])).rows[0];const areas=(await db.query('SELECT scope,label,state,district,pin,locality FROM company_service_areas WHERE company_id=$1 ORDER BY label LIMIT 20',[ctx.companyId])).rows;return {company,areas};
})));
listings.put('/service-areas',async(req,res)=>{
  const data=input.areas(req.body);
  res.json(await withCompany(req,'service_areas.manage',async(db,ctx)=>{
    const company=(await db.query('SELECT * FROM companies WHERE id=$1',[ctx.companyId])).rows[0];expectRevision(company,data.revision);editable(company);
    await db.query('DELETE FROM company_service_areas WHERE company_id=$1',[ctx.companyId]);
    for(const a of data.areas)await db.query('INSERT INTO company_service_areas(id,company_id,scope,label,state,district,pin,locality,state_key,district_key,locality_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[randomUUID(),ctx.companyId,a.scope,a.label,a.state,a.district,a.pin,a.locality,input.normalize(a.state),input.normalize(a.district),input.normalize(a.locality)]);
    await db.query('UPDATE company_business_profiles SET service_areas=$1,updated_at=now() WHERE company_id=$2',[data.areas.map(a=>a.label),ctx.companyId]);
    await markChanged(db,ctx,company,'company.service_areas_saved');return {message:'Coverage saved. Company publication requires renewed marketplace review.'};
  }));
});

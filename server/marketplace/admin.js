import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { withPlatform } from '../platform/routes.js';
import { requireUser,csrf } from '../auth/sessions.js';
import { audit } from '../db/pool.js';
import { expectRevision } from '../setup/service.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import { Bindings,paged,categoryRules,publishedProduct,eligibleCompany,offerHistory } from './service.js';
import { HttpError } from '../errors.js';
import { config } from '../config.js';
export const catalogueAdmin=Router();catalogueAdmin.use(requireUser);catalogueAdmin.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
catalogueAdmin.get('/editor',async(req,res)=>{
  v.body(req.query,['productId','categoryId','page'],[]);const productId=req.query.productId?v.uuid(req.query.productId):null,categoryId=req.query.categoryId?v.uuid(req.query.categoryId):null,page=req.query.page===undefined?1:input.integer(Number(req.query.page),'page',1,10000);
  res.json(await withPlatform(req,'catalogue.read',async db=>{
    const categories=(await db.query('SELECT * FROM catalogue_categories ORDER BY parent_id NULLS FIRST,name,id LIMIT 200 OFFSET $1',[(page-1)*200])).rows;
    const product=productId?(await db.query('SELECT id,category_id,subcategory_id,name,brand,model,description,attributes,unit,image_urls,warranty,source_note,status,public_visible,revision FROM catalogue_products WHERE id=$1',[productId])).rows[0]:null;
    const category=categoryId?(await db.query('SELECT * FROM catalogue_categories WHERE id=$1',[categoryId])).rows[0]:null;
    if(productId&&!product||categoryId&&!category)throw new HttpError(404,'NOT_FOUND','Catalogue record not found.');
    if(product)for(const id of [product.category_id,product.subcategory_id].filter(Boolean))if(!categories.some(c=>c.id===id)){const c=(await db.query('SELECT * FROM catalogue_categories WHERE id=$1',[id])).rows[0];if(c)categories.push(c);}
    return {categories,product,category,units:input.units,imageHosts:config.productImageHosts,page,pageSize:200};
  }));
});
catalogueAdmin.get('/categories',async(req,res)=>{
  v.body(req.query,['page'],[]);const page=req.query.page===undefined?1:input.integer(Number(req.query.page),'page',1,10000);
  res.json(await withPlatform(req,'catalogue.read',async db=>({categories:(await db.query('SELECT * FROM catalogue_categories ORDER BY parent_id NULLS FIRST,name,id LIMIT 200 OFFSET $1',[(page-1)*200])).rows,page,pageSize:200,units:input.units})));
});
catalogueAdmin.get('/categories/:id',async(req,res)=>{const id=v.uuid(req.params.id);res.json(await withPlatform(req,'catalogue.read',async db=>{const row=(await db.query('SELECT * FROM catalogue_categories WHERE id=$1',[id])).rows[0];if(!row)throw new HttpError(404,'NOT_FOUND','Category not found.');return {category:row};}));});
async function saveCategory(req,res,create){const d=input.category(req.body),id=create?randomUUID():v.uuid(req.params.id);res.status(create?201:200).json(await withPlatform(req,'catalogue.manage',async(db,ctx)=>{
  const old=create?null:(await db.query('SELECT * FROM catalogue_categories WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!create&&!old)throw new HttpError(404,'NOT_FOUND','Category not found.');if(old){expectRevision(old,d.revision);if(old.parent_id!==d.parentId||old.kind!==d.kind)throw new HttpError(400,'CATEGORY_STRUCTURE_FIXED','Create a new category to change its parent or listing type.');}
  if(d.parentId){const parent=(await db.query('SELECT kind FROM catalogue_categories WHERE id=$1 AND parent_id IS NULL FOR SHARE',[d.parentId])).rows[0];if(!parent||parent.kind!==d.kind)throw new HttpError(400,'INVALID_PARENT','Choose a main category of the same listing type.');}
  if(create)await db.query('INSERT INTO catalogue_categories(id,parent_id,name,slug,kind,attribute_schema,active) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,d.parentId,d.name,d.slug,d.kind,JSON.stringify(d.schema),d.active]);
  else await db.query('UPDATE catalogue_categories SET name=$1,slug=$2,attribute_schema=$3,active=$4,revision=revision+1,updated_at=now() WHERE id=$5',[d.name,d.slug,JSON.stringify(d.schema),d.active,id]);
  await audit(db,{actor:ctx.userId,action:create?'catalogue.category_created':'catalogue.category_updated',target:id,metadata:{active:d.active,revision:old?old.revision+1:1}});return {id,message:'Category saved. Re-save affected definitions after a schema revision before they can appear publicly.'};
}));}
catalogueAdmin.post('/categories',async(req,res)=>saveCategory(req,res,true));catalogueAdmin.put('/categories/:id',async(req,res)=>saveCategory(req,res,false));
catalogueAdmin.get('/products',async(req,res)=>{
  v.body(req.query,['search','category','brand','page'],[]);
  const q=input.query(req.query);
  res.json(await withPlatform(req,'catalogue.read',async db=>{const bind=new Bindings(),conditions=['true'];if(q.search)conditions.push(`p.search_document @@ websearch_to_tsquery('simple',${bind.add(q.search)})`);if(q.category){const key=bind.add(q.category);conditions.push(`(p.category_id=${key} OR p.subcategory_id=${key})`);}if(q.brand)conditions.push(`lower(p.brand)=${bind.add(input.normalize(q.brand))}`);return paged(db,'p.id,p.name,p.brand,p.model,p.category_id,p.subcategory_id,p.status,p.public_visible,p.revision,c.name AS category_name','FROM catalogue_products p JOIN catalogue_categories c ON c.id=p.category_id',conditions.join(' AND '),bind,q.page);}));
});
catalogueAdmin.get('/products/:id',async(req,res)=>{const id=v.uuid(req.params.id);res.json(await withPlatform(req,'catalogue.read',async db=>{const product=(await db.query('SELECT id,category_id,subcategory_id,name,brand,model,description,attributes,unit,image_urls,warranty,source_note,status,public_visible,revision,schema_revision FROM catalogue_products WHERE id=$1',[id])).rows[0];if(!product)throw new HttpError(404,'NOT_FOUND','Definition not found.');return {product};}));});
async function saveProduct(req,res,create){
  v.body(req.body,['revision','schemaRevision','categoryId','subcategoryId','name','brand','model','description','attributes','unit','images','warranty','sourceNote','status','visible']);const categoryId=v.uuid(req.body.categoryId),subcategoryId=req.body.subcategoryId===null?null:v.uuid(req.body.subcategoryId),id=create?randomUUID():v.uuid(req.params.id);
  res.status(create?201:200).json(await withPlatform(req,'catalogue.manage',async(db,ctx)=>{
    const old=create?null:(await db.query('SELECT revision FROM catalogue_products WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!create&&!old)throw new HttpError(404,'NOT_FOUND','Definition not found.');if(old)expectRevision(old,input.revision(req.body.revision));
    const {root,leaf}=await categoryRules(db,categoryId,subcategoryId);expectRevision(leaf,input.revision(req.body.schemaRevision));const fields={...req.body};delete fields.schemaRevision;const d=input.product(fields,leaf.attribute_schema);if(d.status==='published'&&(!root.active||!leaf.active))throw new HttpError(409,'CATEGORY_INACTIVE','Activate the category before publishing a definition.');
    d.brand=d.brand.normalize('NFKC').replace(/\s+/gu,' ');
    const values=[d.categoryId,d.subcategoryId,d.name,d.brand,d.model,d.description,JSON.stringify(d.attributes),d.unit,d.images,d.warranty,d.sourceNote,d.status,d.visible,leaf.revision,d.status==='published'?ctx.userId:null,d.status==='published'?new Date():null];
    if(create)await db.query(`INSERT INTO catalogue_products(category_id,subcategory_id,name,brand,model,description,attributes,unit,image_urls,warranty,source_note,status,public_visible,schema_revision,published_by,published_at,id,created_by) VALUES(${Array.from({length:18},(_,i)=>`$${i+1}`).join(',')})`,[...values,id,ctx.userId]);
    else await db.query('UPDATE catalogue_products SET category_id=$1,subcategory_id=$2,name=$3,brand=$4,model=$5,description=$6,attributes=$7,unit=$8,image_urls=$9,warranty=$10,source_note=$11,status=$12,public_visible=$13,schema_revision=$14,published_by=$15,published_at=$16,revision=revision+1,updated_at=now() WHERE id=$17',[...values,id]);
    await audit(db,{actor:ctx.userId,action:create?'catalogue.definition_created':'catalogue.definition_updated',target:id,metadata:{status:d.status,visible:d.visible,revision:old?old.revision+1:1}});return {id,message:'Definition saved. Offers tied to an older product revision require renewed review.'};
  }));
}
catalogueAdmin.post('/products',async(req,res)=>saveProduct(req,res,true));catalogueAdmin.put('/products/:id',async(req,res)=>saveProduct(req,res,false));
catalogueAdmin.get('/offers',async(req,res)=>{
  v.body(req.query,['page','status'],[]);const page=req.query.page===undefined?1:input.integer(Number(req.query.page),'page',1,10000);const status=req.query.status?v.choice(req.query.status,['draft','pending','approved','rejected','inactive'],'offer state'):'pending';
  res.json(await withPlatform(req,'offers.review',async db=>{const bind=new Bindings();return paged(db,'o.id,o.company_id,o.status,o.revision,o.price_mode,o.price_paise,o.currency,o.price_unit,p.name AS product_name,b.public_name AS company_name','FROM distributor_offers o JOIN catalogue_products p ON p.id=o.product_id JOIN company_branding b ON b.company_id=o.company_id',`o.status=${bind.add(status)}`,bind,page,'o.updated_at,o.id');}));
});
catalogueAdmin.get('/offers/:id',async(req,res)=>{
  const id=v.uuid(req.params.id);res.json(await withPlatform(req,'offers.review',async db=>{const result=await db.query('SELECT o.id,o.company_id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.estimated,o.tax_mode,o.tax_rate,o.availability,o.stock_maintained,o.stock_quantity,o.minimum_order,o.coverage_labels,o.public_terms,o.terms_confirmed,o.status,o.published,o.revision,p.name AS product_name,p.revision AS product_revision,b.public_name AS company_name FROM distributor_offers o JOIN catalogue_products p ON p.id=o.product_id JOIN company_branding b ON b.company_id=o.company_id WHERE o.id=$1',[id]);if(!result.rowCount)throw new HttpError(404,'NOT_FOUND','Offer not found.');const offer=result.rows[0];return {offer,history:await offerHistory(db,offer.company_id,id)};}));
});
catalogueAdmin.post('/offers/:id/review',async(req,res)=>{
  const id=v.uuid(req.params.id);v.body(req.body,['revision','productRevision','action','reason']);const revision=input.revision(req.body.revision),expectedProductRevision=input.revision(req.body.productRevision),action=v.choice(req.body.action,['approve','reject'],'offer review'),reason=input.plain(req.body.reason,'review reason',500,action==='reject'?10:0);
  res.json(await withPlatform(req,'offers.review',async(db,ctx)=>{
    const reference=(await db.query('SELECT company_id FROM distributor_offers WHERE id=$1',[id])).rows[0];if(!reference)throw new HttpError(404,'NOT_FOUND','Offer not found.');
    const c=(await db.query('SELECT id,created_by FROM companies WHERE id=$1 FOR UPDATE',[reference.company_id])).rows[0];
    const affiliated=await db.query("SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2 AND status<>'removed'",[c.id,ctx.userId]);if(action==='approve'&&(c.created_by===ctx.userId||affiliated.rowCount))throw new HttpError(403,'INDEPENDENT_REVIEW_REQUIRED','An independent platform operator must approve your company’s offer.');
    const offer=(await db.query('SELECT * FROM distributor_offers WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,c.id])).rows[0];expectRevision(offer,revision);if(offer.status!=='pending')throw new HttpError(409,'INVALID_TRANSITION','Only pending offers can be reviewed.');
    const current=(await db.query('SELECT id,revision FROM catalogue_products WHERE id=$1 FOR SHARE',[offer.product_id])).rows[0];expectRevision(current,expectedProductRevision);const product=action==='approve'?await publishedProduct(db,offer.product_id):current;if(action==='approve'){await eligibleCompany(db,c.id);const areas=(await db.query('SELECT label FROM company_service_areas WHERE company_id=$1',[c.id])).rows.map(a=>a.label);if(offer.coverage_labels.some(label=>!areas.includes(label)))throw new HttpError(409,'INVALID_COVERAGE','Coverage has changed; the company must edit and resubmit this offer.');}
    const status=action==='approve'?'approved':'rejected';
    await db.query('UPDATE distributor_offers SET status=$1,published=false,approved_revision=$2,approved_product_revision=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now() WHERE id=$5 AND company_id=$6',[status,action==='approve'?revision:null,action==='approve'?product.revision:null,ctx.userId,id,c.id]);
    await db.query('INSERT INTO offer_reviews(offer_id,company_id,actor_user_id,previous_state,new_state,reason,offer_revision,product_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,c.id,ctx.userId,offer.status,status,reason,revision,product.revision]);
    await audit(db,{actor:ctx.userId,company:c.id,action:`offer.review_${status}`,target:id,metadata:{previous:offer.status,next:status,reason,revision,productRevision:product.revision}});return {message:'Offer review saved. Approval does not publish automatically or establish certification.'};
  }));
});

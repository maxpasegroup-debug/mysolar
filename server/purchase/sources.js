import {HttpError} from '../errors.js';
import {salesPolicy} from '../people-sales.js';
import {publishedProduct} from '../marketplace/service.js';
const conflict=message=>new HttpError(409,'QUOTATION_SOURCE_CHANGED',message);
export async function quotationLead(db,ctx,enquiryId){
 const lead=(await db.query('SELECT id,stage,qualification FROM crm_leads WHERE company_id=$1 AND enquiry_id=$2',[ctx.companyId,enquiryId])).rows[0];
 const policy=await salesPolicy(db,ctx.companyId);
 if(policy.qualification_required&&(!lead||typeof lead.qualification?.requirement!=='string'||!lead.qualification.requirement.trim()||typeof lead.qualification?.siteAddress!=='string'||!lead.qualification.siteAddress.trim()||lead.stage==='lost'))throw conflict('Save the linked lead requirement and site address before preparing or sending this quotation.');
 return lead?.id||null;
}
const productFields=p=>({id:p.id,revision:p.revision,name:p.name,brand:p.brand,model:p.model,categoryId:p.category_id,unit:p.unit,attributes:p.attributes,warranty:p.warranty});
const offerFields=o=>({id:o.id,companyId:o.company_id,productId:o.product_id,revision:o.revision,priceMode:o.price_mode,pricePaise:o.price_paise,currency:o.currency,unit:o.price_unit,estimated:o.estimated,taxMode:o.tax_mode,taxRate:o.tax_rate,availability:o.availability,stockMaintained:o.stock_maintained,stockQuantity:o.stock_quantity,minimumOrder:o.minimum_order,coverage:o.coverage_labels,terms:o.public_terms});
const snapshotObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function validateCapturedPair(prior,item,ctx){
 const product=prior.product_snapshot,offer=prior.offer_snapshot;
 if(!snapshotObject(product)||!snapshotObject(offer)||product.id!==item.productId||
  !Number.isSafeInteger(product.revision)||product.revision<1||offer.id!==item.offerId||
  offer.companyId!==ctx.companyId||offer.productId!==item.productId||offer.revision!==item.offerRevision){
  throw conflict('Stored source details are incomplete or inconsistent. Remove the source link and choose a current offer again.');
 }
}
export async function quotationSourceChoices(db,ctx,{search='',page=1}={}){
 const args=[ctx.companyId,search,(page-1)*20];const from="FROM marketplace_offers o JOIN distributor_offers raw ON raw.id=o.id JOIN marketplace_products p ON p.id=o.product_id JOIN catalogue_products rp ON rp.id=p.id WHERE o.company_id=$1 AND ($2='' OR rp.search_document @@ websearch_to_tsquery('simple',$2))";
 const total=(await db.query('SELECT count(*)::int AS n '+from,args.slice(0,2))).rows[0].n;
 const rows=(await db.query('SELECT o.*,raw.revision,p.name,p.brand,p.model,p.unit AS product_unit,p.attributes,p.attribute_schema '+from+' ORDER BY p.name,o.id LIMIT 20 OFFSET $3',args)).rows;
 return {items:rows.map(o=>({offer:offerFields(o),product:{id:o.product_id,name:o.name,brand:o.brand,model:o.model,unit:o.product_unit,attributes:o.attributes,attribute_schema:o.attribute_schema}})),page,pageSize:20,total,notice:'Eligible published offers from this company only. Recorded availability is not live stock or a reservation. Quotation amounts may be negotiated separately.'};
}
export async function resolveQuotationSources(db,ctx,items,previous=[]){
 const resolved=[];
 for(const item of items){
  const prior=previous.find(p=>p.product_id===item.productId&&p.offer_id===item.offerId&&p.offer_revision===item.offerRevision);
  // Never refresh just one half of a recorded pair, or trust contradictory
  // embedded identity/revision fields. Leave stored history untouched on error.
  if(item.offerId&&prior)validateCapturedPair(prior,item,ctx);
  let productSnapshot={},offerSnapshot={};
  if(item.productId){
   // A product can have multiple historical captures. Keep its snapshot paired
   // with the exact offer revision, rather than borrowing another line's facts.
   const historic=item.offerId
    ? (prior?.offer_snapshot?.id===item.offerId&&prior.product_snapshot?.id===item.productId?prior:null)
    : previous.find(p=>p.product_id===item.productId&&p.product_snapshot?.id===item.productId);
   if(historic)productSnapshot=historic.product_snapshot;else{await db.query('SELECT id FROM catalogue_products WHERE id=$1 FOR SHARE',[item.productId]);productSnapshot={...productFields(await publishedProduct(db,item.productId)),capturedAt:new Date().toISOString()};}
  }
  if(item.offerId){
   if(prior?.offer_snapshot?.id===item.offerId)offerSnapshot=prior.offer_snapshot;
   else{const row=(await db.query('SELECT o.*,raw.revision FROM marketplace_offers o JOIN distributor_offers raw ON raw.id=o.id WHERE o.id=$1 AND o.company_id=$2 AND o.product_id=$3 FOR SHARE OF raw',[item.offerId,ctx.companyId,item.productId])).rows[0];
    if(!row||row.revision!==item.offerRevision)throw conflict('This seller offer is unavailable or changed. Choose a current offer from your own company.');
    offerSnapshot={...offerFields(row),capturedAt:new Date().toISOString()};
   }
   if(offerSnapshot.currency!=='INR'||item.unit!==offerSnapshot.unit)throw conflict('Seller offer currency and unit must match this INR quotation line.');
  }
  resolved.push({...item,productSnapshot,offerSnapshot});
 }
 return resolved;
}

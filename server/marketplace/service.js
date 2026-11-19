import { HttpError } from '../errors.js';
import { normalize } from './validation.js';
export class Bindings{constructor(){this.values=[];}add(value){this.values.push(value);return `$${this.values.length}`;}}
export function areaMatch(bind,q,company='v.id',coverage=null){
  const conditions=[`a.company_id=${company}`];
  if(coverage)conditions.push(`(cardinality(${coverage})=0 OR a.label=ANY(${coverage}))`);
  if(q.state)conditions.push(`a.state_key=${bind.add(q.state)}`);
  if(q.district){const key=bind.add(q.district);conditions.push(`(a.district_key=${key}${q.state?" OR a.scope='state'":''})`);}
  const locality=q.locality||q.area||'';
  const local=locality&&q.pin?bind.add(normalize(locality)):null;
  // Scopes are exclusive. A locality declaration can never act as PIN/district coverage.
  conditions.push(`((a.scope='state' AND a.state_key<>'' AND a.district_key='' AND a.pin='' AND a.locality_key='') OR (a.scope='district' AND a.state_key<>'' AND a.district_key<>'' AND a.pin='' AND a.locality_key='') OR (a.scope='pin' AND a.state_key<>'' AND a.district_key<>'' AND a.pin<>'' AND a.locality_key='') OR (a.scope='locality' AND ${q.state&&q.district&&q.pin&&local?`a.locality_key=${local} AND EXISTS(SELECT 1 FROM postal_localities ref WHERE ref.id=a.locality_reference_id AND ref.pin=a.pin AND ref.locality_key=a.locality_key AND ref.active)`:'false'}))`);
  if(q.pin){
   const pin=bind.add(q.pin);
   conditions.push(`EXISTS(SELECT 1 FROM postal_locations loc WHERE loc.pin=${pin} AND loc.active AND a.state_key=loc.state_key AND (a.scope='state' OR a.district_key=loc.district_key)${q.district?` AND loc.district_key=${bind.add(q.district)}`:''}${local?` AND EXISTS(SELECT 1 FROM postal_localities requested WHERE requested.pin=loc.pin AND requested.locality_key=${local} AND requested.active)`:''})`);
   conditions.push(`(a.scope IN ('state','district') OR a.pin=${pin})`);
  }
  if(q.area&&!q.pin){const key=bind.add(q.area);conditions.push(`(a.locality_key=${key} OR a.district_key=${key} OR a.state_key=${key} OR a.pin=${key})`);}
  return `EXISTS(SELECT 1 FROM company_service_areas a WHERE ${conditions.join(' AND ')})`;
}
export const hasLocation=q=>Boolean(q.state||q.district||q.pin||q.area);
// Quotation routing requires an explicit district-wide declaration. State,
// PIN and named-locality scopes never imply that wider area is served.
export function districtAreaMatch(bind,q,company='v.id',coverage=null){
 const conditions=[`a.company_id=${company}`,"a.scope='district'","a.state_key<>''","a.district_key<>''","a.pin=''","a.locality=''","a.locality_key=''","a.locality_reference_id IS NULL",`a.state_key=${bind.add(q.state)}`,`a.district_key=${bind.add(q.district)}`];
 if(coverage)conditions.push(`(cardinality(${coverage})=0 OR a.label=ANY(${coverage}))`);
 return `EXISTS(SELECT 1 FROM company_service_areas a WHERE ${conditions.join(' AND ')})`;
}
// Partial directory searches show published declarations, not quotation eligibility.
// A named-locality declaration cannot establish eligibility without an installation
// PIN and reviewed locality, but should still be discoverable by state or district.
export function directoryAreaMatch(bind,q,company='v.id',coverage=null){
 if(q.state&&q.district)return districtAreaMatch(bind,q,company,coverage);
 if(q.pin)return areaMatch(bind,q,company,coverage);
 const conditions=[`a.company_id=${company}`,"a.scope IN ('state','district','pin','locality')","a.state_key<>''"];
 if(coverage)conditions.push(`(cardinality(${coverage})=0 OR a.label=ANY(${coverage}))`);
 if(q.state)conditions.push(`a.state_key=${bind.add(q.state)}`);
 if(q.district){const key=bind.add(q.district);conditions.push(`(a.district_key=${key} OR a.scope='state')`);}
 if(q.area){const key=bind.add(q.area);conditions.push(`(a.locality_key=${key} OR a.district_key=${key} OR a.state_key=${key} OR a.pin=${key})`);}
 return `EXISTS(SELECT 1 FROM company_service_areas a WHERE ${conditions.join(' AND ')})`;
}
export async function filterCategories(db){return (await db.query('SELECT c.id,c.parent_id,c.name,c.kind,c.slug,c.attribute_schema,c.discovery_key,c.description,c.localized_names,c.localized_descriptions,c.display_order FROM catalogue_categories c WHERE c.active AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM catalogue_categories parent WHERE parent.id=c.parent_id AND parent.active)) ORDER BY c.parent_id NULLS FIRST,c.display_order,c.name,c.id LIMIT 200')).rows;}
export function productFilter(bind,q,{publicOnly=true}={}){
  const conditions=['true'];
  if(q.search)conditions.push(`raw.search_document @@ websearch_to_tsquery('simple',${bind.add(q.search)})`);
  if(q.category){const key=bind.add(q.category);conditions.push(`(p.category_id=${key} OR p.subcategory_id=${key} OR p.category_id IN (SELECT id FROM catalogue_categories WHERE discovery_category_id=${key} AND EXISTS(SELECT 1 FROM catalogue_categories root WHERE root.id=${key} AND root.active)))`);}
  if(q.brand)conditions.push(`lower(p.brand)=${bind.add(normalize(q.brand))}`);
  if(q.kind)conditions.push(`p.kind=${bind.add(q.kind)}`);
  if(publicOnly&&(q.price||hasLocation(q)||q.service||q.availability||q.sellers)){
    const offer=['o.product_id=p.id'];
    if(q.price)offer.push(`o.price_mode=${bind.add(q.price)}`);
    if(q.availability)offer.push(`o.availability=${bind.add(q.availability)}`);
    if(hasLocation(q))offer.push(areaMatch(bind,q,'o.company_id','o.coverage_labels'));
    if(q.service)offer.push(`${bind.add(q.service)}=ANY(v.services)`);
    conditions.push(`EXISTS(SELECT 1 FROM marketplace_offers o JOIN marketplace_vendors v ON v.id=o.company_id WHERE ${offer.join(' AND ')})`);
  }
  return conditions.join(' AND ');
}
export async function paged(db,select,from,where,bind,page,order='p.updated_at DESC,p.id',size=20){
  const count=await db.query(`SELECT count(*)::int AS total ${from} WHERE ${where}`,bind.values);
  const rows=await db.query(`SELECT ${select} ${from} WHERE ${where} ORDER BY ${order} LIMIT ${size} OFFSET $${bind.values.length+1}`,[...bind.values,(page-1)*size]);
  return {items:rows.rows,total:count.rows[0].total,page,pageSize:size};
}
export async function publishedProduct(db,id){const result=await db.query('SELECT * FROM marketplace_products WHERE id=$1',[id]);if(!result.rowCount)throw new HttpError(404,'NOT_FOUND','Published product or service not found.');return result.rows[0];}
export async function eligibleCompany(db,id){const result=await db.query('SELECT id FROM marketplace_vendors WHERE id=$1',[id]);if(!result.rowCount)throw new HttpError(409,'COMPANY_NOT_PUBLISHED','Your company must be active, approved and published before submitting or publishing offers.');}
export async function categoryRules(db,categoryId,subcategoryId){
  const root=await db.query('SELECT * FROM catalogue_categories WHERE id=$1 AND parent_id IS NULL FOR SHARE',[categoryId]);
  if(!root.rowCount)throw new HttpError(400,'INVALID_CATEGORY','Choose a valid main category.');
  const leaf=subcategoryId?(await db.query('SELECT * FROM catalogue_categories WHERE id=$1 AND parent_id=$2 FOR SHARE',[subcategoryId,categoryId])).rows[0]:root.rows[0];
  if(!leaf)throw new HttpError(400,'INVALID_CATEGORY','This subcategory does not belong to the selected category.');
  return {root:root.rows[0],leaf};
}
export async function offerHistory(db,companyId,id){return (await db.query('SELECT previous_state,new_state,reason,offer_revision,product_revision,created_at FROM offer_reviews WHERE company_id=$1 AND offer_id=$2 ORDER BY id DESC LIMIT 30',[companyId,id])).rows;}

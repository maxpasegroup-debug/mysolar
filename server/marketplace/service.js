import { HttpError } from '../errors.js';
import { normalize } from './validation.js';
export class Bindings{constructor(){this.values=[];}add(value){this.values.push(value);return `$${this.values.length}`;}}
export function areaMatch(bind,q,company='v.id',coverage=null){
  const conditions=[`a.company_id=${company}`];
  if(coverage)conditions.push(`(cardinality(${coverage})=0 OR a.label=ANY(${coverage}))`);
  if(q.state)conditions.push(`a.state_key=${bind.add(q.state)}`);
  if(q.district){const key=bind.add(q.district);conditions.push(`(a.district_key=${key} OR a.locality_key=${key}${q.state?" OR a.scope='state'":''})`);}
  if(q.pin){const pin=bind.add(q.pin);conditions.push(`(a.pin=${pin} OR a.locality_key=${pin} OR EXISTS(SELECT 1 FROM postal_locations loc WHERE loc.pin=${pin} AND loc.active AND a.state_key=loc.state_key AND (a.scope='state' OR a.scope='district' AND a.district_key=loc.district_key)))`);}
  if(q.area){const key=bind.add(q.area);conditions.push(`(a.locality_key=${key} OR a.district_key=${key} OR a.state_key=${key} OR a.pin=${key})`);}
  return `EXISTS(SELECT 1 FROM company_service_areas a WHERE ${conditions.join(' AND ')})`;
}
export const hasLocation=q=>Boolean(q.state||q.district||q.pin||q.area);
export async function filterCategories(db){return (await db.query('SELECT c.id,c.parent_id,c.name,c.kind,c.slug,c.attribute_schema FROM catalogue_categories c WHERE c.active AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM catalogue_categories parent WHERE parent.id=c.parent_id AND parent.active)) ORDER BY c.parent_id NULLS FIRST,c.name,c.id LIMIT 200')).rows;}
export function productFilter(bind,q,{publicOnly=true}={}){
  const conditions=['true'];
  if(q.search)conditions.push(`raw.search_document @@ websearch_to_tsquery('simple',${bind.add(q.search)})`);
  if(q.category){const key=bind.add(q.category);conditions.push(`(p.category_id=${key} OR p.subcategory_id=${key})`);}
  if(q.brand)conditions.push(`lower(p.brand)=${bind.add(normalize(q.brand))}`);
  if(q.kind)conditions.push(`p.kind=${bind.add(q.kind)}`);
  if(publicOnly&&(q.price||hasLocation(q)||q.service)){
    const offer=['o.product_id=p.id'];
    if(q.price)offer.push(`o.price_mode=${bind.add(q.price)}`);
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

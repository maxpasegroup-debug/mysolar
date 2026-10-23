import { Router } from 'express';
import { pool,transaction } from '../db/pool.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import { Bindings,areaMatch,hasLocation,productFilter,paged,publishedProduct,filterCategories } from './service.js';
import { HttpError } from '../errors.js';
import { publicBrand } from './presentation.js';
export const discovery=Router();
discovery.get('/categories',async(req,res)=>{
  v.body(req.query,['page'],[]);const page=req.query.page===undefined?1:input.integer(Number(req.query.page),'page',1,10000);
  const result=await pool.query('SELECT c.id,c.parent_id,c.slug,c.name,c.kind,c.attribute_schema,c.discovery_key,c.description,c.localized_names,c.localized_descriptions,c.display_order FROM catalogue_categories c WHERE c.active AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM catalogue_categories parent WHERE parent.id=c.parent_id AND parent.active)) ORDER BY c.parent_id NULLS FIRST,c.display_order,c.name,c.id LIMIT 200 OFFSET $1',[(page-1)*200]);
  res.json({categories:result.rows,page,pageSize:200});
});
discovery.get('/products',async(req,res)=>{
  const q=input.query(req.query);
  res.json(await transaction(async db=>{
    const bind=new Bindings();const where=productFilter(bind,q);
    const offer=['o.product_id=p.id'];
    if(hasLocation(q))offer.push(areaMatch(bind,q,'o.company_id','o.coverage_labels'));
    if(q.price)offer.push(`o.price_mode=${bind.add(q.price)}`);
    if(q.availability)offer.push(`o.availability=${bind.add(q.availability)}`);
    if(q.service)offer.push(`${bind.add(q.service)}=ANY(v.services)`);
    const result=await paged(db,`p.*,listing.offer_count,listing.offer_previews`,
      `FROM marketplace_products p JOIN catalogue_products raw ON raw.id=p.id CROSS JOIN LATERAL (
       SELECT count(*)::int AS offer_count,coalesce(jsonb_agg(preview ORDER BY preview->>'id') FILTER(WHERE n<=3),'[]') AS offer_previews FROM (
        SELECT jsonb_build_object('id',o.id,'company_id',o.company_id,'seller_name',v.name,'price_mode',o.price_mode,'price_paise',o.price_paise,'currency',o.currency,'price_unit',o.price_unit,'estimated',o.estimated,'tax_mode',o.tax_mode,'availability',o.availability,'updated_at',o.updated_at) AS preview,row_number() OVER(ORDER BY o.id) AS n
        FROM marketplace_offers o JOIN marketplace_vendors v ON v.id=o.company_id WHERE ${offer.join(' AND ')}
       ) eligible) listing`,where,bind,q.page);
    return {...result,categories:await filterCategories(db),locationFiltered:hasLocation(q)};
  }));
});
discovery.get('/products/:id',async(req,res)=>{
  const id=v.uuid(req.params.id);const q=input.query(req.query);const page=q.page;
  res.json(await transaction(async db=>{
    const product=await publishedProduct(db,id);const bind=new Bindings();
    const where=[`o.product_id=${bind.add(id)}`];if(hasLocation(q))where.push(areaMatch(bind,q,'v.id','o.coverage_labels'));
    const offers=await paged(db,'o.*,v.name AS vendor_name,v.logo_url AS vendor_logo','FROM marketplace_offers o JOIN marketplace_vendors v ON v.id=o.company_id',where.join(' AND '),bind,page,'v.name,o.id');
    return {product,offers};
  }));
});
discovery.get('/vendors',async(req,res)=>{
  const q=input.query(req.query);
  res.json(await transaction(async db=>{
    const bind=new Bindings(),conditions=['true'];
    if(q.search){const value=bind.add(q.search);conditions.push(`(v.name ILIKE '%'||${value}||'%' OR v.description ILIKE '%'||${value}||'%')`);}
    if(hasLocation(q))conditions.push(areaMatch(bind,q));
    if(q.service)conditions.push(`${bind.add(q.service)}=ANY(v.services)`);
    if(q.category||q.brand||q.price||q.kind||q.availability||q.sellers){const offer=['o.company_id=v.id'];if(q.category){const key=bind.add(q.category);offer.push(`(p.category_id=${key} OR p.subcategory_id=${key} OR p.category_id IN (SELECT id FROM catalogue_categories WHERE discovery_category_id=${key} AND EXISTS(SELECT 1 FROM catalogue_categories root WHERE root.id=${key} AND root.active)))`);}if(q.brand)offer.push(`lower(p.brand)=${bind.add(input.normalize(q.brand))}`);if(q.price)offer.push(`o.price_mode=${bind.add(q.price)}`);if(q.availability)offer.push(`o.availability=${bind.add(q.availability)}`);if(q.kind)offer.push(`p.kind=${bind.add(q.kind)}`);if(hasLocation(q))offer.push(areaMatch(bind,q,'v.id','o.coverage_labels'));conditions.push(`EXISTS(SELECT 1 FROM marketplace_offers o JOIN marketplace_products p ON p.id=o.product_id WHERE ${offer.join(' AND ')})`);}
    const result=await paged(db,`v.*,(SELECT coalesce(json_agg(x),'[]') FROM (SELECT DISTINCT p.category_id AS id,p.category_name AS name FROM marketplace_offers o JOIN marketplace_products p ON p.id=o.product_id WHERE o.company_id=v.id LIMIT 30) x) AS offered_categories`,'FROM marketplace_vendors v',conditions.join(' AND '),bind,q.page,'v.name,v.id');return {...result,items:result.items.map(publicBrand),categories:await filterCategories(db)};
  }));
});
discovery.get('/vendors/:id',async(req,res)=>{
  const id=v.uuid(req.params.id);v.body(req.query,['page','search','category','state','district','pin','area'],[]);const q=input.query(req.query),page=q.page;
  res.json(await transaction(async db=>{
    const result=await db.query('SELECT * FROM marketplace_vendors WHERE id=$1',[id]);if(!result.rowCount)throw new HttpError(404,'NOT_FOUND','Published distributor profile not found.');
    const areas=await db.query('SELECT scope,label,state,district,pin,locality FROM company_service_areas WHERE company_id=$1 ORDER BY label LIMIT 20',[id]);
    const bind=new Bindings(),where=[`o.company_id=${bind.add(id)}`];if(hasLocation(q))where.push(areaMatch(bind,q,'o.company_id','o.coverage_labels'));if(q.search){const key=bind.add(q.search);where.push(`(p.name ILIKE '%'||${key}||'%' OR p.brand ILIKE '%'||${key}||'%' OR p.model ILIKE '%'||${key}||'%')`);}if(q.category){const key=bind.add(q.category);where.push(`(p.category_id=${key} OR p.subcategory_id=${key})`);}const offers=await paged(db,'o.*,p.name AS product_name,p.brand,p.model,p.image_urls,p.kind,p.category_name','FROM marketplace_offers o JOIN marketplace_products p ON p.id=o.product_id',where.join(' AND '),bind,page,'p.name,o.id');
    return {vendor:publicBrand(result.rows[0]),areas:areas.rows,offers,categories:await filterCategories(db)};
  }));
});

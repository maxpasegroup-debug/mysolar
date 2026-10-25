import {requireCustomer} from '../auth/account-type.js';
import { randomUUID } from 'node:crypto';
import { transaction,audit } from '../db/pool.js';
import { lockedUser } from '../auth/sessions.js';
import { permissionsFor } from '../permissions.js';
import { HttpError,badInput } from '../errors.js';
import { Bindings,areaMatch,paged,publishedProduct,filterCategories } from '../marketplace/service.js';
export const notFound=()=>new HttpError(404,'NOT_FOUND','This private record was not found.');
export const conflict=message=>new HttpError(409,'WORKFLOW_CHANGED',message);
export async function withCustomer(req,permission,work){return transaction(async db=>{const user=await lockedUser(db,req);if(permission!=='customer.profile'||(req.originalUrl||'').split('?')[0]!=='/api/reminders/preferences')requireCustomer(user);if(!(await permissionsFor(db,'customer')).includes(permission))throw new HttpError(403,'PERMISSION_DENIED','Customer access is unavailable.');return work(db,user);});}
export function active(ctx){if(ctx.lifecycle!=='active')throw new HttpError(403,'COMPANY_INACTIVE','Your company must be active to use enquiries and quotations.');}
export function expect(record,revision){if(record.revision!==revision)throw conflict('This record changed. Refresh before continuing.');}
export function open(enquiry){if(['closed','cancelled'].includes(enquiry.status))throw conflict('This enquiry is closed or cancelled.');}
export async function ownEnquiry(db,user,id,lock=false){const row=(await db.query(`SELECT e.* FROM customer_enquiries e WHERE e.id=$1 AND e.customer_id=$2 ${lock?'FOR UPDATE':''}`,[id,user.id])).rows[0];if(!row)throw notFound();return row;}
export async function receivedEnquiry(db,ctx,id,lock=false){active(ctx);const row=(await db.query(`SELECT e.* FROM customer_enquiries e JOIN enquiry_recipients r ON r.enquiry_id=e.id WHERE e.id=$1 AND r.company_id=$2 ${lock?'FOR UPDATE OF e':''}`,[id,ctx.companyId])).rows[0];if(!row)throw notFound();return row;}
export async function matching(db,data,page=1,companyId=null){
 let product=null;if(data.productId){product=await publishedProduct(db,data.productId);if(data.categoryId&&![product.category_id,product.subcategory_id].includes(data.categoryId))throw badInput('The selected product is outside this category.');}
 if(data.categoryId&&!(await db.query('SELECT id FROM catalogue_categories WHERE id=$1 AND active',[data.categoryId])).rowCount)throw badInput('Choose an active category.');
 const b=new Bindings(),where=[areaMatch(b,data.location),"commercial_public_allowed(v.id,'crm')"];if(companyId)where.push(`v.id=${b.add(companyId)}`);
 if(data.service)where.push(`${b.add(data.service)}=ANY(v.services)`);
 if(data.productId||data.categoryId||data.offerId){const terms=['o.company_id=v.id',areaMatch(b,data.location,'v.id','o.coverage_labels')];if(data.productId)terms.push(`o.product_id=${b.add(data.productId)}`);if(data.categoryId){const c=b.add(data.categoryId);terms.push(`(p.category_id=${c} OR p.subcategory_id=${c})`);}if(data.offerId)terms.push(`o.id=${b.add(data.offerId)}`);where.push(`EXISTS(SELECT 1 FROM marketplace_offers o JOIN marketplace_products p ON p.id=o.product_id WHERE ${terms.join(' AND ')})`);}
 return {...await paged(db,'v.id,v.name,v.city,v.services,v.service_areas','FROM marketplace_vendors v',where.join(' AND '),b,page,'v.name,v.id'),product};
}
export async function eligibleRecipients(db,data){
 if(data.companyIds.length)await db.query('SELECT id FROM companies WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[data.companyIds]);
 if(data.companyIds.length&&(data.productId||data.categoryId||data.offerId)){
  // Hold definition/category publication stable until routing commits. Offer edits already lock their company.
  const products=(await db.query(`SELECT p.id,p.category_id,p.subcategory_id FROM catalogue_products p WHERE EXISTS(SELECT 1 FROM distributor_offers o WHERE o.product_id=p.id AND o.company_id=ANY($1::uuid[]) AND ($2::uuid IS NULL OR o.id=$2)) AND ($3::uuid IS NULL OR p.id=$3) AND ($4::uuid IS NULL OR p.category_id=$4 OR p.subcategory_id=$4) ORDER BY p.id FOR SHARE OF p`,[data.companyIds,data.offerId,data.productId,data.categoryId])).rows;
  const categories=[...new Set(products.flatMap(p=>[p.category_id,p.subcategory_id]).filter(Boolean))];
  if(categories.length)await db.query('SELECT id FROM catalogue_categories WHERE id=ANY($1::uuid[]) ORDER BY parent_id NULLS FIRST,id FOR SHARE',[categories]);
 }
 // Reuse exactly the preview predicate, bounded to selected IDs rather than silently matching new vendors.
 const b=new Bindings(),where=[`v.id=ANY(${b.add(data.companyIds)}::uuid[])`,areaMatch(b,data.location),"commercial_public_allowed(v.id,'crm')"];
 if(data.service)where.push(`${b.add(data.service)}=ANY(v.services)`);
 if(data.productId)await publishedProduct(db,data.productId);
 if(data.categoryId&&!(await db.query('SELECT id FROM catalogue_categories WHERE id=$1 AND active',[data.categoryId])).rowCount)throw badInput('This category is unavailable.');
 if(data.productId&&data.categoryId){const p=await publishedProduct(db,data.productId);if(![p.category_id,p.subcategory_id].includes(data.categoryId))throw badInput('Product and category do not match.');}
 if(data.productId||data.categoryId||data.offerId){const terms=['o.company_id=v.id',areaMatch(b,data.location,'v.id','o.coverage_labels')];if(data.productId)terms.push(`o.product_id=${b.add(data.productId)}`);if(data.categoryId){const c=b.add(data.categoryId);terms.push(`(p.category_id=${c} OR p.subcategory_id=${c})`);}if(data.offerId)terms.push(`o.id=${b.add(data.offerId)}`);where.push(`EXISTS(SELECT 1 FROM marketplace_offers o JOIN marketplace_products p ON p.id=o.product_id WHERE ${terms.join(' AND ')})`);}
 const rows=(await db.query(`SELECT v.id,v.name,v.city FROM marketplace_vendors v WHERE ${where.join(' AND ')} ORDER BY v.id`,b.values)).rows;
 if(rows.length!==data.companyIds.length)throw conflict('A selected distributor is no longer eligible for this request and location. Review recipients again.');return rows;
}
export async function event(db,{enquiryId,companyId=null,actor,action,versionId=null,customerVisible=true}){
 await db.query('INSERT INTO enquiry_events(enquiry_id,company_id,actor_id,action,version_id,customer_visible) VALUES($1,$2,$3,$4,$5,$6)',[enquiryId,companyId,actor,action,versionId,customerVisible]);
 await audit(db,{actor,company:companyId,action:'purchase.'+action,target:enquiryId,metadata:{versionId}});
}
export async function notify(db,enquiry,message,{companyId=null,versionId=null}={}){
 if(companyId){await db.query(`INSERT INTO workflow_notifications(id,user_id,company_id,enquiry_id,version_id,message)
 SELECT gen_random_uuid(),m.user_id,m.company_id,$1,$2,$3 FROM company_memberships m JOIN users u ON u.id=m.user_id
 WHERE m.company_id=$4 AND m.status='active' AND u.status='active' AND EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role_id=m.role_id AND rp.permission_id='leads.read')`,[enquiry.id,versionId,message,companyId]);}
 else await db.query('INSERT INTO workflow_notifications(id,user_id,enquiry_id,version_id,message) VALUES($1,$2,$3,$4,$5)',[randomUUID(),enquiry.customer_id,enquiry.id,versionId,message]);
}
export const effective=(alias='q')=>`CASE WHEN ${alias}.status='sent' AND ${alias}.valid_until<(now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'expired' WHEN ${alias}.status='sent' AND e.preferred_version_id=${alias}.id THEN 'preferred' WHEN ${alias}.status='sent' AND ${alias}.request_type<>'' THEN ${alias}.request_type||'_requested' WHEN ${alias}.status='sent' AND ${alias}.viewed_at IS NOT NULL THEN 'viewed' ELSE ${alias}.status END`;
export async function quoteRecord(db,id,{user=null,ctx=null,lock=false}={}){
 const scope=user?'e.customer_id=$2 AND q.status<>\'draft\'':'q.company_id=$2';
 const row=(await db.query(`SELECT q.*,${effective()} AS effective_status,e.preferred_version_id,e.status AS enquiry_status,e.revision AS enquiry_revision FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE q.id=$1 AND ${scope} ${lock?'FOR UPDATE OF q':''}`,[id,user?user.id:ctx.companyId])).rows[0];if(!row)throw notFound();if(ctx){const {preferred_version_id,...safe}=row;return {...safe,has_preference:Boolean(preferred_version_id),is_preferred:preferred_version_id===row.id};}return customerQuote(row);
}
export async function items(db,id){return (await db.query('SELECT product_id,description,brand,model,specifications,quantity,unit,unit_price_paise,discount_paise,tax_rate,amounts FROM quotation_line_items WHERE version_id=$1 ORDER BY position',[id])).rows;}
export function customerEnquiry(e){const {contact_snapshot,customer_id,submission_key,...safe}=e;return safe;}
export function companyEnquiry(e){const {customer_id,submission_key,offer_id,preferred_version_id,...safe}=e;return {...safe,has_preference:Boolean(preferred_version_id)};}
export function customerQuote(q){const {created_by,review_status,approval_revision,reviewed_policy_revision,reviewer_id,approval_override,...safe}=q;return safe;}
export async function details(db,enquiry,{ctx=null,page=1}={}){
 const b=new Bindings(),terms=[`x.enquiry_id=${b.add(enquiry.id)}`];if(ctx)terms.push(`(x.company_id=${b.add(ctx.companyId)} OR x.company_id IS NULL)`);else terms.push('x.customer_visible');
 const history=await paged(db,'x.action,x.company_id,x.version_id,x.created_at','FROM enquiry_events x',terms.join(' AND '),b,page,'x.id DESC');
 const recipients=(await db.query(`SELECT company_id,vendor_snapshot,viewed_at,created_at FROM enquiry_recipients WHERE enquiry_id=$1 ${ctx?'AND company_id=$2':''} ORDER BY created_at,company_id`,ctx?[enquiry.id,ctx.companyId]:[enquiry.id])).rows;
 const mb=new Bindings(),mw=[`x.enquiry_id=${mb.add(enquiry.id)}`];if(ctx)mw.push(`x.company_id=${mb.add(ctx.companyId)}`);
 const messages=await paged(db,'x.id,x.company_id,x.version_id,x.author_side,x.kind,x.body,x.created_at','FROM enquiry_messages x',mw.join(' AND '),mb,page,'x.created_at DESC,x.id');
 const qb=new Bindings(),qw=[`q.enquiry_id=${qb.add(enquiry.id)}`];if(ctx)qw.push(`q.company_id=${qb.add(ctx.companyId)}`);else qw.push("q.status<>'draft'");
 const quotations=await paged(db,`q.id,q.enquiry_id,q.company_id,q.reference,q.version,q.total_paise,q.currency,q.valid_until,q.issuer_snapshot,q.estimated,q.tax_mode,${effective()} AS effective_status`,'FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id',qw.join(' AND '),qb,page,'q.created_at DESC,q.id');
 const result={enquiry:ctx?companyEnquiry(enquiry):customerEnquiry(enquiry),recipients,history,messages,quotations};
 if(ctx){const nb=new Bindings();result.notes=await paged(db,'x.id,x.body,x.created_at','FROM enquiry_internal_notes x',`x.enquiry_id=${nb.add(enquiry.id)} AND x.company_id=${nb.add(ctx.companyId)}`,nb,page,'x.created_at DESC,x.id');result.permissions=ctx.permissions;}
 return result;
}
export async function listEnquiries(db,q,{user=null,ctx=null}={}){
 const b=new Bindings(),where=[user?`e.customer_id=${b.add(user.id)}`:`r.company_id=${b.add(ctx.companyId)}`];
 if(q.search){const s=b.add(q.search);where.push(`(e.title ILIKE '%'||${s}||'%' OR e.requested_item ILIKE '%'||${s}||'%')`);}
 if(q.status==='unread'&&ctx)where.push('r.viewed_at IS NULL');else if(q.status)where.push(`e.status=${b.add(q.status)}`);
 if(q.category)where.push(`e.category_id=${b.add(q.category)}`);if(q.area){const a=b.add(q.area);where.push(`(e.state ILIKE '%'||${a}||'%' OR e.district ILIKE '%'||${a}||'%' OR e.pin=${a} OR e.locality ILIKE '%'||${a}||'%')`);}
 if(q.from)where.push(`e.created_at>=${b.add(q.from)}::date`);if(q.to)where.push(`e.created_at<${b.add(q.to)}::date+interval '1 day'`);
 return {...await paged(db,`e.id,e.title,e.requested_item,e.status,e.state,e.district,e.pin,e.category_id,e.created_at,e.revision${ctx?',r.viewed_at':''}`,user?'FROM customer_enquiries e':'FROM customer_enquiries e JOIN enquiry_recipients r ON r.enquiry_id=e.id',where.join(' AND '),b,q.page,'e.created_at DESC,e.id'),categories:await filterCategories(db)};
}
export async function quoteList(db,q,{user=null,ctx=null}={}){const b=new Bindings(),where=[user?`e.customer_id=${b.add(user.id)} AND q.status<>'draft'`:`q.company_id=${b.add(ctx.companyId)}`];if(q.status==='review_pending'&&ctx)where.push("q.status='draft' AND q.review_status='pending'");else if(q.status==='preferred'&&user)where.push('e.preferred_version_id=q.id');else if(q.status)where.push(`(${effective()})=${b.add(q.status)}`);if(q.search)where.push(`q.reference ILIKE '%'||${b.add(q.search)}||'%'`);return paged(db,`${ctx?'q.review_status,q.revision,':''}q.id,q.enquiry_id,q.reference,q.version,q.company_id,q.issuer_snapshot,q.total_paise,q.currency,q.valid_until,q.estimated,q.tax_mode,e.title,${effective()} AS effective_status`,'FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id',where.join(' AND '),b,q.page,'q.created_at DESC,q.id');}
export async function sendMessage(db,enquiry,{companyId,actor,side,kind,body,versionId=null}){
 if(!(await db.query('SELECT 1 FROM enquiry_recipients WHERE enquiry_id=$1 AND company_id=$2',[enquiry.id,companyId])).rowCount)throw notFound();
 if(versionId){const q=(await db.query("SELECT id FROM quotation_versions WHERE id=$1 AND enquiry_id=$2 AND company_id=$3 AND status<>'draft'",[versionId,enquiry.id,companyId])).rows[0];if(!q)throw notFound();}
 open(enquiry);await db.query('INSERT INTO enquiry_messages(id,enquiry_id,company_id,version_id,author_id,author_side,kind,body) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),enquiry.id,companyId,versionId,actor,side,kind,body]);
 if(!enquiry.preferred_version_id)await db.query("UPDATE customer_enquiries SET status=CASE WHEN status IN ('submitted','sent') THEN 'discussion' ELSE status END,revision=revision+1,updated_at=now() WHERE id=$1",[enquiry.id]);
 await event(db,{enquiryId:enquiry.id,companyId,actor,action:side+'_'+kind,versionId});await notify(db,enquiry,side==='customer'?'Customer sent a message.':'Distributor sent a response.',{companyId:side==='customer'?companyId:null,versionId});
}

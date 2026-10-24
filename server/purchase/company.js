import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireUser,csrf } from '../auth/sessions.js';
import { withCompany } from '../tenancy/context.js';
import {reviewRequirement,enforceQuoteReview,reviewDraft} from './review.js';
import { paragraph } from '../setup/validation.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import * as s from './service.js';
export const purchaseCompany=Router();purchaseCompany.use(requireUser);purchaseCompany.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
const tenant=(req,permission,work)=>withCompany(req,permission,(db,ctx)=>{s.active(ctx);return work(db,ctx);});
async function validDate(db,date){if(!(await db.query("SELECT 1 WHERE $1::date>=(now() AT TIME ZONE 'Asia/Kolkata')::date",[date])).rowCount)throw s.conflict('Validity must be today or a future date in India time.');}
purchaseCompany.get('/enquiries',async(req,res)=>{const q=input.filters(req.query);res.json(await tenant(req,'leads.read',(db,ctx)=>s.listEnquiries(db,q,{ctx})));});
purchaseCompany.get('/enquiries/:id',async(req,res)=>{const id=v.uuid(req.params.id),q=input.filters(req.query);res.json(await tenant(req,'leads.read',async(db,ctx)=>s.details(db,await s.receivedEnquiry(db,ctx,id),{ctx,page:q.page})));});
purchaseCompany.post('/enquiries/:id/view',async(req,res)=>{const id=v.uuid(req.params.id);v.body(req.body,[]);res.json(await tenant(req,'leads.read',async(db,ctx)=>{const e=await s.receivedEnquiry(db,ctx,id,true);const result=await db.query('UPDATE enquiry_recipients SET viewed_at=now() WHERE enquiry_id=$1 AND company_id=$2 AND viewed_at IS NULL RETURNING enquiry_id',[id,ctx.companyId]);if(result.rowCount){await s.event(db,{enquiryId:id,companyId:ctx.companyId,actor:ctx.userId,action:'distributor_viewed'});await s.notify(db,e,'A distributor viewed your enquiry.');}return {message:'Enquiry marked as read.'};}));});
purchaseCompany.post('/enquiries/:id/notes',async(req,res)=>{const id=v.uuid(req.params.id);v.body(req.body,['body']);const body=paragraph(req.body.body,'internal note');if(!body)throw s.conflict('Enter a note.');res.json(await tenant(req,'enquiries.manage',async(db,ctx)=>{await s.receivedEnquiry(db,ctx,id,true);await db.query('INSERT INTO enquiry_internal_notes(id,enquiry_id,company_id,author_id,body) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,ctx.companyId,ctx.userId,body]);await s.event(db,{enquiryId:id,companyId:ctx.companyId,actor:ctx.userId,action:'internal_note_added',customerVisible:false});return {message:'Private company note saved.'};}));});
purchaseCompany.post('/enquiries/:id/messages',async(req,res)=>{const id=v.uuid(req.params.id);v.body(req.body,['body','kind']);const body=paragraph(req.body.body,'message'),kind=v.choice(req.body.kind,['clarification','response'],'message type');if(!body)throw s.conflict('Enter a message.');res.json(await tenant(req,'enquiries.manage',async(db,ctx)=>{const e=await s.receivedEnquiry(db,ctx,id,true);await s.sendMessage(db,e,{companyId:ctx.companyId,actor:ctx.userId,side:'distributor',kind,body});return {message:'Customer-facing message saved.'};}));});
purchaseCompany.get('/quotations',async(req,res)=>{const q=input.filters(req.query);res.json(await tenant(req,'quotations.read',(db,ctx)=>s.quoteList(db,q,{ctx})));});
purchaseCompany.get('/quotations/:id',async(req,res)=>{const id=v.uuid(req.params.id);res.json(await tenant(req,'quotations.read',async(db,ctx)=>{const quote=await s.quoteRecord(db,id,{ctx});const relatedOrders=ctx.permissions.includes('orders.read')?(await db.query("SELECT o.id,o.reference,o.status FROM business_orders o JOIN quotation_versions q ON q.id=o.quotation_id AND q.company_id=o.company_id WHERE o.company_id=$1 AND q.quotation_id=$2 ORDER BY o.created_at DESC,o.id LIMIT 5",[ctx.companyId,quote.quotation_id])).rows:[];const items=await s.items(db,id);return {quote,items,relatedOrders,permissions:ctx.permissions,review:await reviewRequirement(db,ctx,quote,items),reviewHistory:(await db.query('SELECT action,quote_revision,policy_revision,reason,created_at FROM quotation_review_events WHERE version_id=$1 AND company_id=$2 ORDER BY id DESC LIMIT 50',[id,ctx.companyId])).rows};}));});
async function insertItems(db,id,items){for(let i=0;i<items.length;i++){const x=items[i];if(x.productId&&!(await db.query('SELECT id FROM marketplace_products WHERE id=$1',[x.productId])).rowCount)throw s.conflict('A referenced catalogue definition is no longer public. Remove the link while preserving supplied quotation details.');await db.query(`INSERT INTO quotation_line_items(version_id,position,product_id,description,brand,model,specifications,quantity,unit,unit_price_paise,discount_paise,tax_rate,amounts) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[id,i,x.productId,x.description,x.brand,x.model,x.specifications,x.quantity,x.unit,x.unitPricePaise,x.discountPaise,x.taxRate,x.amounts]);}}
purchaseCompany.post('/enquiries/:id/quotations',async(req,res)=>{
 const enquiryId=v.uuid(req.params.id),data=input.quote(req.body);res.status(201).json(await tenant(req,'quotations.manage',async(db,ctx)=>{
  const e=await s.receivedEnquiry(db,ctx,enquiryId,true);s.open(e);await validDate(db,data.validUntil);if(e.preferred_version_id)throw s.conflict('The customer must clear their preference before a new revision.');
  let group=(await db.query('SELECT id FROM enquiry_quotations WHERE enquiry_id=$1 AND company_id=$2',[enquiryId,ctx.companyId])).rows[0];
  if(!group){group={id:randomUUID()};await db.query('INSERT INTO enquiry_quotations(id,enquiry_id,company_id) VALUES($1,$2,$3)',[group.id,enquiryId,ctx.companyId]);}
  const previous=(await db.query('SELECT * FROM quotation_versions WHERE quotation_id=$1 ORDER BY version DESC LIMIT 1',[group.id])).rows[0];
  if(previous?.status==='draft')throw s.conflict('An editable draft already exists. Open it from Quotations.');
  if(previous&&previous.revision!==data.revision)throw s.conflict('The previous version changed. Refresh before revising.');
  const id=randomUUID();await db.query(`INSERT INTO quotation_versions(id,quotation_id,enquiry_id,company_id,version,previous_id,reference,valid_until,tax_mode,included,excluded,warranty,timeframe,payment_terms,assumptions,installation_scope,delivery_paise,installation_paise,charges_tax_rate,total_paise,totals,estimated,created_by)
   VALUES(${Array.from({length:23},(_,i)=>'$'+(i+1)).join(',')})`,[id,group.id,enquiryId,ctx.companyId,(previous?.version||0)+1,previous?.id||null,data.reference,data.validUntil,data.taxMode,data.included,data.excluded,data.warranty,data.timeframe,data.paymentTerms,data.assumptions,data.installationScope,data.deliveryPaise,data.installationPaise,data.chargesTaxRate,data.totalPaise,data.totals,data.estimated,ctx.userId]);
  await insertItems(db,id,data.items);await s.event(db,{enquiryId,companyId:ctx.companyId,actor:ctx.userId,action:'quotation_drafted',versionId:id,customerVisible:false});return {id,message:'Private draft saved. Review it before sending.'};
 }));
});
purchaseCompany.put('/quotations/:id',async(req,res)=>{
 const id=v.uuid(req.params.id),data=input.quote(req.body);res.json(await tenant(req,'quotations.manage',async(db,ctx)=>{
  const initial=await s.quoteRecord(db,id,{ctx}),e=await s.receivedEnquiry(db,ctx,initial.enquiry_id,true),q=await s.quoteRecord(db,id,{ctx,lock:true});s.open(e);s.expect(q,data.revision);await validDate(db,data.validUntil);if(q.status!=='draft')throw s.conflict('Issued content cannot be edited. Create a new revision.');if(e.preferred_version_id)throw s.conflict('Customer preference must be cleared before editing.');
  await db.query(`UPDATE quotation_versions SET reference=$1,valid_until=$2,tax_mode=$3,included=$4,excluded=$5,warranty=$6,timeframe=$7,payment_terms=$8,assumptions=$9,installation_scope=$10,delivery_paise=$11,installation_paise=$12,charges_tax_rate=$13,total_paise=$14,totals=$15,estimated=$16,review_status='none',approval_revision=NULL,reviewed_policy_revision=NULL,reviewer_id=NULL,approval_override=false,revision=revision+1 WHERE id=$17 AND company_id=$18`,[data.reference,data.validUntil,data.taxMode,data.included,data.excluded,data.warranty,data.timeframe,data.paymentTerms,data.assumptions,data.installationScope,data.deliveryPaise,data.installationPaise,data.chargesTaxRate,data.totalPaise,data.totals,data.estimated,id,ctx.companyId]);
  await db.query('DELETE FROM quotation_line_items WHERE version_id=$1',[id]);await insertItems(db,id,data.items);await s.event(db,{enquiryId:e.id,companyId:ctx.companyId,actor:ctx.userId,action:'quotation_draft_saved',versionId:id,customerVisible:false});return {id,message:'Private draft updated.'};
 }));
});
purchaseCompany.post('/quotations/:id/actions',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['revision','action']);const revision=input.revision(req.body.revision),action=v.choice(req.body.action,['send','withdraw'],'quotation action');res.json(await tenant(req,'quotations.send',async(db,ctx)=>{
  const initial=await s.quoteRecord(db,id,{ctx}),e=await s.receivedEnquiry(db,ctx,initial.enquiry_id,true),q=await s.quoteRecord(db,id,{ctx,lock:true});s.expect(q,revision);
  if(action==='send'){
   s.open(e);if(q.status!=='draft'||e.preferred_version_id)throw s.conflict('Only a draft on an open enquiry without a preferred quotation can be sent.');
   const issuer=(await db.query('SELECT name,public_email,public_phone FROM marketplace_vendors WHERE id=$1',[ctx.companyId])).rows[0];if(!issuer)throw s.conflict('Your company must remain approved and published to issue a quotation.');
   if(!(await db.query("SELECT 1 FROM quotation_versions WHERE id=$1 AND valid_until>=(now() AT TIME ZONE 'Asia/Kolkata')::date",[id])).rowCount)throw s.conflict('Update the validity date before sending.');
   const lineItems=await s.items(db,id);if(!lineItems.length)throw s.conflict('Add line items before sending.');await enforceQuoteReview(db,ctx,q,lineItems);
   await db.query("UPDATE quotation_versions SET status='superseded',revision=revision+1 WHERE quotation_id=$1 AND status='sent'",[q.quotation_id]);
   await db.query("UPDATE quotation_versions SET status='sent',sent_at=now(),quote_date=(now() AT TIME ZONE 'Asia/Kolkata')::date,issuer_snapshot=$1,customer_snapshot=$2,revision=revision+1 WHERE id=$3",[issuer,{name:e.contact_snapshot.name,title:e.title,address:e.address,state:e.state,district:e.district,pin:e.pin,requested_item:e.requested_item},id]);
   await db.query("UPDATE customer_enquiries SET status='quotation_received',revision=revision+1,updated_at=now() WHERE id=$1",[e.id]);
  }else{
   if(q.status!=='sent')throw s.conflict('Only an issued current quotation can be withdrawn.');
   await db.query("UPDATE quotation_versions SET status='withdrawn',revision=revision+1 WHERE id=$1",[id]);
   if(e.preferred_version_id===id)await db.query("UPDATE customer_enquiries SET preferred_version_id=NULL,status=CASE WHEN status IN ('closed','cancelled') THEN status ELSE 'quotation_received' END,revision=revision+1,updated_at=now() WHERE id=$1",[e.id]);
  }
  const label=action==='send'?(q.version>1?'quotation_revised':'quotation_issued'):'quotation_withdrawn';await s.event(db,{enquiryId:e.id,companyId:ctx.companyId,actor:ctx.userId,action:label,versionId:id});await s.notify(db,e,label.replaceAll('_',' ')+'.',{versionId:id});return {id,message:action==='send'?'Quotation issued privately to the customer.':'Quotation withdrawn. Its history is retained.'};
 }));
});

purchaseCompany.post('/quotations/:id/review',async(req,res)=>{v.body(req.body,['revision','action','reason']);const action=v.choice(req.body.action,['submit','approve','reject','override'],'review action'),id=v.uuid(req.params.id);res.json(await tenant(req,action==='submit'?'quotations.manage':'quotations.approve',async(db,ctx)=>{const q=await s.quoteRecord(db,id,{ctx,lock:true});s.expect(q,input.revision(req.body.revision));return reviewDraft(db,ctx,q,action,req.body.reason);}));});

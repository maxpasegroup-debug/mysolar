import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireUser,csrf } from '../auth/sessions.js';
import { filterCategories } from '../marketplace/service.js';
import { paragraph } from '../setup/validation.js';
import * as v from '../validation.js';
import * as input from './validation.js';
import * as s from './service.js';
import { assistance } from './assistance.js';
export const purchaseCustomer=Router();purchaseCustomer.use(requireUser);purchaseCustomer.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrf(req,res,next));
const own=(req,fn,quotes=false)=>s.withCustomer(req,quotes?'customer.quotations.own':'customer.enquiries.own',fn);
purchaseCustomer.get('/enquiry-options',async(req,res)=>{v.body(req.query,['productId','companyId','offerId'],[]);res.json(await own(req,async(db,user)=>{
 let product=null,vendor=null;if(req.query.productId){const {publishedProduct}=await import('../marketplace/service.js');product=await publishedProduct(db,v.uuid(req.query.productId));}
 if(req.query.companyId)vendor=(await db.query('SELECT id,name FROM marketplace_vendors WHERE id=$1',[v.uuid(req.query.companyId)])).rows[0]||null;
 if(req.query.offerId){const offer=(await db.query('SELECT id,company_id,product_id FROM marketplace_offers WHERE id=$1',[v.uuid(req.query.offerId)])).rows[0];if(!offer||offer.company_id!==vendor?.id||offer.product_id!==product?.id)throw s.conflict('This marketplace offer is no longer available.');}
 return {categories:await filterCategories(db),product,vendor,profile:(await db.query('SELECT phone FROM customer_profiles WHERE user_id=$1',[user.id])).rows[0],submissionKey:randomUUID()};
}));});
purchaseCustomer.post('/enquiry-matches',async(req,res)=>{v.body(req.body,['enquiry','page','companyId'],['enquiry','page']);const data=input.enquiry(req.body.enquiry,true),companyId=req.body.companyId?v.uuid(req.body.companyId):null;const page=Number(req.body.page);if(!Number.isSafeInteger(page)||page<1||page>10000)throw s.conflict('Invalid page.');res.json(await own(req,db=>s.matching(db,data,page,companyId)));});
purchaseCustomer.post('/enquiries',async(req,res)=>{
 const data=input.enquiry(req.body);res.status(201).json(await own(req,async(db,user)=>{
  const existing=(await db.query('SELECT id FROM customer_enquiries WHERE customer_id=$1 AND submission_key=$2',[user.id,data.submissionKey])).rows[0];if(existing)return {id:existing.id,message:'This enquiry was already saved.'};
  const recipients=await s.eligibleRecipients(db,data);
  // A direct request may also be saved privately if its intended recipient does not match.
  if(!recipients.length&&data.mode!=='direct'&&(await s.matching(db,data)).total>0)throw s.conflict('Choose the distributors who should receive this enquiry.');
  const profile=(await db.query('SELECT phone FROM customer_profiles WHERE user_id=$1',[user.id])).rows[0];if(data.contactMethod==='phone'&&!profile?.phone)throw s.conflict('Save your phone number in Profile & settings first, or choose in-app contact.');
  const id=randomUUID(),contact={name:user.display_name,method:data.contactMethod,...(data.contactMethod==='email'?{email:user.email}:{}),...(data.contactMethod==='phone'?{phone:profile.phone}:{})};
  await db.query(`INSERT INTO customer_enquiries(id,customer_id,submission_key,title,requested_item,category_id,product_id,offer_id,quantity,unit,project_type,state,district,pin,locality,address,requirements,contact_method,contact_snapshot,timeframe,distribution_mode,status,requested_service)
   VALUES(${Array.from({length:23},(_,i)=>'$'+(i+1)).join(',')})`,[id,user.id,data.submissionKey,data.title,data.requestedItem,data.categoryId,data.productId,data.offerId,data.quantity,data.unit,data.projectType,data.state,data.district,data.pin,data.locality,data.address,data.requirements,data.contactMethod,contact,data.timeframe,data.mode,recipients.length?'sent':'submitted',data.service]);
  const enquiry={id,customer_id:user.id};await s.event(db,{enquiryId:id,actor:user.id,action:'submitted'});
  for(const vendor of recipients){await db.query('INSERT INTO enquiry_recipients(enquiry_id,company_id,vendor_snapshot) VALUES($1,$2,$3)',[id,vendor.id,vendor]);await s.event(db,{enquiryId:id,companyId:vendor.id,actor:user.id,action:'distributed'});await s.notify(db,enquiry,'A new customer enquiry is available.',{companyId:vendor.id});}
  if(recipients.length)await s.notify(db,enquiry,`Enquiry sent to ${recipients.length} selected distributor${recipients.length===1?'':'s'}.`);
  return {id,message:recipients.length?'Enquiry saved and sent to the named distributors.':'Enquiry saved privately with no eligible recipients selected. Nothing was sent.'};
 }));
});
purchaseCustomer.get('/enquiries',async(req,res)=>{const q=input.filters(req.query);res.json(await own(req,(db,user)=>s.listEnquiries(db,q,{user})));});
purchaseCustomer.get('/enquiries/:id',async(req,res)=>{const id=v.uuid(req.params.id),q=input.filters(req.query);res.json(await own(req,async(db,user)=>s.details(db,await s.ownEnquiry(db,user,id),{page:q.page})));});
purchaseCustomer.post('/enquiries/:id/actions',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['revision','action']);const revision=input.revision(req.body.revision),action=v.choice(req.body.action,['close','cancel','clear_preference'],'enquiry action');
 res.json(await own(req,async(db,user)=>{const e=await s.ownEnquiry(db,user,id,true);s.expect(e,revision);s.open(e);if(action==='clear_preference'&&!e.preferred_version_id)throw s.conflict('No preferred quotation is selected.');
 await db.query("UPDATE customer_enquiries SET status=$1,preferred_version_id=CASE WHEN $3='close' THEN preferred_version_id ELSE NULL END,revision=revision+1,updated_at=now() WHERE id=$2",[action==='close'?'closed':action==='cancel'?'cancelled':'quotation_received',id,action]);
 await s.event(db,{enquiryId:id,actor:user.id,action});for(const r of (await db.query('SELECT company_id FROM enquiry_recipients WHERE enquiry_id=$1',[id])).rows)await s.notify(db,e,'Customer updated the enquiry: '+action.replaceAll('_',' ')+'.',{companyId:r.company_id});return {message:'Enquiry updated. No order or payment was created.'};}));
});
purchaseCustomer.post('/enquiries/:id/messages',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['companyId','body']);const companyId=v.uuid(req.body.companyId),body=paragraph(req.body.body,'message');if(!body)throw s.conflict('Enter a message.');
 res.json(await own(req,async(db,user)=>{const e=await s.ownEnquiry(db,user,id,true);await s.sendMessage(db,e,{companyId,actor:user.id,side:'customer',kind:'message',body});return {message:'Message saved in the private conversation.'};}));
});
purchaseCustomer.get('/quotations',async(req,res)=>{const q=input.filters(req.query);res.json(await own(req,(db,user)=>s.quoteList(db,q,{user}),true));});
purchaseCustomer.get('/quotations/:id',async(req,res)=>{const id=v.uuid(req.params.id);res.json(await own(req,async(db,user)=>{const quote=await s.quoteRecord(db,id,{user});const items=await s.items(db,id);return {quote:s.customerQuote(quote),items,assistance:assistance(quote,items)};},true));});
purchaseCustomer.post('/quotations/:id/actions',async(req,res)=>{
 const id=v.uuid(req.params.id);v.body(req.body,['revision','enquiryRevision','action','body']);const revision=input.revision(req.body.revision),enquiryRevision=input.revision(req.body.enquiryRevision),action=v.choice(req.body.action,['view','prefer','clarification','revision'],'quotation action'),body=paragraph(req.body.body,'message');
 res.json(await own(req,async(db,user)=>{
  const initial=await s.quoteRecord(db,id,{user}),e=await s.ownEnquiry(db,user,initial.enquiry_id,true),q=await s.quoteRecord(db,id,{user,lock:true});s.expect(q,revision);
  if(action==='view'){if(!q.viewed_at){await db.query('UPDATE quotation_versions SET viewed_at=now() WHERE id=$1',[id]);await s.event(db,{enquiryId:e.id,companyId:q.company_id,actor:user.id,action:'quotation_viewed',versionId:id});await s.notify(db,e,'Customer viewed a quotation.',{companyId:q.company_id,versionId:id});}return {message:'Marked as viewed.'};}
  s.open(e);if(q.status!=='sent'||q.effective_status==='expired')throw s.conflict('This quotation is expired, withdrawn or superseded. Request a current quotation through the enquiry.');
  if(action==='prefer'){s.expect(e,enquiryRevision);if(q.tax_mode==='unknown')throw s.conflict('Ask the distributor to confirm tax treatment in a revision before selecting this quotation.');if(e.preferred_version_id===id)return {message:'This quotation is already preferred.'};
   await db.query("UPDATE customer_enquiries SET preferred_version_id=$1,status='preferred',revision=revision+1,updated_at=now() WHERE id=$2",[id,e.id]);await s.event(db,{enquiryId:e.id,companyId:q.company_id,actor:user.id,action:'customer_preferred',versionId:id});
   for(const r of (await db.query('SELECT company_id FROM enquiry_recipients WHERE enquiry_id=$1',[e.id])).rows)await s.notify(db,e,r.company_id===q.company_id?'Customer marked your quotation as preferred. This is not an order.':'Customer updated their preferred quotation. This is not an order.',{companyId:r.company_id});
   return {message:'Preferred quotation recorded. No order, acceptance or payment authorization was created.'};
  }
  if(e.preferred_version_id)throw s.conflict('Clear your preferred quotation before requesting changes.');if(!body)throw s.conflict('Enter your clarification or revision request.');
  await s.sendMessage(db,e,{companyId:q.company_id,actor:user.id,side:'customer',kind:action,body,versionId:id});await db.query('UPDATE quotation_versions SET request_type=$1,revision=revision+1 WHERE id=$2',[action,id]);return {message:'Request saved. The issued quotation contents have not changed.'};
 },true));
});
purchaseCustomer.get('/comparison',async(req,res)=>{
 v.body(req.query,['enquiryId']);const id=v.uuid(req.query.enquiryId);res.json(await own(req,async(db,user)=>{
  const enquiry=await s.ownEnquiry(db,user,id);const rows=(await db.query(`SELECT q.*,${s.effective()} AS effective_status FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE e.id=$1 AND e.customer_id=$2 AND q.status<>'draft' AND NOT EXISTS(SELECT 1 FROM quotation_versions n WHERE n.quotation_id=q.quotation_id AND n.version>q.version AND n.status<>'draft') ORDER BY q.company_id LIMIT 10`,[id,user.id])).rows;
  const quotations=[];for(const quote of rows){const items=await s.items(db,quote.id);quotations.push({quote:s.customerQuote(quote),items,assistance:assistance(quote,items)});}return {enquiry:s.customerEnquiry(enquiry),quotations};
 },true));
});

import {prepareInstallation} from './installation-fixture.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Runs only inside database.test's disposable schema, using existing business APIs.
export async function connectedJourney(t,{db,a,b,customer,stranger,companyA,product,enquiryId,quote}){
 let quotation,order,project,invoice,service,contact;
 const success=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.data));return response.data;};
 await t.test('connected journey: PIN discovery, two issued quotations and explicit preference share one enquiry',async()=>{
  assert.equal(success(await customer.request('/public/products/'+product+'?pin=682001')).offers.total,2);
  assert.equal(success(await customer.request('/public/products/'+product+'?pin=682099')).offers.total,0);
  assert.equal(success(await customer.request('/public/vendors?pin=682001')).total,2);
  assert.equal(success(await customer.request('/public/vendors?pin=682099')).total,0);
  assert.equal(success(await customer.request('/public/vendors/'+companyA+'?pin=682099')).offers.total,0);
  assert.equal((await customer.request('/public/products/'+product+'?pin=000000')).status,400);
  const competitor=success(await b.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',{...quote(1),reference:'TEST-OTHER-QUOTE'}),201);
  success(await b.request('/companies/current/quotations/'+competitor.id+'/actions','POST',{revision:1,action:'send'}));
  const comparison=success(await customer.request('/customer/comparison?enquiryId='+enquiryId));assert.equal(comparison.quotations.length,2);
  quotation=comparison.quotations.find(x=>x.quote.company_id===companyA).quote;
  const enquiry=success(await customer.request('/customer/enquiries/'+enquiryId)).enquiry;
  success(await customer.request('/customer/quotations/'+quotation.id+'/actions','POST',{revision:quotation.revision,enquiryRevision:enquiry.revision,action:'prefer',body:''}));
  assert.equal(success(await customer.request('/customer/experience/journeys/'+enquiryId)).orders.length,0);
  assert.equal((await stranger.request('/customer/experience/journeys/'+enquiryId)).status,404);
 });
 await t.test('connected journey: immutable quotation order needs both confirmations and rejects duplicate conversion',async()=>{
  const payload={operationKey:randomUUID(),quotationId:quotation.id,reference:'TEST-CONNECTED-ORDER',billingAddress:'[TEST] billing',serviceAddress:'[TEST] solar site',expectedDate:null,ownerId:a.user.id,acceptanceMode:'in_app'};
  order=success(await a.request('/companies/current/operations/orders','POST',payload),201).id;
  assert.equal(success(await a.request('/companies/current/operations/orders','POST',payload),201).id,order);
  assert.equal((await a.request('/companies/current/operations/orders','POST',{...payload,operationKey:randomUUID()})).status,409);
  assert.equal((await customer.request('/customer/experience/exports/orders/'+order)).status,404);
  success(await a.request('/companies/current/operations/orders/'+order+'/actions','POST',{revision:1,action:'request_confirmation',reference:'',notes:'[TEST] customer confirmation requested'}));
  assert.equal((await a.request('/companies/current/operations/orders/'+order+'/actions','POST',{revision:2,action:'confirm',reference:'',notes:'[TEST] missing customer consent'})).status,409);
  assert.equal((await stranger.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true})).status,404);
  assert.equal((await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true},{'X-CSRF-Token':''})).status,403);
  assert.equal((await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true},{Origin:'https://untrusted.invalid'})).status,403);
  success(await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true}));
  success(await a.request('/companies/current/operations/orders/'+order+'/actions','POST',{revision:3,action:'confirm',reference:'',notes:'[TEST] explicit distributor acceptance'}));
  const record=success(await customer.request('/customer/operations/record/orders/'+order));assert.equal(record.record.total_paise,quotation.total_paise);assert.equal(record.links.enquiry,enquiryId);assert.equal(record.links.quotation,quotation.id);
  const companyQuote=success(await a.request('/companies/current/quotations/'+quotation.id));assert.ok(companyQuote.relatedOrders.some(x=>x.id===order));
  contact=(await db.query('SELECT contact_id FROM business_orders WHERE id=$1',[order])).rows[0].contact_id;
 });
 await t.test('connected journey: installation milestones and a service report stay linked to the confirmed order',async()=>{
  project=success(await a.request('/companies/current/operations/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:order,leadId:null,reference:'TEST-CONNECTED-PROJECT',name:'[TEST] Connected installation',location:'[TEST] site',scope:'',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:'[TEST] confirmed scope'}),201).id;
  success(await a.request('/companies/current/operations/projects/'+project+'/actions','POST',{revision:1,action:'active',reference:'',notes:'[TEST] start recorded work'}));
  await prepareInstallation(a,project);let revision=(await a.request('/companies/current/operations/record/projects/'+project)).data.record.revision;for(const code of ['survey','design','materials','schedule','installation','inspection','commissioning','handover'])success(await a.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:revision++,code,status:'done',notes:'[TEST] recorded '+code,evidenceReference:'TEST-'+code}));
  success(await a.request('/companies/current/operations/projects/'+project+'/actions','POST',{revision,action:'completed',reference:'TEST-HANDOVER',notes:'[TEST] actual fixture completion'}));
  const tracked=success(await customer.request('/customer/operations/record/projects/'+project));assert.equal(tracked.links.order,order);assert.equal(tracked.links.enquiry,enquiryId);assert.equal(tracked.milestones.filter(m=>m.status==='done').length,8);
  const issue={operationKey:randomUUID(),issue:'[TEST] Please inspect the system after handover',priority:'normal'};
  service=success(await customer.request('/customer/operations/orders/'+order+'/service','POST',issue),201).id;
  assert.equal(success(await customer.request('/customer/operations/orders/'+order+'/service','POST',issue),201).id,service);
  assert.equal((await stranger.request('/customer/operations/record/service/'+service)).status,404);
 });
 await t.test('connected journey: issued invoice, safe exports, notifications and all stages retain exact identities',async()=>{
  const due=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  invoice=success(await a.request('/companies/current/operations/invoices','POST',{operationKey:randomUUID(),orderId:order,reference:'TEST-CONNECTED-INVOICE',dueDate:due}),201).id;
  assert.equal((await customer.request('/customer/experience/exports/invoices/'+invoice)).status,404);
  success(await a.request('/companies/current/operations/invoices/'+invoice+'/actions','POST',{revision:1,action:'issue',reason:'[TEST] actual invoice issued'}));
  const journey=success(await customer.request('/customer/experience/journeys/'+enquiryId));for(const [kind,id] of [['orders',order],['projects',project],['invoices',invoice],['service',service]])assert.ok(journey[kind].some(x=>x.id===id),kind+' connected');
  for(const [kind,id] of [['quotations',quotation.id],['orders',order],['projects',project],['invoices',invoice],['service',service]]){
   const response=await customer.request('/customer/experience/exports/'+kind+'/'+id);const exported=success(response);assert.equal(exported.record.id,id);assert.match(response.headers.get('content-disposition'),/attachment/);assert.match(response.headers.get('cache-control'),/no-store/);
   assert.doesNotMatch(JSON.stringify(exported),/PRIVATE-COMPANY|PRIVATE-OFFER-COST|created_by|evidence_reference|agreement_notes/);
   assert.equal((await stranger.request('/customer/experience/exports/'+kind+'/'+id)).status,404);
  }
  assert.equal(success(await customer.request('/customer/experience/exports/invoices/'+invoice)).commercial.total_paise,quotation.total_paise);
  const csv=await customer.request('/customer/experience/exports/orders/'+order+'?format=csv');assert.equal(csv.status,200);assert.match(csv.headers.get('content-type'),/text\/csv/);assert.ok(csv.data.includes('TEST-CONNECTED-ORDER'));
  assert.equal((await customer.request('/customer/experience/exports/orders/'+order+'?format=html')).status,200);assert.equal((await customer.request('/customer/experience/exports/orders/'+order+'?format=pdf')).status,400);
  assert.equal((await customer.request('/customer/experience/exports/orders/'+order+'?companyId='+companyA)).status,400);
  const notifications=success(await customer.request('/customer/operations/notifications'));assert.ok(notifications.items.some(n=>n.record_id===project));assert.ok(notifications.items.some(n=>n.record_id===invoice));
  const quotationNotice=notifications.items.find(n=>n.source==='workflow'&&n.version_id);assert.ok(quotationNotice);success(await customer.request('/customer/operations/notifications/workflow/'+quotationNotice.id+'/read','POST',{}));
  const overview=success(await customer.request('/customer/experience/overview'));assert.ok(overview.sections.some(s=>s.key==='projects'));assert.ok(overview.sections.some(s=>s.key==='service'));
  const documents=success(await customer.request('/customer/experience/documents/orders/'+order));assert.equal(documents.fileAvailable,false);assert.deepEqual(documents.exportFormats,['json','csv','html']);
 });
 await t.test('connected journey: service resolution is shared explicitly while document references and staff notes stay private',async()=>{
  success(await a.request('/companies/current/operations/record/orders/'+order+'/documents','POST',{operationKey:randomUUID(),title:'[TEST] Private installation document',reference:'https://private.invalid/PRIVATE-DOCUMENT',documentDate:null,notes:'PRIVATE-DOCUMENT-NOTES'}),201);
  let revision=1;for(const status of ['triaged','assigned','in_progress','resolved'])success(await a.request('/companies/current/operations/service/'+service+'/update','POST',{revision:revision++,status,assigneeId:a.user.id,followUp:null,resolution:['resolved','closed'].includes(status)?'[TEST] repaired and explained to customer':'',resolutionReference:'TEST-SERVICE-EVIDENCE',internalNotes:'PRIVATE-SERVICE-NOTE',customerUpdate:'[TEST] Your service is '+status}));
  const pending=success(await customer.request('/customer/operations/record/service/'+service));success(await customer.request('/customer/operations/service/'+service+'/respond','POST',{operationKey:randomUUID(),revision:pending.record.revision,resolutionId:pending.retention.resolutions[0].id,accepted:true,rating:'5',comment:'[TEST] Your service is closed'}));
  const record=success(await customer.request('/customer/operations/record/service/'+service));assert.equal(record.record.status,'closed');assert.ok(record.history.items.some(event=>event.notes==='[TEST] Your service is closed'));assert.doesNotMatch(JSON.stringify(record),/PRIVATE-SERVICE-NOTE/);
  const exported=success(await customer.request('/customer/experience/exports/orders/'+order));assert.doesNotMatch(JSON.stringify(exported),/PRIVATE-DOCUMENT|private.invalid/);
  const tracked=success(await customer.request('/customer/experience/journeys/'+enquiryId));assert.equal(tracked.service.find(row=>row.id===service).status,'closed');
 });
 await t.test('connected journey: current customer permissions apply to exports, linked stages and notification reads',async()=>{
  const notifications=success(await customer.request('/customer/operations/notifications')),notice=notifications.items.find(row=>row.record_id===service);
  const permissions=['customer.quotations.own','customer.orders.own','customer.installation.own'];
  try{
   await db.query("DELETE FROM role_permissions WHERE role_id='customer' AND permission_id=ANY($1::text[])",[permissions]);
   assert.equal((await customer.request('/customer/experience/exports/quotations/'+quotation.id)).status,403);assert.equal((await customer.request('/customer/experience/exports/orders/'+order)).status,403);
   const journey=success(await customer.request('/customer/experience/journeys/'+enquiryId));for(const kind of ['quotations','orders','projects','invoices','service'])assert.equal(journey[kind].length,0);
   const feed=success(await customer.request('/customer/operations/notifications'));assert.ok(feed.items.every(row=>row.source==='workflow'&&!row.version_id));
   assert.ok(notice);assert.equal((await customer.request('/customer/operations/notifications/operations/'+notice.id+'/read','POST',{})).status,404);
  }finally{for(const permission of permissions)await db.query("INSERT INTO role_permissions(role_id,permission_id) VALUES('customer',$1) ON CONFLICT DO NOTHING",[permission]);}
 });
}

import {recordSurvey,prepareInstallation} from './installation-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function operatingFlows(t,{db,a,b,customer,stranger,companyA,contact,order,item,inventory}){
 const revision=async(table,id)=>(await db.query('SELECT revision FROM '+table+' WHERE id=$1',[id])).rows[0].revision;
 let project,task;
 await t.test('received enquiries convert into tenant-private CRM leads with idempotent creation',async()=>{
  const enquiry=(await db.query('SELECT e.id FROM customer_enquiries e JOIN enquiry_recipients r ON r.enquiry_id=e.id WHERE r.company_id=$1 AND e.customer_id=$2',[companyA,customer.user.id])).rows[0];
  const payload={operationKey:randomUUID(),enquiryId:enquiry.id,contactId:null,title:'',source:'',interest:'',location:'[TEST] site',assigneeId:a.user.id,priority:'normal',nextAction:'[TEST] confirm scope',followUp:null};
  const result=await a.request('/companies/current/operations/leads','POST',payload);assert.equal(result.status,201);assert.equal((await a.request('/companies/current/operations/leads','POST',payload)).data.id,result.data.id);
  assert.equal((await b.request('/companies/current/operations/record/leads/'+result.data.id)).status,404);
  assert.equal((await db.query('SELECT contact_id FROM crm_leads WHERE id=$1',[result.data.id])).rows[0].contact_id,contact);
 });
 await t.test('issued quotation creates an immutable order that still requires both human confirmations',async()=>{
  const quotation=(await db.query("SELECT id,total_paise::text FROM quotation_versions WHERE company_id=$1 AND status='sent'",[companyA])).rows[0];
  const result=await a.request('/companies/current/operations/orders','POST',{operationKey:randomUUID(),quotationId:quotation.id,contactId:null,commercial:null,reference:'TEST-QUOTED-ORDER',billingAddress:'[TEST] billing',serviceAddress:'[TEST] site',expectedDate:null,ownerId:a.user.id,acceptanceMode:'in_app'});assert.equal(result.status,201);const quotedOrder=result.data.id;
  assert.equal((await db.query('SELECT total_paise::text FROM business_orders WHERE id=$1',[quotedOrder])).rows[0].total_paise,quotation.total_paise);
  const action=async value=>a.request('/companies/current/operations/orders/'+quotedOrder+'/actions','POST',{revision:await revision('business_orders',quotedOrder),action:value,reference:'TEST-QUOTE-ACCEPTANCE',notes:'[TEST] reviewed quoted terms'});
  assert.equal((await action('request_confirmation')).status,200);assert.equal((await action('confirm')).status,409);
  assert.equal((await customer.request('/customer/operations/orders/'+quotedOrder+'/confirm','POST',{revision:await revision('business_orders',quotedOrder),confirmTerms:true})).status,200);assert.equal((await action('confirm')).status,200);
 });
 await t.test('project and task permissions follow actual employee assignments and revocation',async()=>{
  assert.equal((await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'field_engineer'})).status,201);
  assert.equal((await stranger.request('/companies/select','POST',{companyId:companyA})).status,200);await stranger.session();
  const result=await a.request('/companies/current/operations/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:order,leadId:null,reference:'TEST-PROJECT',name:'[TEST] agreed project',location:'[TEST] site',scope:'',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:'[TEST] agreed work'});assert.equal(result.status,201);project=result.data.id;
  assert.equal((await stranger.request('/companies/current/operations/record/projects/'+project)).status,404);
  const assign=async action=>a.request('/companies/current/operations/projects/'+project+'/assign','POST',{revision:await revision('installation_projects',project),userId:stranger.user.id,action});
  assert.equal((await assign('assign')).status,200);assert.equal((await stranger.request('/companies/current/operations/record/projects/'+project)).status,200);
  assert.equal((await stranger.request('/companies/current/operations/list/invoices')).status,403);assert.equal((await b.request('/companies/current/operations/record/projects/'+project)).status,404);
  assert.equal((await stranger.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:await revision('installation_projects',project),code:'commissioning',status:'done',notes:'[TEST] disallowed manager step',evidenceReference:'TEST'})).status,409);
  await recordSurvey(a,project);assert.equal((await stranger.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:await revision('installation_projects',project),code:'survey',status:'done',notes:'[TEST] actual field survey record',evidenceReference:'TEST-SURVEY'})).status,200);
  const assigned=await a.request('/companies/current/operations/tasks','POST',{operationKey:randomUUID(),title:'[TEST] assigned field task',description:'',contactId:contact,orderId:order,projectId:project,serviceId:null,assigneeId:stranger.user.id,priority:'normal',dueDate:null});assert.equal(assigned.status,201);task=assigned.data.id;
  for(const status of ['in_progress','completed'])assert.equal((await stranger.request('/companies/current/operations/tasks/'+task+'/update','POST',{revision:await revision('business_tasks',task),status,completionNotes:'[TEST] recorded progress',assigneeId:stranger.user.id})).status,200);
  assert.equal((await assign('remove')).status,200);assert.equal((await stranger.request('/companies/current/operations/record/projects/'+project)).status,404);
  assert.equal((await stranger.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:await revision('installation_projects',project),code:'installation',status:'in_progress',notes:'[TEST] revoked assignment',evidenceReference:''})).status,404);
 });
 await t.test('project completion requires ordered milestones and supporting records; customer sees only owned work',async()=>{
  assert.equal((await a.request('/companies/current/operations/projects/'+project+'/actions','POST',{revision:await revision('installation_projects',project),action:'active',reference:'',notes:'[TEST] start agreed work'})).status,200);
  assert.equal((await a.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:await revision('installation_projects',project),code:'handover',status:'done',notes:'[TEST] premature handover',evidenceReference:'TEST'})).status,409);
  await prepareInstallation(a,project);for(const code of ['design','materials','schedule','installation','inspection','commissioning','handover'])assert.equal((await a.request('/companies/current/operations/projects/'+project+'/milestones','POST',{revision:await revision('installation_projects',project),code,status:'done',notes:'[TEST] recorded milestone',evidenceReference:'TEST-EVIDENCE'})).status,200);
  assert.equal((await a.request('/companies/current/operations/projects/'+project+'/actions','POST',{revision:await revision('installation_projects',project),action:'completed',reference:'TEST-HANDOVER',notes:'[TEST] actual completed work'})).status,200);
  assert.equal((await customer.request('/customer/operations/record/projects/'+project)).status,200);assert.equal((await stranger.request('/customer/operations/record/projects/'+project)).status,404);
  assert.equal((await db.query('SELECT status FROM business_orders WHERE id=$1',[order])).rows[0].status,'confirmed');
 });
 await t.test('stock release restores availability and changed idempotency payloads are rejected',async()=>{
  const payload={operationKey:randomUUID(),orderItemId:item,quantity:'0.5',reason:'[TEST] temporary reservation'},reserve=await a.request('/companies/current/operations/inventory/'+inventory+'/reserve','POST',payload);assert.equal(reserve.status,200);
  assert.equal((await a.request('/companies/current/operations/inventory/'+inventory+'/reserve','POST',{...payload,quantity:'0.6'})).status,409);
  assert.equal((await a.request('/companies/current/operations/reservations/'+reserve.data.id+'/actions','POST',{operationKey:randomUUID(),action:'release',quantity:'0.5',reason:'[TEST] released unused allocation'})).status,200);
  assert.deepEqual((await db.query('SELECT sum(on_hand_delta)::text AS physical,sum(reserved_delta)::text AS reserved FROM inventory_movements WHERE item_id=$1',[inventory])).rows[0],{physical:'5000',reserved:'0'});
 });
 await t.test('supplier payables preserve exact amounts, reject duplicates and remain tenant-private',async()=>{
  const purchase=(await db.query('SELECT id,supplier_id FROM purchase_orders WHERE company_id=$1',[companyA])).rows[0],payload={operationKey:randomUUID(),supplierId:purchase.supplier_id,purchaseId:purchase.id,reference:'TEST-SUPPLIER-BILL',amount:'47.20',taxMode:'inclusive',taxAmount:'7.20',dueDate:new Date(Date.now()+7*86400000).toISOString().slice(0,10),evidenceReference:'TEST-SUPPLIER-INVOICE'};
  const result=await a.request('/companies/current/operations/bills','POST',payload);assert.equal(result.status,201);assert.equal((await a.request('/companies/current/operations/bills','POST',payload)).data.id,result.data.id);
  assert.equal((await a.request('/companies/current/operations/bills','POST',{...payload,operationKey:randomUUID()})).status,409);assert.equal((await b.request('/companies/current/operations/record/bills/'+result.data.id)).status,404);
  assert.deepEqual((await db.query('SELECT amount_paise::text,tax_paise::text FROM supplier_bills WHERE id=$1',[result.data.id])).rows[0],{amount_paise:'4720',tax_paise:'720'});
 });
 await t.test('service resolution follows allowed stages and shares only explicit customer updates',async()=>{
  const service=(await db.query('SELECT id FROM service_requests WHERE company_id=$1 AND order_id=$2',[companyA,order])).rows[0];
  for(const status of ['triaged','assigned','in_progress','resolved']){
   const final=['resolved','closed'].includes(status),result=await a.request('/companies/current/operations/service/'+service.id+'/update','POST',{revision:await revision('service_requests',service.id),status,assigneeId:a.user.id,followUp:null,resolution:final?'PRIVATE-RESOLUTION-TEST':'',resolutionReference:'TEST-REPAIR-EVIDENCE',internalNotes:'PRIVATE-SERVICE-NOTE',customerUpdate:final?'[TEST] Customer-visible resolution':''});assert.equal(result.status,200);
  }
  const pending=(await customer.request('/customer/operations/record/service/'+service.id)).data;assert.equal((await customer.request('/customer/operations/service/'+service.id+'/respond','POST',{operationKey:randomUUID(),revision:pending.record.revision,resolutionId:pending.retention.resolutions[0].id,accepted:true,rating:'5',comment:'[TEST] working again'})).status,200);
  const result=await customer.request('/customer/operations/record/service/'+service.id);assert.equal(result.status,200);assert.equal(result.data.record.status,'closed');assert.ok(!JSON.stringify(result.data).includes('PRIVATE-SERVICE-NOTE'));assert.ok(!JSON.stringify(result.data).includes('PRIVATE-RESOLUTION-TEST'));assert.ok(JSON.stringify(result.data).includes('[TEST] Customer-visible resolution'));
 });
}

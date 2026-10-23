import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('customer home uses owned history, issued quotations and current permissions',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const f=await connectedFixture(t),{db,a,b,customer,stranger,enquiryId,quote}=f;
 const home=async client=>{const r=await client.request('/customer/experience/overview');assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 await t.test('unfamiliar customer sees a new state without another customer’s records',async()=>{
  const data=await home(stranger);assert.equal(data.home.state,'new');assert.equal(data.home.enquiry,null);assert.equal(data.sections.length,0);assert.doesNotMatch(JSON.stringify(data),new RegExp(enquiryId));
  assert.equal((await stranger.request('/customer/experience/overview?userId='+customer.user.id)).status,400);
 });
 await t.test('issued quotations are counted for the selected owned enquiry; drafts are excluded',async()=>{
  let data=await home(customer);assert.equal(data.home.state,'existing');assert.equal(data.home.enquiry.id,enquiryId);assert.equal(data.home.enquiry.quotation_count,1);assert.ok(Date.parse(data.home.asOf));
  const draft=await b.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',{...quote(1),reference:'TEST-HOME-SECOND'});assert.equal(draft.status,201);
  assert.equal((await home(customer)).home.enquiry.quotation_count,1);
  assert.equal((await b.request('/companies/current/quotations/'+draft.data.id+'/actions','POST',{revision:1,action:'send'})).status,200);
  assert.equal((await home(customer)).home.enquiry.quotation_count,2);
 });
 await t.test('closed history never turns an existing customer into a first-time visitor',async()=>{
  await db.query("UPDATE customer_enquiries SET status='closed' WHERE id=$1",[enquiryId]);
  const data=await home(customer);assert.equal(data.home.state,'existing');assert.equal(data.home.enquiry.status,'closed');assert.ok(!data.sections.some(s=>s.key==='enquiries'));
 });
 await t.test('guided advice can be saved through the existing enquiry service without invented equipment',async()=>{
  const r=await stranger.request('/customer/enquiries','POST',{submissionKey:randomUUID(),title:'Help understanding solar options',requestedItem:'Help understanding solar options',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'advice',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] advice site',requirements:'',contactMethod:'in_app',timeframe:'',mode:'matching',service:'energy_consultation',companyIds:[]});
  assert.equal(r.status,201,JSON.stringify(r.data));
  const data=await home(stranger);assert.equal(data.home.state,'existing');assert.equal(data.home.enquiry.id,r.data.id);assert.equal(data.home.enquiry.quotation_count,0);
  const detail=await stranger.request('/customer/enquiries/'+r.data.id);assert.equal(detail.status,200);assert.equal(detail.data.enquiry.requested_service,'energy_consultation');assert.equal(detail.data.recipients.length,0);
 });
 await t.test('revoked quotation permission removes quotation metadata from home',async()=>{
  await db.query("DELETE FROM role_permissions WHERE role_id='customer' AND permission_id='customer.quotations.own'");
  const data=await home(customer);assert.equal(data.home.enquiry.quotation_count,undefined);assert.ok(!data.sections.some(s=>['review','preferred'].includes(s.key)));
  assert.equal((await customer.request('/customer/comparison?enquiryId='+enquiryId)).status,403);
  await db.query("DELETE FROM role_permissions WHERE role_id='customer' AND permission_id='customer.enquiries.own'");
  assert.equal((await home(customer)).home.enquiry,null);
 });
});

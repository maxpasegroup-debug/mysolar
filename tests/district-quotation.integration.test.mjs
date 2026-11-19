import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('district-only quotation matching preserves approved scopes and ignores optional PIN/locality', {skip:!process.env.TEST_DATABASE_URL,timeout:240000},async t=>{
 const fx=await connectedFixture(t),{db,customer,a,b,companyA,companyB,product}=fx;
 const reviewer=fx.client();await reviewer.register('district-independent-reviewer');
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] Independent district review')",[reviewer.user.id]);
 await db.query('UPDATE company_business_profiles SET marketplace_requested=true WHERE company_id=$1',[companyA]);
 await db.query('UPDATE company_onboarding SET profile_saved_at=now(),brand_saved_at=now(),business_saved_at=now() WHERE company_id=$1',[companyA]);
 const revision=async()=>(await db.query('SELECT revision FROM companies WHERE id=$1',[companyA])).rows[0].revision;
 const saved=await a.request('/companies/current/service-areas','PUT',{revision:await revision(),areas:[{scope:'district',label:'[TEST] District',state:'Kerala',district:'Ernakulam',pin:'',locality:'',confirmEntireDistrict:true}]});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const approve=()=>({revision:0,action:'approve_marketplace',reason:'[TEST] Independent district-wide coverage review'});
 let decision=approve();decision.revision=await revision();assert.equal((await a.request('/platform/companies/'+companyA+'/actions','POST',decision)).status,403);
 for(const action of ['approve_marketplace','publish']){const result=await reviewer.request('/platform/companies/'+companyA+'/actions','POST',{revision:await revision(),action,reason:'[TEST] Independent district-wide coverage review'});assert.equal(result.status,200,JSON.stringify(result.data));}
 // Remove reviewed postal data; district coverage must not depend on it.
 await db.query('DELETE FROM postal_localities');await db.query('DELETE FROM postal_locations');
 // The second published fixture declares a narrower locality, which must never
 // be promoted to district-wide coverage, even when the input names that locality.
 await db.query("UPDATE company_service_areas SET scope='locality',pin='682001',locality='[TEST] Harbour',locality_key='[test] harbour' WHERE company_id=$1",[companyB]);
 const payload={title:'[TEST] District enquiry',requestedItem:'[TEST] Solar advice',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'advice',state:' kerala ',district:' ERNAKULAM ',pin:'',locality:'',address:'',requirements:'',contactMethod:'in_app',timeframe:'',mode:'direct',service:'',helpMeChoose:true};
 const match=async(overrides={},companyId)=>customer.request('/customer/enquiry-matches','POST',{enquiry:{...payload,...overrides},page:1,...(companyId?{companyId}:{})});
 const send=async(id,overrides={})=>customer.request('/customer/enquiries','POST',{...payload,...overrides,companyIds:[id],submissionKey:randomUUID()});
 await t.test('blank optional PIN, normalized region and independently approved district match',async()=>{
  const omitted={...payload};delete omitted.pin;delete omitted.locality;
  const omittedResult=await customer.request('/customer/enquiry-matches','POST',{enquiry:omitted,page:1});assert.equal(omittedResult.status,200);assert.deepEqual(omittedResult.data.items.map(v=>v.id),[companyA]);
  const r=await match();assert.equal(r.status,200,JSON.stringify(r.data));assert.deepEqual(r.data.items.map(v=>v.id),[companyA]);
  const sent=await send(companyA);assert.equal(sent.status,201,JSON.stringify(sent.data));assert.deepEqual(sent.data.recipients.length,1);
  const stored=(await db.query('SELECT state,district,pin,locality FROM customer_enquiries WHERE id=$1',[sent.data.id])).rows[0];assert.deepEqual(stored,{state:'Kerala',district:'Ernakulam',pin:'',locality:''});
  assert.equal((await a.request('/companies/current/enquiries/'+sent.data.id)).status,200);
  assert.equal((await b.request('/companies/current/enquiries/'+sent.data.id)).status,404);
 });
 await t.test('optional PIN and locality cannot change district eligibility',async()=>{
  for(const optional of [{pin:'682001',locality:'[TEST] Harbour'},{pin:'999999',locality:'Other locality'}]){
   const r=await match(optional);assert.equal(r.status,200);assert.deepEqual(r.data.items.map(v=>v.id),[companyA]);
   assert.equal((await send(companyB,optional)).status,409);
  }
  assert.equal((await match({pin:'123'})).status,400);
  assert.equal((await match({district:'Kannur'})).data.total,0);
  assert.equal((await match({state:'Tamil Nadu'})).status,400);
 });
 await t.test('product and public profile respect the same district coverage',async()=>{
  const r=await match({productId:product,helpMeChoose:false});assert.equal(r.status,200);assert.deepEqual(r.data.items.map(v=>v.id),[companyA]);
  assert.equal((await customer.request('/public/vendors/'+companyA)).data.quotationCoverage.verified,true);
  assert.equal((await customer.request('/public/vendors/'+companyB)).data.quotationCoverage.verified,false);
  assert.equal((await customer.request('/public/vendors?state=Kerala&district=Ernakulam')).data.items.some(v=>v.id===companyB),false);
  assert.equal((await customer.request('/public/vendors?state=Kerala&district=Coimbatore')).status,400);
  assert.equal((await customer.request('/public/vendors?state=Unknown&district=Ernakulam')).status,400);
 });
 await t.test('withdrawal after preview prevents final delivery',async()=>{
  assert.equal((await match({},companyA)).data.total,1);
  await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyA]);
  assert.equal((await send(companyA)).status,409);
 });
});

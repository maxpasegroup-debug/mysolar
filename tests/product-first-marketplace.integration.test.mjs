import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('product-first quotation discovery uses published facts and the final routing predicate',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,customer,companyA,companyB,product}=await connectedFixture(t);
 await db.query("UPDATE company_business_profiles SET services=ARRAY['energy_consultation'] WHERE company_id=ANY($1::uuid[])",[[companyA,companyB]]);
 const enquiry={title:'[TEST] Product-first request',requestedItem:'[TEST] solar equipment',categoryId:'10000000-0000-4000-8000-000000000001',productId:product,offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] installation',requirements:'',contactMethod:'in_app',timeframe:'',mode:'multiple',service:''};
 const options=await customer.request('/customer/enquiry-options');assert.equal(options.status,200,JSON.stringify(options.data));
 const card=options.data.discoverableProducts.find(item=>item.id===product);assert.ok(card,'a card must be based on an actual published product with a published seller offer');assert.equal(card.offer_count,2);assert.ok(!Object.hasOwn(card,'distance'));
 const eligible=await customer.request('/customer/enquiry-matches','POST',{enquiry,page:1});assert.equal(eligible.status,200,JSON.stringify(eligible.data));assert.deepEqual(eligible.data.items.map(item=>item.id).sort(),[companyA,companyB].sort());assert.equal(eligible.data.discovery.mapAvailable,false);assert.equal(eligible.data.discovery.nearbyRadiusKm,25);
 const unsupported={...enquiry,service:'maintenance'};
 const noMatch=await customer.request('/customer/enquiry-matches','POST',{enquiry:unsupported,page:1});assert.equal(noMatch.status,200,JSON.stringify(noMatch.data));assert.equal(noMatch.data.total,0);assert.equal(noMatch.data.nearby.mode,'location_list');assert.equal(noMatch.data.nearby.coordinatesVerified,false);assert.ok(noMatch.data.nearby.items.every(item=>!Object.hasOwn(item,'distance')&&!Object.hasOwn(item,'latitude')&&!Object.hasOwn(item,'longitude')));
 const rejected=await customer.request('/customer/enquiries','POST',{...unsupported,companyIds:[companyA],submissionKey:randomUUID()});assert.equal(rejected.status,409,'final submission must revalidate product/service and location eligibility');
});

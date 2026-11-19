import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('product-first quotation discovery uses published facts and the final routing predicate',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,customer,companyA,companyB,product}=await connectedFixture(t);
 await db.query("UPDATE company_business_profiles SET services=ARRAY['rooftop_installation'] WHERE company_id=ANY($1::uuid[])",[[companyA,companyB]]);
 const enquiry={title:'[TEST] Product-first request',requestedItem:'[TEST] solar equipment',categoryId:'10000000-0000-4000-8000-000000000001',productId:product,offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] installation',requirements:'',contactMethod:'in_app',timeframe:'',mode:'multiple',service:''};
 const options=await customer.request('/customer/enquiry-options');assert.equal(options.status,200,JSON.stringify(options.data));
 const card=options.data.discoverableProducts.find(item=>item.id===product);assert.ok(card,'a card must be based on an actual published product with a published seller offer');assert.equal(card.offer_count,2);assert.ok(!Object.hasOwn(card,'distance'));
 const eligible=await customer.request('/customer/enquiry-matches','POST',{enquiry,page:1});assert.equal(eligible.status,200,JSON.stringify(eligible.data));assert.deepEqual(eligible.data.items.map(item=>item.id).sort(),[companyA,companyB].sort());assert.equal(eligible.data.discovery.mapAvailable,false);assert.equal(eligible.data.discovery.nearbyRadiusKm,25);
 const unsupported={...enquiry,service:'maintenance'};
 const noMatch=await customer.request('/customer/enquiry-matches','POST',{enquiry:unsupported,page:1});assert.equal(noMatch.status,200,JSON.stringify(noMatch.data));assert.equal(noMatch.data.total,0);assert.equal(noMatch.data.nearby,null,'unqualified companies must not appear as quotation results');
 const rejected=await customer.request('/customer/enquiries','POST',{...unsupported,companyIds:[companyA],submissionKey:randomUUID()});assert.equal(rejected.status,409,'final submission must revalidate product/service and location eligibility');
 const help={...enquiry,title:'[TEST] Help choosing request',requestedItem:'Help me choose a solar solution',categoryId:'',productId:'',offerId:'',projectType:'advice',service:'',helpMeChoose:true,mode:'direct'};
 const helpMatches=await customer.request('/customer/enquiry-matches','POST',{enquiry:help,page:1,companyId:companyA});assert.equal(helpMatches.status,200,JSON.stringify(helpMatches.data));assert.deepEqual(helpMatches.data.items.map(item=>item.id),[companyA],'explicit guidance does not require a published product or an energy-consultation service declaration');
 const helpSent=await customer.request('/customer/enquiries','POST',{...help,companyIds:[companyA],submissionKey:randomUUID()});assert.equal(helpSent.status,201,JSON.stringify(helpSent.data));assert.equal((await customer.request('/customer/enquiry-matches','POST',{enquiry:{...help,helpMeChoose:false},page:1,companyId:companyA})).status,400,'generic routing requires the explicit Help me choose choice');
 // Named-locality coverage is narrower than district coverage and may not be
 // widened even if the customer enters the matching locality and PIN.
 await db.query(`UPDATE company_service_areas SET scope='locality',pin='682001',locality='Kochi',locality_key='kochi',locality_reference_id=(SELECT id FROM postal_localities WHERE pin='682001' AND locality_key='kochi') WHERE company_id=$1`,[companyA]);
 const localityOnly=await customer.request('/customer/enquiry-matches','POST',{enquiry:{...unsupported,locality:'Kochi'},page:1});
 assert.equal(localityOnly.status,200,JSON.stringify(localityOnly.data));assert.equal(localityOnly.data.total,0);
 assert.equal(localityOnly.data.nearby,null);
 const stillRejected=await customer.request('/customer/enquiries','POST',{...unsupported,locality:'Kochi',companyIds:[companyA],submissionKey:randomUUID()});
 assert.equal(stillRejected.status,409,'district discovery must never bypass service or coverage checks when sending');
 const noDistrict=await customer.request('/customer/enquiry-matches','POST',{enquiry:{...help,locality:'Kochi'},page:1,companyId:companyA});assert.equal(noDistrict.status,200);assert.equal(noDistrict.data.total,0);
 assert.equal((await customer.request('/customer/enquiries','POST',{...help,locality:'Kochi',companyIds:[companyA],submissionKey:randomUUID()})).status,409,'matching PIN/locality cannot widen coverage to the entire district');
});

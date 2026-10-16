import test from 'node:test';
import assert from 'node:assert/strict';
import { unitEnvironment } from './helpers/env.mjs';
unitEnvironment();
const input=await import('../server/purchase/validation.js');
const service=await import('../server/purchase/service.js');
const {assistance}=await import('../server/purchase/assistance.js');
const {publishedProduct,eligibleCompany}=await import('../server/marketplace/service.js');
const ids=['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'];
const enquiry=()=>({title:'[TEST] Equipment enquiry',requestedItem:'Equipment',categoryId:'10000000-0000-4000-8000-000000000001',productId:null,offerId:null,quantity:'',unit:'',projectType:'product_only',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] site',requirements:'',contactMethod:'in_app',timeframe:'',mode:'multiple',service:'',companyIds:ids,submissionKey:'30000000-0000-4000-8000-000000000003'});

test('enquiry rules: duplicate recipients, direct fan-out and excessive recipients are rejected',()=>{
 assert.throws(()=>input.enquiry({...enquiry(),companyIds:[ids[0],ids[0]]}));
 assert.throws(()=>input.enquiry({...enquiry(),mode:'direct'}));
 assert.throws(()=>input.enquiry({...enquiry(),companyIds:Array(11).fill(ids[0])}));
 assert.equal(input.enquiry(enquiry()).companyIds.length,2);
});
test('enquiry rules: unknown quantity stays unknown; PIN, units and identity payloads are validated',()=>{
 assert.equal(input.enquiry(enquiry()).quantity,null);
 for(const fields of [{pin:'000000'},{quantity:'0',unit:'unit'},{quantity:'',unit:'unit'},{customerId:ids[0]},{companyId:ids[1]}])assert.throws(()=>input.enquiry({...enquiry(),...fields}));
});
test('purchase workflow rules: stale revisions and closed/cancelled enquiries reject new changes',()=>{
 service.expect({revision:3},3);assert.throws(()=>service.expect({revision:3},2),{code:'WORKFLOW_CHANGED'});
 for(const status of ['closed','cancelled'])assert.throws(()=>service.open({status}),{code:'WORKFLOW_CHANGED'});
 for(const status of ['sent','discussion','preferred'])assert.doesNotThrow(()=>service.open({status}));
});
test('purchase privacy projections: customer identifiers and private preference identity are excluded',()=>{
 const record={id:ids[0],customer_id:ids[1],submission_key:'private-key',contact_snapshot:{email:'private@example.invalid'},offer_id:ids[1],preferred_version_id:ids[1],title:'Request'};
 const customer=service.customerEnquiry(record);for(const key of ['customer_id','submission_key','contact_snapshot'])assert.ok(!Object.hasOwn(customer,key));
 const company=service.companyEnquiry(record);for(const key of ['customer_id','submission_key','offer_id','preferred_version_id'])assert.ok(!Object.hasOwn(company,key));assert.equal(company.has_preference,true);
 assert.ok(!Object.hasOwn(service.customerQuote({id:ids[0],created_by:ids[1]}),'created_by'));
});
test('quotation query contract: customer scope excludes drafts, company scope binds company and hides competing preference ID',async()=>{
 const calls=[],db={async query(sql,values){calls.push({sql,values});return {rows:[{id:ids[0],preferred_version_id:ids[1]}]};}};
 await service.quoteRecord(db,ids[0],{user:{id:ids[1]}});assert.match(calls[0].sql,/e\.customer_id=\$2 AND q\.status<>'draft'/);assert.deepEqual(calls[0].values,ids);
 const quote=await service.quoteRecord(db,ids[0],{ctx:{companyId:ids[1]}});assert.match(calls[1].sql,/q\.company_id=\$2/);assert.ok(!Object.hasOwn(quote,'preferred_version_id'));assert.equal(quote.is_preferred,false);
 await assert.rejects(service.quoteRecord({query:async()=>({rows:[]})},ids[0],{user:{id:ids[1]}}),{status:404});
});
test('marketplace retrieval contract: missing publication never falls back to raw/private records',async()=>{
 const calls=[],db={async query(sql,values){calls.push({sql,values});return {rowCount:0,rows:[]};}};
 await assert.rejects(publishedProduct(db,ids[0]),{status:404});await assert.rejects(eligibleCompany(db,ids[1]),{status:409});
 assert.match(calls[0].sql,/FROM marketplace_products WHERE id=\$1/);assert.match(calls[1].sql,/FROM marketplace_vendors WHERE id=\$1/);assert.deepEqual(calls.map(x=>x.values),[[ids[0]],[ids[1]]]);
});
test('purchase assistance: missing terms and unconfirmed tax produce questions without invented engineering claims',()=>{
 const result=assistance({tax_mode:'unknown',estimated:true},[{brand:'',model:'',specifications:''}]);
 assert.equal(result.questions.length,9);assert.ok(result.questions.some(x=>x.includes('installation')));assert.ok(result.questions.some(x=>x.includes('tax')));
 assert.ok(result.notices.some(x=>x.includes('not independently verified')));assert.ok(result.notices.some(x=>x.includes('creates no order')));
 assert.doesNotMatch(JSON.stringify(result),/₹|payback|subsidy|kWh|\d+%/);
});

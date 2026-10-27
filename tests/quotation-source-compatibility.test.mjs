import test from 'node:test';
import assert from 'node:assert/strict';
import {unitEnvironment} from './helpers/env.mjs';

// No real database: initialize safe local-only configuration before imports.
unitEnvironment();
const {resolveQuotationSources,quotationLead}=await import('../server/purchase/sources.js');
const {items,customerQuote}=await import('../server/purchase/service.js');
const {quote}=await import('../server/purchase/validation.js');
const {once}=await import('../server/operations/core.js');
const {pool}=await import('../server/db/pool.js');
test.after(()=>assert.equal(pool.totalCount,0,'Focused contracts must not open database connections.'));
const company='30000000-0000-4000-8000-000000000001';
const product='30000000-0000-4000-8000-000000000002';
const offer='30000000-0000-4000-8000-000000000003';
const enquiry='30000000-0000-4000-8000-000000000004';
const ctx={companyId:company};
const noQuery={async query(){assert.fail('Historical snapshots must not require fresh publication queries.');}};
const captured=revision=>({product_id:product,offer_id:offer,offer_revision:revision,
 product_snapshot:{id:product,revision,name:'[TEST] Product capture '+revision},
 offer_snapshot:{id:offer,companyId:company,productId:product,revision,currency:'INR',unit:'unit',pricePaise:String(revision*100)}});
const line=revision=>({productId:product,offerId:offer,offerRevision:revision,unit:'unit',unitPricePaise:'9876',amounts:{total:'9876'}});

test('captured product history stays paired with the matching seller-offer revision',async()=>{
 const previous=[captured(1),captured(2)];
 const resolved=await resolveQuotationSources(noQuery,ctx,[line(2),line(1)],previous);
 assert.deepEqual(resolved[0].productSnapshot,previous[1].product_snapshot);
 assert.deepEqual(resolved[0].offerSnapshot,previous[1].offer_snapshot);
 assert.deepEqual(resolved[1].productSnapshot,previous[0].product_snapshot);
 assert.deepEqual(resolved[1].offerSnapshot,previous[0].offer_snapshot);
 assert.equal(resolved[0].unitPricePaise,'9876');
 assert.deepEqual(previous,[captured(1),captured(2)]);
});

test('existing own source survives later unpublication without changing recorded money',async()=>{
 const previous=[captured(2)];const [resolved]=await resolveQuotationSources(noQuery,ctx,[line(2)],previous);
 assert.deepEqual(resolved.productSnapshot,previous[0].product_snapshot);
 assert.deepEqual(resolved.offerSnapshot,previous[0].offer_snapshot);
 assert.equal(resolved.unitPricePaise,'9876');
});

test('incomplete stored product/offer pairs fail without fetching newer facts',async()=>{
 for(const field of ['product_snapshot','offer_snapshot'])for(const value of [{},null,[],false]){
  const previous={...captured(2),[field]:value};
  await assert.rejects(resolveQuotationSources(noQuery,ctx,[line(2)],[previous]),{code:'QUOTATION_SOURCE_CHANGED'});
  assert.deepEqual(previous,{...captured(2),[field]:value});
 }
});

test('stored source identity and revision disagreements fail closed',async()=>{
 for(const changed of [
  {product_snapshot:{...captured(2).product_snapshot,id:enquiry}},
  {product_snapshot:{...captured(2).product_snapshot,revision:0}},
  {product_snapshot:{...captured(2).product_snapshot,revision:'2'}},
  ...[{revision:99},{companyId:enquiry},{productId:enquiry},{id:enquiry}].map(fields=>({offer_snapshot:{...captured(2).offer_snapshot,...fields}}))
 ])await assert.rejects(resolveQuotationSources(noQuery,ctx,[line(2)],[{...captured(2),...changed}]),{code:'QUOTATION_SOURCE_CHANGED'});
});

test('new source snapshots use server publication data and an explicit safe allowlist',async()=>{
 const calls=[];const db={async query(sql,args){calls.push({sql,args});
  if(sql.includes('FOR SHARE')&&sql.includes('catalogue_products'))return {rows:[{id:product}],rowCount:1};
  if(sql.includes('FROM marketplace_products'))return {rows:[{id:product,revision:4,name:'[TEST] Published',unit:'unit',attributes:{},private_notes:'PRIVATE'}],rowCount:1};
  assert.match(sql,/o\.company_id=\$2 AND o\.product_id=\$3/);
  assert.deepEqual(args,[offer,company,product]);
  return {rows:[{id:offer,company_id:company,product_id:product,revision:3,currency:'INR',price_unit:'unit',price_paise:'1234',private_notes:'PRIVATE'}],rowCount:1};
 }};
 const [resolved]=await resolveQuotationSources(db,ctx,[line(3)]);
 assert.equal(resolved.productSnapshot.name,'[TEST] Published');
 assert.equal(resolved.offerSnapshot.pricePaise,'1234');
 assert.equal(resolved.unitPricePaise,'9876');
 assert.ok(!JSON.stringify(resolved).includes('PRIVATE'));
 assert.equal(calls.length,3);
});

test('new unavailable or stale offer fails instead of using historical data from another revision',async()=>{
 for(const rows of [[],[{id:offer,revision:99}]]){
  const db={async query(sql){if(sql.includes('FROM marketplace_products'))return {rows:[{id:product,unit:'unit'}],rowCount:1};return {rows,rowCount:rows.length};}};
  await assert.rejects(resolveQuotationSources(db,ctx,[line(2)],[captured(1)]),{code:'QUOTATION_SOURCE_CHANGED'});
 }
});

test('manual historical product source and unlinked legacy lines remain truthful',async()=>{
 const prior={product_id:product,offer_id:null,offer_revision:null,product_snapshot:{id:product,name:'[TEST] Original'},offer_snapshot:{}};
 const resolved=await resolveQuotationSources(noQuery,ctx,[{productId:product,offerId:null,offerRevision:null},{productId:null,offerId:null,offerRevision:null}],[prior]);
 assert.deepEqual(resolved[0].productSnapshot,prior.product_snapshot);
 assert.deepEqual(resolved[1].productSnapshot,{});
 assert.deepEqual(resolved[1].offerSnapshot,{});
});

test('quotation input rejects client-authored source snapshots and tenant/lead claims',()=>{
 const base={revision:1,reference:'TEST',validUntil:'2099-01-01',taxMode:'exempt',items:[{productId:product,offerId:offer,offerRevision:1,description:'[TEST] Equipment',brand:'',model:'',specifications:'',quantity:'1',unit:'unit',unitPrice:'10',discount:'0',taxRate:''}],delivery:'0',installation:'0',chargesTaxRate:'',included:'',excluded:'',warranty:'',timeframe:'',paymentTerms:'',assumptions:'',installationScope:'',estimated:false};
 assert.equal(quote(base).items[0].offerId,offer);
 for(const key of ['productSnapshot','offerSnapshot','companyId','sourceLeadId']){
  assert.throws(()=>quote({...base,items:[{...base.items[0],[key]:{forged:true}}]}));
 }
 assert.throws(()=>quote({...base,sourceLeadId:enquiry}));
});

test('qualification is server-scoped and rejects missing, malformed or lost linked leads',async()=>{
 const good={id:enquiry,stage:'qualified',qualification:{requirement:'[TEST] Requirement',siteAddress:'[TEST] Site'}};
 function dbFor(lead,required=true){return {async query(sql,args){if(sql.includes('FROM crm_leads')){assert.deepEqual(args,[company,enquiry]);return {rows:lead?[lead]:[]};}assert.deepEqual(args,[company]);return {rows:[{qualification_required:required}]};}};}
 for(const bad of [null,{...good,stage:'lost'},{...good,qualification:{}},{...good,qualification:{requirement:'  ',siteAddress:'[TEST] Site'}}])await assert.rejects(quotationLead(dbFor(bad),ctx,enquiry),{code:'QUOTATION_SOURCE_CHANGED'});
 assert.equal(await quotationLead(dbFor(good),ctx,enquiry),enquiry);
 assert.equal(await quotationLead(dbFor(null,false),ctx,enquiry),null);
});

test('shared order item read preserves both sources and customer projection hides private lead',async()=>{
 const row={product_id:product,offer_id:offer,offer_revision:2,product_snapshot:captured(2).product_snapshot,offer_snapshot:captured(2).offer_snapshot};
 const result=await items({async query(sql,args){assert.match(sql,/offer_id,offer_revision,product_snapshot,offer_snapshot/);assert.match(sql,/WHERE version_id=\$1 ORDER BY position/);assert.deepEqual(args,[enquiry]);return {rows:[row]};}},enquiry);
 assert.deepEqual(result,[row]);
 assert.deepEqual(customerQuote({id:enquiry,source_lead_id:'private-lead',created_by:'private-actor',total_paise:'9876'}),{id:enquiry,total_paise:'9876'});
});

test('order idempotency contract replays the recorded result and rejects a changed payload',async()=>{
 let record=null,runs=0;
 const db={async query(sql,args){if(sql.startsWith('SELECT fingerprint'))return {rows:record?[record]:[]};assert.match(sql,/INSERT INTO operations_idempotency/);record={fingerprint:args[2],result:args[3]};return {rows:[]};}};
 const work=async()=>{runs++;return {id:enquiry};};
 assert.deepEqual(await once(db,ctx,offer,'order.create',{quotationId:product},work),{id:enquiry});
 assert.deepEqual(await once(db,ctx,offer,'order.create',{quotationId:product},work),{id:enquiry});
 await assert.rejects(once(db,ctx,offer,'order.create',{quotationId:enquiry},work));
 assert.equal(runs,1);
});

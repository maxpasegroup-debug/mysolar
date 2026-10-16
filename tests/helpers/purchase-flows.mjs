import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Called only inside the explicitly designated disposable PostgreSQL schema.
export async function purchaseFlows(t,{db,a,b,customer,stranger,companyA,companyB,client}){
 const category='10000000-0000-4000-8000-000000000001',product=randomUUID(),offers=[];
 for(const [company,owner] of [[companyA,a],[companyB,b]]){
  await db.query("UPDATE company_branding SET description='[TEST] published fixture',public_email='fixture@example.invalid' WHERE company_id=$1",[company]);
  await db.query("UPDATE companies SET marketplace_status='approved',storefront_published=true WHERE id=$1",[company]);
  await db.query("INSERT INTO company_reviews(company_id,actor_user_id,kind,previous_state,new_state,reason,revision) VALUES($1,$2,'marketplace','pending','approved','[TEST] fixture-only publication',1)",[company,owner.user.id]);
  await db.query("INSERT INTO company_service_areas(id,company_id,scope,label,state,district,pin,state_key,district_key) VALUES($1,$2,'pin','[TEST] PIN','Kerala','Ernakulam','682001','kerala','ernakulam')",[randomUUID(),company]);
 }
 await db.query("INSERT INTO catalogue_products(id,category_id,name,unit,schema_revision,created_by,published_by,published_at,status,public_visible) VALUES($1,$2,'[TEST] Published equipment','unit',1,$3,$3,now(),'published',true)",[product,category,a.user.id]);
 for(const [company,owner] of [[companyA,a],[companyB,b]]){const id=randomUUID();offers.push(id);await db.query("INSERT INTO distributor_offers(id,company_id,product_id,price_mode,price_unit,private_notes,status,published,approved_revision,approved_product_revision,reviewed_by,reviewed_at,created_by) VALUES($1,$2,$3,'request_quote','unit','PRIVATE-OFFER-COST','approved',true,1,1,$4,now(),$4)",[id,company,product,owner.user.id]);}
 await t.test('marketplace publication gates hide unapproved offers, changed definitions and withdrawn storefronts',async()=>{
  let r=await customer.request('/public/products/'+product);assert.equal(r.status,200);assert.equal(r.data.offers.items.length,2);assert.ok(!JSON.stringify(r.data).includes('PRIVATE-OFFER-COST'));
  await db.query("UPDATE distributor_offers SET status='pending',published=false WHERE id=$1",[offers[0]]);assert.equal((await customer.request('/public/products/'+product)).data.offers.items.length,1);
  await db.query("UPDATE distributor_offers SET status='approved',published=true WHERE id=$1",[offers[0]]);
  await db.query('UPDATE catalogue_products SET revision=2 WHERE id=$1',[product]);assert.equal((await customer.request('/public/products/'+product)).data.offers.items.length,0);await db.query('UPDATE catalogue_products SET revision=1 WHERE id=$1',[product]);
  await db.query("UPDATE catalogue_products SET status='draft',public_visible=false WHERE id=$1",[product]);assert.equal((await customer.request('/public/products/'+product)).status,404);await db.query("UPDATE catalogue_products SET status='published',public_visible=true WHERE id=$1",[product]);
  await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyB]);assert.equal((await customer.request('/public/vendors/'+companyB)).status,404);assert.equal((await customer.request('/public/products/'+product)).data.offers.items.length,1);await db.query('UPDATE companies SET storefront_published=true WHERE id=$1',[companyB]);
 });
 const enquiry={title:'[TEST] Compare equipment',requestedItem:'[TEST] equipment',categoryId:category,productId:product,offerId:null,quantity:'1',unit:'unit',projectType:'product_only',state:'Kerala',district:'Ernakulam',pin:'682001',locality:'',address:'[TEST] site',requirements:'',contactMethod:'in_app',timeframe:'',mode:'multiple',service:'',companyIds:[companyA,companyB],submissionKey:randomUUID()};let enquiryId,quoteId;
 await t.test('multi-vendor enquiry deduplicates submissions and isolates customer/company conversations',async()=>{
  let r=await customer.request('/customer/enquiries','POST',enquiry);assert.equal(r.status,201);enquiryId=r.data.id;assert.equal((await customer.request('/customer/enquiries','POST',enquiry)).data.id,enquiryId);
  assert.equal((await stranger.request('/customer/enquiries/'+enquiryId)).status,404);assert.equal((await a.request('/companies/current/enquiries/'+enquiryId)).status,200);assert.equal((await b.request('/companies/current/enquiries/'+enquiryId)).status,200);
  assert.equal((await a.request('/companies/current/enquiries/'+enquiryId+'/notes','POST',{body:'PRIVATE-COMPANY-A-NOTE'})).status,200);
  assert.ok(!JSON.stringify((await customer.request('/customer/enquiries/'+enquiryId)).data).includes('PRIVATE-COMPANY-A-NOTE'));assert.ok(!JSON.stringify((await b.request('/companies/current/enquiries/'+enquiryId)).data).includes('PRIVATE-COMPANY-A-NOTE'));
 });
 const validity=new Date(Date.now()+7*86400000).toISOString().slice(0,10),quote=revision=>({revision,reference:'TEST-QUOTE',validUntil:validity,taxMode:'exclusive',items:[{productId:product,description:'[TEST] supplied equipment',brand:'[TEST]',model:'Fixture',specifications:'Fixture only',quantity:'1',unit:'unit',unitPrice:'100',discount:'0',taxRate:'18'}],delivery:'0',installation:'0',chargesTaxRate:'0',included:'[TEST] equipment',excluded:'Installation',warranty:'',timeframe:'',paymentTerms:'',assumptions:'',installationScope:'Equipment only',estimated:false});
 await t.test('private quotation draft, issuance, preference and revised history preserve price and ownership',async()=>{
  let r=await a.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',quote(1));assert.equal(r.status,201);quoteId=r.data.id;
  assert.equal((await customer.request('/customer/quotations/'+quoteId)).status,404);assert.equal((await b.request('/companies/current/quotations/'+quoteId)).status,404);
  assert.equal((await a.request('/companies/current/quotations/'+quoteId+'/actions','POST',{revision:1,action:'send'})).status,200);
  r=await customer.request('/customer/quotations/'+quoteId);assert.equal(r.status,200);assert.equal(r.data.quote.total_paise,'11800');assert.equal((await stranger.request('/customer/quotations/'+quoteId)).status,404);
  assert.equal((await a.request('/companies/current/quotations/'+quoteId,'PUT',quote(2))).status,409);
  const before=(await db.query('SELECT count(*)::int AS n FROM business_orders')).rows[0].n,e=(await customer.request('/customer/enquiries/'+enquiryId)).data.enquiry;
  assert.equal((await customer.request('/customer/quotations/'+quoteId+'/actions','POST',{revision:r.data.quote.revision,enquiryRevision:e.revision,action:'prefer',body:''})).status,200);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM business_orders')).rows[0].n,before);
  const preferred=(await customer.request('/customer/enquiries/'+enquiryId)).data.enquiry;assert.equal((await customer.request('/customer/enquiries/'+enquiryId+'/actions','POST',{revision:preferred.revision,action:'clear_preference'})).status,200);
  const old=(await db.query('SELECT revision,total_paise::text FROM quotation_versions WHERE id=$1',[quoteId])).rows[0];r=await a.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',quote(old.revision));assert.equal(r.status,201);
  assert.equal((await a.request('/companies/current/quotations/'+r.data.id+'/actions','POST',{revision:1,action:'send'})).status,200);
  const historical=(await db.query('SELECT status,total_paise::text FROM quotation_versions WHERE id=$1',[quoteId])).rows[0];assert.deepEqual(historical,{status:'superseded',total_paise:old.total_paise});
  const comparison=await customer.request('/customer/comparison?enquiryId='+enquiryId);assert.equal(comparison.status,200);assert.equal(comparison.data.quotations.length,1);
 });
 await t.test('SIA proposals require exact session/payload confirmation and execute the existing message service once',async()=>{
  const r=await a.request('/companies/current/sia/proposals','POST',{enquiryId,body:'[TEST] confirmed follow-up'});assert.equal(r.status,201);const proposal=r.data;
  assert.equal((await b.request('/companies/current/sia/proposals/'+proposal.id+'/decision','POST',{token:proposal.token,decision:'approve',confirm:true})).status,403);
  const alternate=client();await alternate.session();assert.equal((await alternate.request('/auth/login','POST',{email:'owner-a@example.invalid',password:'Test-only password 123!'})).status,200);await alternate.session();
  assert.equal((await alternate.request('/companies/current/sia/proposals/'+proposal.id+'/decision','POST',{token:proposal.token,decision:'approve',confirm:true})).status,403);
  assert.equal((await a.request('/companies/current/sia/proposals/'+proposal.id+'/decision','POST',{token:proposal.token,decision:'approve',confirm:false})).status,400);
  const decision={token:proposal.token,decision:'approve',confirm:true};assert.equal((await a.request('/companies/current/sia/proposals/'+proposal.id+'/decision','POST',decision)).status,200);assert.equal((await a.request('/companies/current/sia/proposals/'+proposal.id+'/decision','POST',decision)).status,200);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM enquiry_messages WHERE enquiry_id=$1 AND body='[TEST] confirmed follow-up'",[enquiryId])).rows[0].n,1);
  const stale=await a.request('/companies/current/sia/proposals','POST',{enquiryId,body:'[TEST] stale proposal'});assert.equal(stale.status,201);await db.query('UPDATE customer_enquiries SET revision=revision+1 WHERE id=$1',[enquiryId]);
  assert.equal((await a.request('/companies/current/sia/proposals/'+stale.data.id+'/decision','POST',{token:stale.data.token,decision:'approve',confirm:true})).status,409);
 });
}

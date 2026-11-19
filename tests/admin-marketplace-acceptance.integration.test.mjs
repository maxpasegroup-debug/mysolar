import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {migrationManifest} from '../server/db/migrations.js';
import {seedReviewedLocation} from './helpers/reviewed-locations.mjs';

test('real disposable PostgreSQL: registration, independent approval, marketplace enquiry and issued quotation', {skip:!process.env.TEST_DATABASE_URL?'BLOCKED: dedicated loopback disposable PostgreSQL required':false,timeout:180000},async t=>{
 const env=await isolatedApp(t),{db}=env;
 const identity=(await db.query('SELECT current_database() AS database,host(inet_server_addr()) AS host,current_schema() AS schema')).rows[0];
 assert.match(identity.database,/^mysolar_test_/);assert.equal(identity.host,'127.0.0.1');assert.match(identity.schema,/^mysolar_integration_/);
 const dataDirectory=(await db.query('SHOW data_directory')).rows[0].data_directory.replaceAll('\\','/').toLowerCase();
 assert.ok(dataDirectory.startsWith(process.cwd().replaceAll('\\','/').toLowerCase()+'/.verification/postgres/cluster-'),'Refuse anything except the new workspace-local cluster');
 console.log('DATABASE SAFETY: loopback, mysolar_test_* database, unique schema and new workspace cluster verified; '+env.version);
 await t.test('existing migration chain installs and repeat preserves every checksum',async()=>{
  await env.applyMigrations(db);const expected=await migrationManifest(),installed=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
  assert.deepEqual(installed,expected);await env.applyMigrations(db);assert.deepEqual((await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,installed);
  for(const name of ['users','platform_admin_grants','companies','company_reviews','enquiry_recipients','quotation_versions','quotation_line_items'])assert.ok((await db.query('SELECT to_regclass($1) AS object',[name])).rows[0].object);
  const constraints=(await db.query("SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace")).rows.map(x=>x.conname);
  for(const name of ['company_publication_gate','company_lifecycle_consistent','quotation_line_tenant','quotation_offer_tenant'])assert.ok(constraints.includes(name),name);
  console.log('MIGRATIONS: '+expected.length+' entries installed/repeated with matching checksums and required constraints.');
 });
 await t.test('upgrade from 033 applies the remaining chain without changing earlier checksums',async()=>{
  const upgrade=env.schema+'_upgrade';assert.match(upgrade,/^mysolar_integration_[a-f0-9]+_upgrade$/);
  await db.query('CREATE SCHEMA "'+upgrade+'"');
  try{
   await db.query('SET search_path TO "'+upgrade+'",public');await env.applyMigrations(db,{through:'033_solar_os_workforce.sql'});
   const before=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;await env.applyMigrations(db);
   for(const old of before)assert.equal((await db.query('SELECT checksum FROM schema_migrations WHERE name=$1',[old.name])).rows[0].checksum,old.checksum);
   assert.deepEqual((await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,await migrationManifest());
   console.log('UPGRADE: 033 to 050, both 047 files tracked, historical checksums preserved. Empty historical schema, not a production-data cutover rehearsal.');
  }finally{await db.query('SET search_path TO "'+env.schema+'",public');await db.query('DROP SCHEMA "'+upgrade+'" CASCADE');}
 });
 // Only instantiate a loopback mail transport so normal signup can queue mail.
 // Never start a mail worker or send mail. Read the genuine encrypted OTP job
 // from this disposable DB; no API response or database operation is mocked.
 Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:'9',SMTP_USER:'fictional-local-only',SMTP_PASSWORD:randomBytes(20).toString('hex'),MAIL_FROM:'fixture@example.invalid'});
 await env.start();const {unseal}=await import('../server/auth/sealed.js');
 const owner=env.client(),operator=env.client(),otherOwner=env.client(),customer=env.client(),otherCustomer=env.client(),anonymous=env.client();
 const password=randomBytes(30).toString('base64url');
 const expect=async(promise,status)=>{const r=await promise;assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const otp=async challenge=>{const row=(await db.query("SELECT payload FROM mail_jobs WHERE kind='registration_otp' AND reference_hash=$1",[challenge])).rows[0];assert.ok(row?.payload);const code=unseal(row.payload).text.match(/\b\d{6}\b/)?.[0];assert.ok(code);return code;};
 async function register(client,name,business){
  const email=name+'@example.invalid';await client.session();
  if(business){const r=await expect(client.request('/auth/business-signup/request','POST',{email}),202);await expect(client.request('/auth/business-signup/verify','POST',{challenge:r.challenge,otp:await otp(r.challenge)}),200);await expect(client.request('/auth/business-signup/complete','POST',{challenge:r.challenge,name:'[TEST] '+name,password}),201);}
  else{const r=await expect(client.request('/auth/register','POST',{name:'[TEST] '+name,email,password,accountType:'customer'}),202);await expect(client.request('/auth/register/confirm','POST',{challenge:r.challenge,otp:await otp(r.challenge)}),201);}
  await client.session();assert.ok(client.user?.id);assert.equal((await db.query('SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id=$1',[client.user.id])).rows[0].verified,true);
 }
 await t.test('01 business registration persists real verified identities without public admin grants',async()=>{
  await register(owner,'acceptance-aurora-owner',true);await register(operator,'acceptance-independent-operator',true);await register(otherOwner,'acceptance-boreal-owner',true);await register(customer,'acceptance-customer',false);await register(otherCustomer,'acceptance-other-customer',false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM platform_admin_grants')).rows[0].n,0);
 });
 // Explicit test administrator bootstrap in the verified disposable schema only.
 await seedReviewedLocation(db,operator.user.id);
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] independent operator bootstrap in disposable cluster')",[operator.user.id]);
 const setup=async client=>(await expect(client.request('/companies/current/setup'),200));
 async function complete(client,name){
  await expect(client.request('/companies','POST',{operationKey:randomUUID(),name,city:'Ernakulam',email:client.user.email,phone:'0000000000',businessType:'both'}),201);await client.session();const company=client.company.id;
  await expect(client.request('/companies/current/onboarding/profile','PUT',{revision:(await setup(client)).company.revision,legalName:name+' Legal',displayName:name,businessType:'both',contactPerson:'[TEST] Owner',email:client.user.email,phone:'0000000000',address:'[TEST] Fictional premises',state:'Kerala',district:'Ernakulam',pin:'682001',language:'en',website:''}),200);
  await expect(client.request('/companies/current/branding','PUT',{revision:(await setup(client)).company.revision,publicName:name,logoUrl:'',primary:'#601c2b',secondary:'#292b29',accent:'#d8ab55',welcome:'[TEST] Acceptance listing',email:client.user.email,phone:'',description:'[TEST] Fictional consultation and installation company',appearance:'warm',requestedDomain:''}),200);
  await expect(client.request('/companies/current/onboarding/business','PUT',{revision:(await setup(client)).company.revision,services:['energy_consultation','rooftop_installation'],rooftop:true,areas:['[TEST] Ernakulam'],contactMethod:'email',marketplaceRequested:true}),200);
  await expect(client.request('/companies/current/service-areas','PUT',{revision:(await setup(client)).company.revision,areas:[{scope:'district',label:'[TEST] Ernakulam',state:'Kerala',district:'Ernakulam',pin:'',locality:'',confirmEntireDistrict:true}]}),200);
  return company;
 }
 let companyA,companyB,enquiryId,quoteId;
 const decision=async(company,action,reason='[TEST] Reviewed fictional application')=>{const c=(await db.query('SELECT revision FROM companies WHERE id=$1',[company])).rows[0];return expect(operator.request('/platform/companies/'+company+'/actions','POST',{action,revision:c.revision,reason}),200);};
 await t.test('02 company profile, public identity, services and exact coverage persist through real APIs',async()=>{
  companyA=await complete(owner,'[TEST] Acceptance Aurora Solar');companyB=await complete(otherOwner,'[TEST] Acceptance Boreal Solar');
  assert.equal((await setup(owner)).profile.legal_name,'[TEST] Acceptance Aurora Solar Legal');assert.deepEqual((await db.query('SELECT scope,state_key,district_key,pin FROM company_service_areas WHERE company_id=$1',[companyA])).rows[0],{scope:'district',state_key:'kerala',district_key:'ernakulam',pin:''});
 });
 await t.test('03 owner submission enters activation/marketplace queues without automatic publication',async()=>{
  for(const client of [owner,otherOwner]){await expect(client.request('/companies/current/onboarding/submit','POST',{revision:(await setup(client)).company.revision}),200);const c=(await setup(client)).company;assert.equal(c.lifecycle,'pending_review');assert.equal(c.marketplace_status,'pending');assert.equal(c.storefront_published,false);}
  const queue=await expect(operator.request('/platform/companies?queue=onboarding'),200);assert.ok(queue.companies.some(c=>c.id===companyA));
 });
 await t.test('04 administrator authenticates and ordinary/customer/anonymous/CSRF requests fail closed',async()=>{
  await expect(operator.request('/auth/logout','POST',{}),200);await operator.session();await expect(operator.request('/auth/login','POST',{email:'acceptance-independent-operator@example.invalid',password,accountType:'business'}),200);await operator.session();
  assert.ok(operator.user.id);await anonymous.session();await expect(anonymous.request('/platform/companies'),401);await expect(owner.request('/platform/companies'),403);await expect(customer.request('/platform/companies'),403);
  const body={action:'approve',revision:(await setup(owner)).company.revision,reason:'[TEST] invalid owner approval'};await expect(owner.request('/platform/companies/'+companyA+'/actions','POST',body),403);await expect(operator.request('/platform/companies/'+companyA+'/actions','POST',body,{'X-CSRF-Token':''}),403);
 });
 await t.test('05 independent operator activates separately and queues update',async()=>{
  const revision=(await setup(owner)).company.revision,body={action:'approve',revision,reason:'[TEST] Concurrent independent review'};
  const decisions=await Promise.all([1,2].map(()=>operator.request('/platform/companies/'+companyA+'/actions','POST',body)));assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
  await decision(companyB,'request_changes','[TEST] Correct fictional contact details');assert.equal((await setup(otherOwner)).company.lifecycle,'onboarding');assert.ok((await expect(operator.request('/platform/companies?queue=returned'),200)).companies.some(c=>c.id===companyB));
  await expect(otherOwner.request('/companies/current/onboarding/submit','POST',{revision:(await setup(otherOwner)).company.revision}),200);await decision(companyB,'approve');const c=(await setup(owner)).company;assert.equal(c.lifecycle,'active');assert.equal(c.marketplace_status,'pending');assert.equal(c.storefront_published,false);
  const active=await expect(operator.request('/platform/companies?queue=approved'),200);assert.ok(active.companies.some(c=>c.id===companyA));
 });
 await t.test('06 marketplace approval remains separate from activation/publication',async()=>{
  assert.ok((await expect(operator.request('/platform/companies?queue=marketplace'),200)).companies.some(c=>c.id===companyA));await decision(companyA,'approve_marketplace');const c=(await setup(owner)).company;assert.equal(c.marketplace_status,'approved');assert.equal(c.storefront_published,false);
  await decision(companyB,'return_marketplace','[TEST] Correct fictional listing');assert.equal((await setup(otherOwner)).company.marketplace_status,'withdrawn');await expect(otherOwner.request('/companies/current/marketplace-request','POST',{revision:(await setup(otherOwner)).company.revision,requested:true}),200);assert.equal((await setup(otherOwner)).company.marketplace_status,'pending');
 });
 await t.test('07 explicit publication works for a free listing with no subscription',async()=>{
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_subscriptions')).rows[0].n,0);await decision(companyA,'publish');assert.equal((await setup(owner)).company.storefront_published,true);
  assert.ok((await expect(operator.request('/platform/companies?queue=published'),200)).companies.some(c=>c.id===companyA));
  const reviews=(await db.query('SELECT kind,new_state FROM company_reviews WHERE company_id=$1 ORDER BY id',[companyA])).rows;assert.ok(reviews.some(r=>r.kind==='lifecycle'&&r.new_state==='active'));assert.ok(reviews.some(r=>r.kind==='marketplace'&&r.new_state==='approved'));assert.ok(reviews.some(r=>r.new_state==='published'));
 });
 await t.test('08 customer company search returns the persisted published business only',async()=>{
  const d=await expect(customer.request('/public/vendors?search=Acceptance%20Aurora&state=Kerala&district=Ernakulam'),200);assert.deepEqual(d.items.map(v=>v.id),[companyA]);
 });
 await t.test('09 public API/profile renders saved public identity without private contact data',async()=>{
  const d=await expect(customer.request('/public/vendors/'+companyA),200);assert.equal(d.vendor.id,companyA);assert.equal(d.vendor.name,'[TEST] Acceptance Aurora Solar');assert.ok(d.areas.some(a=>a.scope==='district'&&a.district==='Ernakulam'));for(const field of ['business_email','password_hash','created_by','customer_id'])assert.equal(Object.hasOwn(d.vendor,field),false);
  const r=await fetch(env.base+'/companies/'+companyA);assert.equal(r.status,200);assert.match(await r.text(),/Acceptance Aurora Solar/);
 });
 const enquiry={title:'[TEST] Rooftop consultation',requestedItem:'Solar advice and installation',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Ernakulam',pin:'',locality:'',address:'[TEST] Fictional roof',requirements:'[TEST] Describe equipment options',contactMethod:'in_app',timeframe:'',mode:'direct',service:'energy_consultation'};
 await t.test('10 customer matches and sends one direct enquiry, with retry returning the same record',async()=>{
  const matches=await expect(customer.request('/customer/enquiry-matches','POST',{enquiry,page:1,companyId:companyA}),200);assert.deepEqual(matches.items.map(v=>v.id),[companyA]);
  const payload={...enquiry,companyIds:[companyA],submissionKey:randomUUID()};const sent=await expect(customer.request('/customer/enquiries','POST',payload),201);enquiryId=sent.id;assert.equal((await expect(customer.request('/customer/enquiries','POST',payload),201)).id,enquiryId);
  assert.deepEqual((await db.query('SELECT company_id FROM enquiry_recipients WHERE enquiry_id=$1',[enquiryId])).rows.map(r=>r.company_id),[companyA]);
 });
 await t.test('11 correct business reads the real incoming enquiry before subscribing',async()=>{
  await owner.session();assert.ok((await expect(owner.request('/companies/current/enquiries'),200)).items.some(e=>e.id===enquiryId));const d=await expect(owner.request('/companies/current/enquiries/'+enquiryId),200);assert.equal(d.enquiry.id,enquiryId);
  assert.ok((await db.query('SELECT id FROM workflow_notifications WHERE company_id=$1 AND enquiry_id=$2',[companyA,enquiryId])).rowCount>0);
 });
 await t.test('12 business records an explicit fictional access agreement, prepares and issues a quotation',async()=>{
  const {features,limitNames}=await import('../server/commercial/policy.js');
  const terms={name:'[TEST] Local acceptance access',description:'Fictional terms, no payment',price:'100',currency:'INR',taxMode:'exempt',taxRate:'0',interval:'monthly',trialDays:0,effectiveFrom:new Date(Date.now()-86400000).toISOString(),effectiveTo:null,features:Object.fromEntries(Object.keys(features).map(k=>[k,k!=='custom_domain'])),limits:Object.fromEntries(Object.keys(limitNames).map(k=>[k,null])),support:'[TEST]'};
  const plan=await expect(operator.request('/platform/commercial/plans','POST',{code:'acceptance_local',terms,reason:'[TEST] Test access only'}),201);await expect(operator.request('/platform/commercial/plans/'+plan.id+'/state','POST',{revision:1,status:'active',reason:'[TEST] Explicit test plan'}),200);
  const agreement=await expect(operator.request('/platform/commercial/companies/'+companyA),200);
  await expect(operator.request('/platform/commercial/companies/'+companyA+'/subscriptions','POST',{revision:agreement.state.revision,planId:plan.id,status:'active',startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+86400000).toISOString(),reason:'[TEST] Manual fictional access, no payment'}),201);await owner.session();
  const lead=await expect(owner.request('/companies/current/operations/leads','POST',{operationKey:randomUUID(),enquiryId,contactId:null,title:'[TEST] Qualified requirement',source:'',interest:'Consultation',location:'[TEST] Roof',assigneeId:null,priority:'normal',nextAction:'Prepare quotation',followUp:null}),201);
  await expect(owner.request('/companies/current/operations/leads/'+lead.id+'/qualification','POST',{revision:1,qualification:{requirement:'Consultation and installation',siteAddress:'[TEST] Fictional roof',capacity:'',budget:'',timeframe:'',notes:''},lostReason:''}),200);
  const quote={revision:1,reference:'TEST-ACCEPTANCE-Q1',validUntil:new Date(Date.now()+7*86400000).toISOString().slice(0,10),taxMode:'exempt',items:[{productId:null,description:'[TEST] Site consultation',brand:'',model:'',specifications:'[TEST] Assessment only',quantity:'1',unit:'visit',unitPrice:'100',discount:'0',taxRate:''}],delivery:'0',installation:'0',chargesTaxRate:'',included:'Site consultation',excluded:'Equipment',warranty:'Assessment only',timeframe:'By agreement',paymentTerms:'[TEST] No real payment',assumptions:'Fictional test',installationScope:'No equipment installation in this quote',estimated:false};
  await expect(owner.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',{...quote,chargesTaxRate:'0'}),400);
  quoteId=(await expect(owner.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',quote),201)).id;
  await expect(customer.request('/customer/quotations/'+quoteId),404);
  await expect(owner.request('/companies/current/quotations/'+quoteId+'/actions','POST',{revision:1,action:'send'}),200);
  assert.equal((await db.query('SELECT status FROM quotation_versions WHERE id=$1',[quoteId])).rows[0].status,'sent');assert.equal((await db.query('SELECT status FROM customer_enquiries WHERE id=$1',[enquiryId])).rows[0].status,'quotation_received');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM os_billing_contracts')).rows[0].n,0);
 });
 await t.test('13 customer reads the issued quotation, records view and sees viewed status',async()=>{
  const d=await expect(customer.request('/customer/quotations/'+quoteId),200);assert.equal(d.quote.reference,'TEST-ACCEPTANCE-Q1');assert.equal(d.quote.effective_status,'sent');
  const er=(await db.query('SELECT revision FROM customer_enquiries WHERE id=$1',[enquiryId])).rows[0].revision;
  await expect(customer.request('/customer/quotations/'+quoteId+'/actions','POST',{revision:d.quote.revision,enquiryRevision:er,action:'view',body:''}),200);
  assert.ok((await db.query('SELECT viewed_at FROM quotation_versions WHERE id=$1',[quoteId])).rows[0].viewed_at);assert.equal((await expect(customer.request('/customer/quotations/'+quoteId),200)).quote.effective_status,'viewed');
 });
 await t.test('14 other company/customer and forged company header cannot read private enquiry or quotation',async()=>{
  await expect(otherOwner.request('/companies/current/enquiries/'+enquiryId),404);assert.ok(!(await expect(otherOwner.request('/companies/current/enquiries'),200)).items.some(e=>e.id===enquiryId));
  await expect(owner.request('/companies/current/enquiries/'+enquiryId,'GET',undefined,{'X-Company-ID':companyB}),409);
  await expect(otherCustomer.request('/customer/enquiries/'+enquiryId),404);await expect(otherCustomer.request('/customer/quotations/'+quoteId),404);
  await expect(otherOwner.request('/companies/select','POST',{companyId:companyA}),403);
 });
 await t.test('15 unpublished companies vanish from search/profile while owned history remains accessible',async()=>{
  assert.equal((await expect(customer.request('/public/vendors?search=Acceptance%20Boreal'),200)).total,0);await expect(customer.request('/public/vendors/'+companyB),404);
  await decision(companyA,'unpublish','[TEST] Explicit acceptance unpublication');assert.equal((await expect(customer.request('/public/vendors?search=Acceptance%20Aurora'),200)).total,0);await expect(customer.request('/public/vendors/'+companyA),404);assert.equal((await fetch(env.base+'/companies/'+companyA)).status,404);
  await expect(customer.request('/customer/quotations/'+quoteId),200);await expect(owner.request('/companies/current/enquiries/'+enquiryId),200);
 });
 console.log('ACCEPTANCE: genuine HTTP and PostgreSQL operations; no mocked API/DB responses; no SMTP delivery claimed.');
});

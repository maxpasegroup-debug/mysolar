import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('direct enquiries diagnose legacy coverage, preserve eligibility and complete a quotation',{skip:!process.env.TEST_DATABASE_URL,timeout:240000},async t=>{
 const script=process.env.MYSOLAR_DIRECT_BROWSER_SCRIPT;
 const fx=await connectedFixture(t,{port:script?3000:0,beforeStart:async()=>Object.assign(process.env,{AUTH_PIN_PEPPER:randomBytes(32).toString('hex'),SMTP_HOST:'127.0.0.1',SMTP_PORT:'9',SMTP_USER:'fixture',SMTP_PASSWORD:randomBytes(24).toString('hex'),MAIL_FROM:'fixture@example.invalid'})});
 const {db,a,b,customer,stranger,companyA}=fx;
 const expect=async(p,status)=>{const r=await p;assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const payload={title:'[TEST] Payyanur consultation',requestedItem:'Solar advice',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Kannur',pin:'670307',locality:'Payyanur',address:'[TEST] Fictional installation',requirements:'',contactMethod:'in_app',timeframe:'',mode:'direct',service:'energy_consultation'};
 const matches=(overrides={})=>customer.request('/customer/enquiry-matches','POST',{enquiry:{...payload,...overrides},page:1,companyId:companyA});
 await db.query("UPDATE company_branding SET public_name='[TEST] Harbour Solar' WHERE company_id=$1",[companyA]);
 await db.query('UPDATE company_onboarding SET profile_saved_at=now(),brand_saved_at=now(),business_saved_at=now() WHERE company_id=$1',[companyA]);
 await db.query("UPDATE company_business_profiles SET marketplace_requested=true,services=ARRAY['energy_consultation','rooftop_installation'],service_areas=ARRAY['Payyanur,Kannur'] WHERE company_id=$1",[companyA]);
 await db.query("DELETE FROM company_service_areas WHERE company_id=$1 AND label<>'Payyanur,Kannur'",[companyA]);
 await t.test('legacy comma-separated area fails even with real-format installation PIN and names',async()=>{
  const row=(await db.query('SELECT scope,state_key,district_key,pin,locality_key FROM company_service_areas WHERE company_id=$1',[companyA])).rows[0];assert.deepEqual(row,{scope:'locality',state_key:'',district_key:'',pin:'',locality_key:'payyanur,kannur'});
  const result=await expect(matches(),200);assert.equal(result.total,0);assert.equal(result.mismatch.code,'COVERAGE_INCOMPLETE');assert.match(result.mismatch.message,/structured coverage/);
  const forced=await expect(customer.request('/customer/enquiries','POST',{...payload,companyIds:[companyA],submissionKey:randomUUID()}),409);assert.match(forced.error.message,/structured coverage/);
 });
 // Model the separately approved correction through existing owner/operator APIs.
 const operator=fx.client();await operator.register('forensic-independent-operator');await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] Explicit disposable bootstrap')",[operator.user.id]);
 const revision=async()=>(await db.query('SELECT revision FROM companies WHERE id=$1',[companyA])).rows[0].revision;
 await expect(a.request('/companies/current/service-areas','PUT',{revision:await revision(),areas:[{scope:'pin',label:'[TEST] Payyanur installation PIN',state:'Kerala',district:'Kannur',pin:'670307',locality:'Payyanur'}]}),200);
 await t.test('coverage correction requires renewed independent approval and publication',async()=>{
  assert.equal((await expect(matches(),200)).mismatch.code,'DISTRIBUTOR_UNAVAILABLE');
  for(const action of ['approve_marketplace','publish'])await expect(operator.request('/platform/companies/'+companyA+'/actions','POST',{action,revision:await revision(),reason:'[TEST] Reviewed fictional exact installation coverage'}),200);
  const result=await expect(matches(),200);assert.deepEqual(result.items.map(v=>v.id),[companyA]);
 });
 await t.test('wrong PIN/district, unavailable service and product category fail specifically',async()=>{
  for(const changes of [{pin:'123456'},{pin:'123455'},{district:'Ernakulam'}])assert.equal((await expect(matches(changes),200)).mismatch.code,'LOCATION_NOT_COVERED');
  await expect(matches({state:'Tamil Nadu'}),400);await expect(matches({pin:'012345'}),400);
  assert.equal((await expect(matches({service:'maintenance'}),200)).mismatch.code,'SERVICE_NOT_LISTED');
  assert.equal((await expect(matches({categoryId:'10000000-0000-4000-8000-000000000002'}),200)).mismatch.code,'OFFER_NOT_AVAILABLE');
  assert.equal((await expect(customer.request('/customer/enquiry-matches','POST',{enquiry:{...payload,mode:'matching'},page:1}),200)).items.some(v=>v.id===companyA),true);
 });
 // Enrol fictional existing identity, then exercise the real mobile/PIN login API.
 const mobile='9876301041',pin='483729';await db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[customer.user.id]);
 const request=await expect(customer.request('/auth/pin/enrol/request','POST',{mobile,countryCode:'+91',credential:'Integration-only password 123!'}),202);
 const {unseal}=await import('../server/auth/sealed.js');const job=(await db.query("SELECT payload FROM mail_jobs WHERE kind='pin_otp' AND reference_hash=$1",[request.challenge])).rows[0];const otp=unseal(job.payload).text.match(/code is (\d{6})/)[1];
 await expect(customer.request('/auth/pin/enrol/confirm','POST',{challenge:request.challenge,otp,pin}),200);await customer.session();await expect(customer.request('/auth/pin/login','POST',{mobile,countryCode:'+91',pin}),200);await customer.session();
 const complete=async enquiryId=>{
  assert.ok((await expect(a.request('/companies/current/enquiries'),200)).items.some(e=>e.id===enquiryId));
  await expect(b.request('/companies/current/enquiries/'+enquiryId),404);await expect(stranger.request('/customer/enquiries/'+enquiryId),404);
  const quote=fx.quote(1);quote.reference='TEST-FORENSIC-'+randomUUID().slice(0,8);quote.items[0].productId=null;
  const draft=await expect(a.request('/companies/current/enquiries/'+enquiryId+'/quotations','POST',quote),201);
  await expect(customer.request('/customer/quotations/'+draft.id),404);await expect(a.request('/companies/current/quotations/'+draft.id+'/actions','POST',{revision:1,action:'send'}),200);
  const received=await expect(customer.request('/customer/quotations/'+draft.id),200);assert.equal(received.quote.total_paise,'11800');assert.equal(received.items[0].description,quote.items[0].description);assert.equal(received.quote.effective_status,'sent');
  await expect(b.request('/companies/current/quotations/'+draft.id),404);
  return draft.id;
 };
 await t.test('specific company receives one deduplicated enquiry and customer receives taxed quotation',async()=>{
  const body={...payload,companyIds:[companyA],submissionKey:randomUUID()},sent=await expect(customer.request('/customer/enquiries','POST',body),201);
  assert.equal((await expect(customer.request('/customer/enquiries','POST',body),201)).id,sent.id);assert.equal((await db.query('SELECT count(*)::int n FROM enquiry_recipients WHERE enquiry_id=$1',[sent.id])).rows[0].n,1);await complete(sent.id);
 });
 if(script)await (await import(script)).run({...fx,payload,mobile,pin,complete});
 await t.test('publication, activation and approval losses fail closed without changing historical access',async()=>{
  for(const [column,value,restore] of [['storefront_published',false,true],['lifecycle','suspended','active'],['marketplace_status','pending','approved']]){
   await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyA]);
   await db.query(`UPDATE companies SET ${column}=$1${column==='lifecycle'?",status='suspended'":''} WHERE id=$2`,[value,companyA]);
   assert.equal((await expect(matches(),200)).mismatch.code,'DISTRIBUTOR_UNAVAILABLE');
   await expect(customer.request('/customer/enquiry-options?companyId='+companyA),409);
   await expect(customer.request('/customer/enquiries','POST',{...payload,companyIds:[companyA],submissionKey:randomUUID()}),409);
   await db.query("UPDATE companies SET status='active',storefront_published=true,lifecycle='active',marketplace_status='approved' WHERE id=$1",[companyA]);
  }
 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('reviewed locality coverage never widens to the shared postal area',{skip:!process.env.TEST_DATABASE_URL,timeout:240000},async t=>{
 const script=process.env.MYSOLAR_LOCALITY_BROWSER_SCRIPT;
 const fx=await connectedFixture(t,{port:script?3000:0,beforeStart:async()=>Object.assign(process.env,{AUTH_PIN_PEPPER:randomBytes(32).toString('hex'),SMTP_HOST:'127.0.0.1',SMTP_PORT:'9',SMTP_USER:'fixture',SMTP_PASSWORD:randomBytes(24).toString('hex'),MAIL_FROM:'fixture@example.invalid'})});
 const {db,a,b,customer,stranger,companyA,companyB}=fx,operator=fx.client();await operator.register('locality-independent-reviewer');
 await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[TEST] Disposable independent reference reviewer')",[operator.user.id]);
 const expect=async(p,status)=>{const r=await p;assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const postals={rows:[{pin:'670307',state:'Kerala',district:'Kannur'},{pin:'670308',state:'Kerala',district:'Kannur'}],source:'[TEST] Reviewed fictional postal fixture',reason:'[TEST] Explicit disposable reference review'};
 await expect(operator.request('/platform/locations/import','POST',postals),200);
 const references={rows:[{pin:'670307',name:'[TEST] Harbour',active:true},{pin:'670307',name:'[TEST] Hillside',active:true},{pin:'670307',name:'[TEST] Riverside',active:true},{pin:'670308',name:'[TEST] Harbour',active:true}],source:'[TEST] Fictional named localities; not a production dataset',reason:'[TEST] Explicit independent locality review'};
 await t.test('reference import is operator-only, requires reviewed PIN and journals review',async()=>{
  await expect(operator.request('/platform/locations/import','POST',{...postals,rows:[{pin:'670307',state:'Tamil Nadu',district:'Kannur'}]}),400);
  await expect(a.request('/platform/localities/import','POST',references),403);
  await expect(operator.request('/platform/localities/import','POST',{...references,rows:[{pin:'999999',name:'Unknown',active:true}]}),400);
  await expect(operator.request('/platform/localities/import','POST',references),200);
  assert.equal((await db.query("SELECT count(*)::int n FROM audit_events WHERE action='catalogue.localities_reviewed'")).rows[0].n,1);
 });
 const payload={title:'[TEST] Locality request',requestedItem:'Solar advice',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Kannur',pin:'670307',locality:'[TEST] Harbour',address:'[TEST] Roof',requirements:'',contactMethod:'in_app',timeframe:'',mode:'direct',service:'energy_consultation'};
 await db.query("UPDATE company_business_profiles SET services=ARRAY['energy_consultation'],marketplace_requested=true WHERE company_id=ANY($1::uuid[])",[[companyA,companyB]]);
 await db.query("UPDATE company_branding SET public_name='[TEST] Locality Solar' WHERE company_id=$1",[companyA]);
 await db.query('UPDATE company_onboarding SET profile_saved_at=now(),brand_saved_at=now(),business_saved_at=now() WHERE company_id=ANY($1::uuid[])',[[companyA,companyB]]);
 const revision=async id=>(await db.query('SELECT revision FROM companies WHERE id=$1',[id])).rows[0].revision;
 const declaration=name=>({scope:'locality',label:name,state:'Kerala',district:'Kannur',pin:'670307',locality:name});
 const districtDeclaration={scope:'district',label:'[TEST] Explicit whole Kannur',state:'Kerala',district:'Kannur',pin:'',locality:'',confirmEntireDistrict:true};
 const publish=async id=>{for(const action of ['approve_marketplace','publish'])await expect(operator.request('/platform/companies/'+id+'/actions','POST',{revision:await revision(id),action,reason:'[TEST] Independent explicit coverage review'}),200);};
 const save=async(client,id,areas)=>{await expect(client.request('/companies/current/service-areas','PUT',{revision:await revision(id),areas}),200);await publish(id);};
 const match=async(overrides={},id=companyA)=>expect(customer.request('/customer/enquiry-matches','POST',{enquiry:{...payload,...overrides},page:1,...(id?{companyId:id}:{})}),200);
 const submit=(overrides={},id=companyA)=>customer.request('/customer/enquiries','POST',{...payload,...overrides,companyIds:[id],submissionKey:randomUUID()});
 await t.test('ambiguous legacy declarations remain preserved and ineligible',async()=>{
  const before=(await db.query('SELECT id FROM company_service_areas WHERE company_id=$1',[companyA])).rows;
  await db.query("UPDATE company_service_areas SET scope='locality',state='Kerala',district='Kannur',state_key='kerala',district_key='kannur',pin='670307',locality='[TEST] Harbour',locality_key='[test] harbour' WHERE company_id=$1",[companyA]);
  assert.equal((await match()).total,0);await expect(submit(),409);assert.deepEqual((await db.query('SELECT id FROM company_service_areas WHERE company_id=$1',[companyA])).rows,before);
 });
 await save(a,companyA,[declaration('[TEST] Harbour'),declaration('[TEST] Riverside')]);await save(b,companyB,[declaration('[TEST] Hillside')]);
 await t.test('state-only discovery shows declarations; district search excludes locality-only coverage',async()=>{
  const search=async fields=>expect(customer.request('/public/vendors?'+new URLSearchParams({search:'[TEST] Locality Solar',...fields})),200);
  const declared=await search({state:'Kerala'});assert.equal(declared.locationMatch,'declared_only');assert.deepEqual(declared.items.map(v=>v.id),[companyA]);
  for(const fields of [{state:'Kerala',district:'Kannur'},{state:'Kerala',district:'Kannur',area:'[TEST] Harbour'}])assert.equal((await search(fields)).total,0);
  assert.equal((await search({state:'Kerala',district:'Kozhikode'})).total,0);
  assert.equal((await search({state:'Kerala',district:'Kannur',pin:'670307',area:'[TEST] Hillside'})).total,0);
  assert.equal((await match({locality:'[TEST] Hillside'})).total,0);
  await expect(submit({locality:'[TEST] Hillside'}),409);
 });
 await t.test('reviewed localities sharing one PIN do not become district coverage',async()=>{
  assert.equal((await match({},null)).total,0);assert.equal((await match({locality:'[TEST] Hillside'},null)).total,0);
  assert.equal((await match({locality:'[TEST] Hillside'})).total,0);await expect(submit({locality:'[TEST] Hillside'}),409);
  assert.equal((await match({locality:'[TEST] Riverside'})).total,0);
  const q=new URLSearchParams({state:'Kerala',district:'Kannur',pin:'670307',area:'[TEST] Harbour'});
  const publicMatches=await expect(customer.request('/public/vendors?'+q),200);assert.equal(publicMatches.total,0);
  assert.equal((await match({locality:'  [TEST]   HARBOUR  '})).total,0);
  assert.equal((await match({locality:''})).total,0);await expect(submit({locality:''}),409);
 });
 await t.test('locality-only companies remain ineligible and unsafe coverage saves fail closed',async()=>{
  for(const fields of [{pin:'670308'},{pin:'999999'},{district:'Ernakulam'},{locality:'Not reviewed'}]){assert.equal((await match(fields)).total,0);await expect(submit(fields),409);}
  await expect(customer.request('/customer/enquiry-matches','POST',{enquiry:{...payload,state:'Tamil Nadu'},page:1}),400);
  for(const bad of [{...declaration('[TEST] Harbour'),scope:'pin'},{...declaration('[TEST] Harbour'),scope:'district'},{...declaration('Not reviewed')},{...declaration('[TEST] Harbour'),district:'Ernakulam'}])await expect(a.request('/companies/current/service-areas','PUT',{revision:await revision(companyA),areas:[bad]}),400);
 });
 await t.test('whole district and exact PIN remain explicit broad scopes, never locality fallbacks',async()=>{
  const samePublic=async()=>{const q=new URLSearchParams({state:payload.state,district:payload.district,pin:payload.pin,area:payload.locality});assert.deepEqual((await expect(customer.request('/public/vendors?'+q),200)).items.map(v=>v.id).sort(),(await match({},null)).items.map(v=>v.id).sort());};
  await save(b,companyB,[districtDeclaration]);
  await samePublic();
  assert.equal((await match({},companyB)).total,1);assert.equal((await match({pin:'670308'},companyB)).total,1);
  await save(b,companyB,[{scope:'pin',label:'[TEST] Explicit whole PIN',state:'Kerala',district:'Kannur',pin:'670307',locality:''}]);
  await samePublic();
  assert.equal((await match({locality:'[TEST] Hillside'},companyB)).total,0);assert.equal((await match({pin:'670308'},companyB)).total,0);
  await save(b,companyB,[declaration('[TEST] Hillside')]);
 });
 await t.test('unpublication invalidates review while withdrawn postal references do not cancel district coverage',async()=>{
  await save(a,companyA,[districtDeclaration]);
  assert.equal((await match()).total,1);await db.query('UPDATE companies SET storefront_published=false WHERE id=$1',[companyA]);assert.equal((await match()).total,0);await expect(submit(),409);assert.equal((await expect(customer.request('/public/vendors?'+new URLSearchParams({search:'[TEST] Locality Solar',state:'Kerala',district:'Kannur'})),200)).total,0);await db.query('UPDATE companies SET storefront_published=true WHERE id=$1',[companyA]);
  await expect(operator.request('/platform/localities/import','POST',{...references,rows:[{pin:'670307',name:'[TEST] Harbour',active:false}]}),200);assert.equal((await match()).total,1);await expect(submit(),201);await expect(operator.request('/platform/localities/import','POST',{...references,rows:[references.rows[0]]}),200);
 });
 await t.test('public profile distinguishes explicit district coverage from narrower locality coverage',async()=>{
  const profile=()=>customer.request('/public/vendors/'+companyA);
  assert.equal((await expect(profile(),200)).quotationCoverage.verified,true);
  await save(a,companyA,[declaration('[TEST] Harbour'),declaration('[TEST] Riverside')]);await db.query('UPDATE company_service_areas SET locality_reference_id=NULL WHERE company_id=$1',[companyA]);
  let publicData=await expect(profile(),200);assert.equal(publicData.quotationCoverage.verified,false);assert.equal(publicData.vendor.name,'[TEST] Locality Solar');
  assert.doesNotMatch(JSON.stringify(publicData),/This State, District and PIN combination has no reviewed postal reference/);await expect(submit(),409);
  await save(a,companyA,[declaration('[TEST] Harbour'),declaration('[TEST] Riverside')]);
  await db.query("UPDATE postal_locations SET active=false WHERE pin='670307'");
  assert.equal((await expect(profile(),200)).quotationCoverage.verified,false);await expect(submit(),409);
  await db.query("UPDATE postal_locations SET active=true WHERE pin='670307'");
  await db.query("UPDATE postal_localities SET active=false WHERE pin='670307'");
  assert.equal((await expect(profile(),200)).quotationCoverage.verified,false);await expect(submit(),409);
  await db.query("UPDATE postal_localities SET active=true WHERE pin='670307'");
  assert.equal((await expect(profile(),200)).quotationCoverage.verified,false);
  await save(a,companyA,[districtDeclaration]);assert.equal((await expect(profile(),200)).quotationCoverage.verified,true);
 });
 await t.test('coverage withdrawal serializes with final routing; reference changes do not gate district coverage',async()=>{
  const lock=await fx.connection();
  const {eligibleRecipients}=await import('../server/purchase/service.js');
  const {enquiry:validate}=await import('../server/purchase/validation.js');
  const data=()=>validate({...payload,companyIds:[companyA],submissionKey:randomUUID()});
  const blocked=async()=>{
   const end=Date.now()+8000;
   while(Date.now()<end){
    const r=await db.query('SELECT count(*)::int n FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid))',[lock.processID]);
    if(r.rows[0].n)return;
    await new Promise(r=>setTimeout(r,25));
   }
   assert.fail('Expected a real PostgreSQL lock wait, not merely a pending promise');
  };
  try{
   // Withdrawal wins: the real HTTP final submission waits, then sees no coverage.
   await lock.query('BEGIN');await lock.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[companyA]);
   await lock.query('DELETE FROM company_service_areas WHERE company_id=$1',[companyA]);
   const pending=submit();await blocked();await lock.query('COMMIT');
   await expect(pending,409);
   await save(a,companyA,[districtDeclaration]);
   // Routing wins: the existing HTTP owner coverage change waits for the routing transaction.
   await lock.query('BEGIN');assert.equal((await eligibleRecipients(lock,data())).length,1);
   const changed=a.request('/companies/current/service-areas','PUT',{revision:await revision(companyA),areas:[declaration('[TEST] Riverside')]});
   await blocked();await lock.query('COMMIT');await expect(changed,200);await expect(submit(),409);
   await save(a,companyA,[districtDeclaration]);
   // Postal reference withdrawal does not block an unrelated district-only route.
   await lock.query('BEGIN');assert.equal((await eligibleRecipients(lock,data())).length,1);
   const withdrawn=operator.request('/platform/localities/import','POST',{...references,rows:[{...references.rows[0],active:false}]});
   await expect(withdrawn,200);await lock.query('COMMIT');await expect(submit(),201);
   await expect(operator.request('/platform/localities/import','POST',{...references,rows:[references.rows[0]]}),200);
  }finally{await lock.query('ROLLBACK');await lock.end();}
 });
 await t.test('customer creates one direct enquiry, intended company responds, other tenant cannot read',async()=>{
  const sent=await expect(submit(),201);assert.equal((await expect(a.request('/companies/current/enquiries/'+sent.id),200)).enquiry.locality,'[TEST] Harbour');await expect(b.request('/companies/current/enquiries/'+sent.id),404);await expect(stranger.request('/customer/enquiries/'+sent.id),404);
  const quote=fx.quote(1);quote.items[0].productId=null;const draft=await expect(a.request('/companies/current/enquiries/'+sent.id+'/quotations','POST',quote),201);await expect(a.request('/companies/current/quotations/'+draft.id+'/actions','POST',{revision:1,action:'send'}),200);assert.equal((await expect(customer.request('/customer/quotations/'+draft.id),200)).quote.total_paise,'11800');
 });
 if(script){
  const mobile='9876301051',pin='483729';await db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[customer.user.id]);
  const enrolled=await expect(customer.request('/auth/pin/enrol/request','POST',{mobile,countryCode:'+91',credential:'Integration-only password 123!'}),202);
  const {unseal}=await import('../server/auth/sealed.js');const job=(await db.query("SELECT payload FROM mail_jobs WHERE kind='pin_otp' AND reference_hash=$1",[enrolled.challenge])).rows[0];
  await expect(customer.request('/auth/pin/enrol/confirm','POST',{challenge:enrolled.challenge,otp:unseal(job.payload).text.match(/code is (\d{6})/)[1],pin}),200);await customer.session();
  await (await import(script)).run({...fx,payload,references,mobile,pin});
 }
});

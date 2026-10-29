import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();
const {usableBusinessChallenge,signupDeliveryMessage}=await import('../server/auth/business-signup.js');
const {billingConfiguration,renewalAmount,verifyWebhook,safeCheckout,razorpayClient}=await import('../server/commercial/razorpay.js');
const {accessFromRow,freeOsPath,osGate}=await import('../server/commercial/os-access.js');
const {trialDates,planMatches,capturedInvoice,prepareContract,processBillingEvent,approvedOsOffer,createProviderContract}=await import('../server/commercial/os-billing.js');
const terms={name:'[UNIT FIXTURE] Plan',currency:'INR',taxMode:'inclusive',taxRate:'0',pricePaise:'350000',interval:'monthly',trialDays:7};
test('email-first proof requires same session, valid lifetime, unconsumed proof and attempts below five',()=>{const row={session_hash:'session',expires_at:'2026-10-29T12:15:00Z',attempts:0},now=Date.parse('2026-10-29T12:00:00Z');assert.ok(usableBusinessChallenge(row,'session',now));for(const patch of [{session_hash:'other'},{used_at:'used'},{attempts:5},{expires_at:'2026-10-29T12:00:00Z'}])assert.equal(usableBusinessChallenge({...row,...patch},'session',now),false);});
test('delivery status distinguishes worker failures from inbox receipt',()=>{assert.match(signupDeliveryMessage('dead'),/delivery failed/);assert.match(signupDeliveryMessage('dead'),/No account has been created/);assert.match(signupDeliveryMessage('retry'),/retrying/);assert.match(signupDeliveryMessage('accepted'),/does not confirm inbox delivery/);assert.doesNotMatch(signupDeliveryMessage('pending'),/email delivered|account created/i);});
test('provider is disabled without credentials and test mode cannot unlock production',()=>{assert.equal(billingConfiguration({}).available,false);const env={RAZORPAY_BILLING_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'unit-only',RAZORPAY_WEBHOOK_SECRET:'x'.repeat(32)};assert.equal(billingConfiguration(env).available,true);assert.equal(billingConfiguration({...env,NODE_ENV:'production'}).available,false);assert.equal(billingConfiguration({...env,RAZORPAY_BILLING_MODE:'live',RAZORPAY_KEY_ID:'rzp_live_fixture'}).available,false);});
test('unknown tax, annual prices, non-INR, unpublished/zero prices and trial changes are not billable',()=>{assert.equal(renewalAmount(terms),350000);for(const patch of [{taxMode:'exclusive'},{taxMode:'unknown'},{currency:'USD'},{interval:'annual'},{trialDays:14},{pricePaise:'0'},{pricePaise:null}])assert.throws(()=>renewalAmount({...terms,...patch}));});
test('webhook verification uses exact bytes and rejects malformed/replayed-as-changed signatures',()=>{const raw=Buffer.from('{"event":"unit"}'),key='unit-webhook-secret',sig=createHmac('sha256',key).update(raw).digest('hex');assert.ok(verifyWebhook(raw,sig,key));assert.equal(verifyWebhook(Buffer.from('{ "event":"unit"}'),sig,key),false);assert.equal(verifyWebhook(raw,'no',key),false);assert.equal(verifyWebhook(raw,sig,'other'),false);});
test('checkout links are restricted to the approved provider origin',()=>{assert.equal(safeCheckout('https://rzp.io/i/unit'),'https://rzp.io/i/unit');for(const url of ['javascript:alert(1)','https://rzp.io.evil.invalid/i/a','https://user:pass@rzp.io/i/a','http://rzp.io/i/a'])assert.throws(()=>safeCheckout(url));});
test('trial dates are exactly 168 hours and reminders start on day 5',()=>{const d=trialDates(new Date('2026-10-29T12:00:00Z'));assert.equal(d.end.getTime()-d.start.getTime(),604800000);assert.deepEqual(d.reminders.map(x=>x.day),[5,6,7]);assert.equal(d.reminders[0].due.toISOString(),'2026-11-02T12:00:00.000Z');});
test('legacy agreements remain authoritative, enrolled companies expire on server time',()=>{assert.ok(accessFromRow({managed:false}).unlocked);const row={managed:true,had_access:true,status:'trial',start_at:'2026-10-29T00:00:00Z',end_at:'2026-11-05T00:00:00Z'};assert.ok(accessFromRow(row,Date.parse('2026-11-04T23:59:59Z')).unlocked);assert.equal(accessFromRow(row,Date.parse(row.end_at)).unlocked,false);assert.equal(accessFromRow({managed:true,had_access:false}).status,'trial_required');});
test('free listing stays separate and direct operational actions fail closed before trial',async()=>{const db={query:async()=>({rows:[{managed:true,had_access:false}]})},ctx={companyId:'company'};assert.ok(freeOsPath('setup/sia-plan'));assert.ok(freeOsPath('marketplace-request'));assert.equal(freeOsPath('operations/orders'),false);assert.equal(await osGate(db,ctx,{method:'PUT',originalUrl:'/api/companies/current/branding'}),true);await assert.rejects(osGate(db,ctx,{method:'POST',originalUrl:'/api/companies/current/operations/orders'}),{code:'OS_ACTIVATION_REQUIRED'});await assert.rejects(osGate(db,ctx,{method:'GET',originalUrl:'/api/companies/current/operations/dashboard'}),{code:'OS_ACTIVATION_REQUIRED'});});
test('expiry preserves authorised reads but rejects new writes',async()=>{const db={query:async()=>({rows:[{managed:true,had_access:true,status:'expired'}]})},ctx={companyId:'company'};assert.equal(await osGate(db,ctx,{method:'GET',originalUrl:'/api/companies/current/operations/orders'}),false);await assert.rejects(osGate(db,ctx,{method:'POST',originalUrl:'/api/companies/current/operations/orders'}),{code:'OS_ACTIVATION_REQUIRED'});});
test('provider adapter never requests arbitrary URLs or performs automatic POST retries',async()=>{let attempts=0;const provider=razorpayClient({settings:{available:true,key:'unit',secret:'unit'},fetcher:async(url)=>{assert.equal(url,'https://api.razorpay.com/v1/subscriptions');attempts++;throw Error('private provider text');}});await assert.rejects(provider.request('POST','subscriptions',{}),e=>e.code==='BILLING_RESULT_UNKNOWN'&&!e.message.includes('private provider text'));assert.equal(attempts,1);await assert.rejects(provider.request('GET','https://evil.invalid'));});
test('provider plan and captured invoice proof must reconcile before paid access',()=>{assert.ok(planMatches({item:{currency:'INR',amount:350000},period:'monthly',interval:1},terms));assert.equal(planMatches({item:{currency:'INR',amount:1},period:'monthly',interval:1},terms),false);const contract={terms,provider_subscription_id:'sub_unit',trial_end:'2026-11-05T00:00:00Z'},start=Date.parse(contract.trial_end)/1000,payment={id:'pay_unit',invoice_id:'inv_unit',status:'captured',currency:'INR',amount:350000},invoice={id:'inv_unit',payment_id:'pay_unit',status:'paid',currency:'INR',amount_paid:350000,billing_start:start,billing_end:start+2592000};assert.ok(capturedInvoice(invoice,payment,contract));assert.equal(capturedInvoice({...invoice,subscription_id:'sub_other'},payment,contract),false);assert.equal(capturedInvoice(invoice,{...payment,status:'authorized'},contract),false);assert.equal(capturedInvoice({...invoice,billing_start:start-1},payment,contract),false);});
test('non-owners and missing provider configuration cannot create trial contracts',async()=>{const db={query(){assert.fail('No writes allowed');}};await assert.rejects(prepareContract(db,{role:'sales'},{},{available:true}),{code:'OWNER_REQUIRED'});await assert.rejects(prepareContract(db,{role:'owner'},{},{available:false}),{code:'BILLING_UNAVAILABLE'});});
test('new checkout accepts only approved monthly tier capacities, never annual, agents or custom Enterprise',()=>{for(const [code,count] of [['starter',10],['pro',25],['elite',50]]){assert.equal(approvedOsOffer(code,{...terms,limits:{team:count}}),true);assert.equal(approvedOsOffer(code,{...terms,limits:{team:count+1}}),false);}for(const code of ['enterprise','free','marketing_agent'])assert.equal(approvedOsOffer(code,{...terms,limits:{team:10}}),false);assert.equal(approvedOsOffer('starter',{...terms,limits:{team:10},interval:'annual'}),false);});
test('duplicate provider events do not execute another agreement or payment',async()=>{let queries=0;const r=await processBillingEvent({db:{query:async()=>{queries++;return {rowCount:0};}},contract:{id:'unit'},event:{event:'subscription.charged'},providerSubscription:{status:'active'},eventId:'unit',hash:'unit'});assert.deepEqual(r,{duplicate:true});assert.equal(queries,1);});
test('captured payment evidence is retained when an operator agreement change prevents automatic access',async()=>{
 const calls=[],end='2026-11-05T00:00:00Z',start=Date.parse(end)/1000,c={id:'contract',company_id:'company',owner_id:'owner',plan_version_id:'version',terms,mode:'test',provider_subscription_id:'sub_unit',trial_end:end,commercial_revision:0};
 const db={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('FROM razorpay_plan_mappings'))return {rows:[{provider_plan_id:'plan_unit'}]};if(sql.includes('SELECT revision FROM company_commercial_state'))return {rows:[{revision:2}]};return {rowCount:1,rows:[{}]};}};
 const payment={id:'pay_unit',invoice_id:'inv_unit',status:'captured',amount:350000,currency:'INR'},invoice={id:'inv_unit',payment_id:'pay_unit',status:'paid',amount_paid:350000,currency:'INR',billing_start:start,billing_end:start+2592000};
 const r=await processBillingEvent({db,contract:c,event:{event:'subscription.charged',mode:'test'},providerSubscription:{id:'sub_unit',plan_id:'plan_unit',start_at:start,status:'active'},payment,invoice,eventId:'event-unit',hash:'hash-unit'});
 assert.equal(r.reviewRequired,true);assert.ok(calls.some(x=>x.sql.startsWith('INSERT INTO os_billing_payments')));assert.ok(!calls.some(x=>x.sql.startsWith('INSERT INTO company_subscriptions')));
});
const {startFreeTrial}=await import('../server/commercial/free-trial.js');
function ui(){const window={addEventListener(){}},context={window,document:{addEventListener(){}},setTimeout,clearTimeout,location:{hash:'#/distributor/activate'},escapeHTML:x=>String(x??'').replaceAll('<','&lt;'),Account:{},link:(p,l)=>`<a href="#${p}">${l}</a>`};vm.runInNewContext(readFileSync('src/business-access.js','utf8'),context);return window.BusinessAccess;}
test('proposal cards contain exactly the approved monthly prices and user limits, no annual offer',()=>{const html=ui().proposalCards();for(const text of ['Starter','₹3,500','Up to 10 users','Pro','₹6,999','Up to 25 users','Elite','₹9,999','Up to 50 users','Enterprise','Custom pricing','Annual billing is unavailable'])assert.ok(html.includes(text),text);assert.ok(!html.includes('including owner'));assert.ok(!html.includes('data-ba-checkout'));assert.ok(!html.includes('% GST'));});
test('post-trial offer rendering still needs explicit consent and never assumes a mandate',()=>{
 const data={plans:[{eligible:true,version_id:'unit-version',total_count:12,terms:{...terms,limits:{team:10}}}],contract:null,access:{status:'trial_required'},company:{name:'[UNIT FIXTURE] Company',lifecycle:'active'},billingAvailable:true,trialEligible:false,subscriptionEligible:true,mode:'test',reminders:[]};
 const window={addEventListener(){}},context={window,document:{addEventListener(){}},setTimeout,clearTimeout,location:{hash:'#/distributor/activate'},Account:{navAllowed:()=>false,resource:(_key,_url,draw)=>draw(data)},I18n:{money:x=>'INR '+x},crypto:{randomUUID:()=> 'unit-operation'},heading:(_tag,title)=>'<h1>'+title+'</h1>',escapeHTML:x=>String(x??'').replaceAll('<','&lt;'),link:(p,l)=>`<a href="#${p}">${l}</a>`};
 vm.runInNewContext(readFileSync('src/business-access.js','utf8'),context);const html=window.BusinessAccess.page('/distributor/activate');assert.match(html,/data-ba-checkout/);assert.match(html,/name="consent" type="checkbox" required/);assert.match(html,/No payment mandate is assumed/);assert.match(html,/annual billing is unavailable/i);assert.match(html,/TalkinLabs/);assert.match(html,/Coming Soon/);
 data.billingAvailable=false;assert.doesNotMatch(window.BusinessAccess.page('/distributor/activate'),/data-ba-checkout/);
});

test('day 5 reminder and 168-hour lock use authoritative server boundaries',()=>{
 const start=Date.parse('2026-10-29T00:00:00Z'),row={managed:true,had_access:true,status:'trial',start_at:new Date(start).toISOString(),end_at:new Date(start+7*86400000).toISOString()};
 assert.equal(accessFromRow(row,start+4*86400000-1).renewalReminder,false);
 assert.equal(accessFromRow(row,start+4*86400000).renewalReminder,true);
 assert.equal(accessFromRow(row,start+4*86400000).trialDay,5);
 assert.equal(accessFromRow(row,start+7*86400000-1).unlocked,true);
 assert.equal(accessFromRow(row,start+7*86400000).unlocked,false);
 assert.equal(accessFromRow(row,start+7*86400000).renewalReminder,false);
});

function trialDb(previous=null){
 const calls=[];const db={query:async(sql,args)=>{calls.push({sql,args});
  if(sql.includes('SELECT status FROM companies'))return {rows:[{status:'active'}]};
  if(sql.includes('FROM users')||sql.includes('FROM company_os_enrolment'))return {rowCount:1,rows:[{}]};
  if(sql.includes('SELECT s.* FROM company_subscriptions'))return {rowCount:previous?1:0,rows:previous?[previous]:[]};
  if(sql.includes('SELECT current_subscription_id'))return {rows:[{current_subscription_id:previous?.id}]};
  if(sql.includes('FROM os_billing_contracts'))return {rowCount:0,rows:[]};
  if(sql.includes('FROM os_trial_configuration'))return {rows:[{enabled:true,plan_version_id:'version',plan_id:'plan',code:'starter',status:'draft',terms:{...terms,pricePaise:null,taxMode:'unknown',limits:{team:10},features:{crm:true}}}]};
  if(sql.includes('FROM commercial_settings_versions'))return {rows:[{id:'settings',data:{setupFee:{enabled:false}}}]};
  if(sql.startsWith('INSERT INTO company_commercial_state'))return {rows:[{revision:1}]};
  return {rows:[],rowCount:1};
 }};return {db,calls};
}
test('free trial uses existing access records without provider, price, mandate or email writes',async()=>{
 const {db,calls}=trialDb(),now=new Date('2026-10-29T00:00:00Z');
 const result=await startFreeTrial(db,{role:'owner',lifecycle:'active',userId:'owner',companyId:'company'},'version',{now});
 assert.equal(result.replayed,false);assert.equal(result.end-now,604800000);
 const insert=calls.find(c=>c.sql.startsWith('INSERT INTO company_subscriptions'));
 assert.equal(insert.args[7],'trial');assert.equal(insert.args[10],true);assert.equal(insert.args[11],'owner_trial');
 assert.equal(insert.args[4].pricePaise,null);
 assert.ok(!calls.some(c=>/INSERT INTO (os_billing_contracts|os_billing_payments|mail_jobs|os_trial_reminders)/.test(c.sql)));
});
test('trial retries preserve dates and expired/history trials cannot restart',async()=>{
 const row={id:'old',trial_granted:true,plan_version_id:'version',status:'trial',start_at:'2026-10-29T00:00:00Z',end_at:'2026-11-05T00:00:00Z'};
 const {db,calls}=trialDb(row),ctx={role:'owner',lifecycle:'active',userId:'owner',companyId:'company'};
 const replay=await startFreeTrial(db,ctx,'version',{now:new Date('2026-11-01')});assert.equal(replay.replayed,true);
 assert.equal(replay.end,row.end_at);assert.ok(!calls.some(c=>c.sql.startsWith('INSERT')));
 await assert.rejects(startFreeTrial(db,ctx,'version',{now:new Date(row.end_at)}),{code:'TRIAL_ALREADY_USED'});
 await assert.rejects(startFreeTrial(db,ctx,'different',{now:new Date('2026-11-01')}),{code:'TRIAL_ALREADY_USED'});
 await assert.rejects(startFreeTrial(db,{...ctx,role:'sales'},'version'),{code:'OWNER_REQUIRED'});
 await assert.rejects(startFreeTrial(db,{...ctx,lifecycle:'onboarding'},'version'),{code:'COMPANY_NOT_ACTIVE'});
});
test('post-trial checkout creates an immediate payment subscription, not another trial',async()=>{
 const requests=[],provider={request:async(method,path,body)=>{requests.push({method,path,body});return method==='GET'?{item:{currency:'INR',amount:350000},period:'monthly',interval:1}:{id:'sub_unit',plan_id:'plan_unit',status:'created',short_url:'https://rzp.io/i/unit'};}};
 await createProviderContract(provider,{id:'contract',purpose:'post_trial_subscription',terms,trial_end:'2026-01-01'}, {provider_plan_id:'plan_unit',total_count:12});
 assert.equal(requests[1].body.start_at,undefined);
 assert.ok(requests[1].body.expire_by>Math.floor(Date.now()/1000));
});
test('a post-trial mandate authorisation without captured payment grants no access',async()=>{
 const calls=[],db={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('FROM razorpay_plan_mappings'))return {rows:[{provider_plan_id:'plan_unit'}]};if(sql.includes('SELECT revision'))return {rows:[{revision:1}]};return {rowCount:1,rows:[{}]};}};
 const result=await processBillingEvent({db,contract:{id:'contract',company_id:'company',owner_id:'owner',purpose:'post_trial_subscription',plan_version_id:'version',provider_subscription_id:'sub_unit',mode:'test',commercial_revision:1},event:{event:'subscription.authenticated',mode:'test'},providerSubscription:{id:'sub_unit',plan_id:'plan_unit',status:'authenticated'},eventId:'unit',hash:'unit'});
 assert.equal(result.observed,true);assert.ok(!calls.some(c=>c.sql.startsWith('INSERT INTO company_subscriptions')));
});
test('free trial is offered with billing disabled and cannot open a checkout during trial',()=>{
 const data={plans:[],contract:null,access:{status:'trial_required'},company:{name:'[UNIT FIXTURE]',lifecycle:'active'},billingAvailable:false,trialEligible:true,subscriptionEligible:false,freeTrial:{configured:true,versionId:'version',name:'[UNIT FIXTURE] Reviewed scope'},mode:'disabled',reminders:[]};
 const window={addEventListener(){}},context={window,document:{addEventListener(){}},setTimeout,clearTimeout,location:{hash:'#/distributor/activate'},Account:{navAllowed:()=>false,resource:(_key,_url,draw)=>draw(data)},I18n:{money:x=>x},heading:(_tag,title)=>title,escapeHTML:x=>String(x??''),link:(p,l)=>l};
 vm.runInNewContext(readFileSync('src/business-access.js','utf8'),context);const html=window.BusinessAccess.page('/distributor/activate');
 assert.match(html,/data-ba-trial/);assert.match(html,/No autopay setup/);assert.doesNotMatch(html,/data-ba-checkout/);
 assert.match(html,/name="confirm" type="checkbox" required/);
 assert.equal(window.BusinessAccess.trialNotice({unlocked:true,renewalReminder:false}),'');
 assert.match(window.BusinessAccess.trialNotice({unlocked:true,renewalReminder:true,trialEnd:'2026-11-05T00:00:00Z'}),/No automatic charge is scheduled/);
});

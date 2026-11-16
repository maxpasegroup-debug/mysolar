import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();
const {pool}=await import('../server/db/pool.js');
// Any accidental unstubbed query fails in memory, before opening a socket.
pool.connect=async()=>{throw Error('Real database access prohibited in this specification');};
pool.query=async()=>{throw Error('Real database access prohibited in this specification');};
const {platform,withPlatform}=await import('../server/platform/routes.js');
const {reviewTransition,reasonRequired,reviewQueues}=await import('../server/platform/company-review.js');
const {matching,eligibleRecipients,receivedEnquiry,listEnquiries}=await import('../server/purchase/service.js');
const {purchaseCustomer}=await import('../server/purchase/customer.js');
const {requireUser,csrf}=await import('../server/auth/sessions.js');
const {osGate}=await import('../server/commercial/os-access.js');
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',operator='20000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000002';
const permissions=['platform.companies.read','platform.onboarding.review','platform.marketplace.review','platform.lifecycle.manage'];
const initial=()=>({id,name:'[TEST] Example Solar',status:'active',lifecycle:'pending_review',marketplace_status:'pending',storefront_published:false,revision:1,created_by:customer,suspended_from:null});
const result=rows=>({rows,rowCount:rows.length});
function fixture(options={}){
 const c={...initial(),...options.company},calls=[],reviews=[],audits=[],recipients=[];
 const db={calls,c,reviews,audits,recipients,release(){},async query(sql,args=[]){
  calls.push({sql,args});
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return result([]);
  if(sql.includes('FROM users u WHERE'))return result([{id:options.userId||operator,display_name:'[TEST] User',email:'user@example.invalid',account_type:options.accountType||'business'}]);
  if(sql.includes('FROM sessions WHERE'))return result(options.revoked?[]:[{active_company_id:id}]);
  if(sql.includes('FROM platform_admin_grants'))return result(options.grant===false?[]:[{role_id:'platform_admin'}]);
  if(sql.includes('FROM role_permissions'))return result((args[0]==='customer'?['customer.enquiries.own']:options.permissions||permissions).map(permission_id=>({permission_id})));
  if(sql.startsWith('SELECT * FROM companies'))return result([c]);
  if(sql.includes('FROM company_memberships WHERE')&&!sql.includes('count('))return result(options.affiliated?[{id:'membership'}]:[]);
  if(sql.startsWith('SELECT id,name,city,business_email'))return result([c]);
  if(sql.startsWith('SELECT public_name'))return result([{public_name:'[TEST] Public Name',description:'Genuine fixture description',public_email:'solar@example.invalid',public_phone:'',...options.brand}]);
  if(sql.startsWith('SELECT services,rooftop_available'))return result([{services:['energy_consultation'],service_areas:['Test District'],preferred_contact:'email',marketplace_requested:true,...options.business}]);
  if(sql.startsWith('SELECT profile_saved_at'))return result([{profile_saved_at:'date',brand_saved_at:'date',business_saved_at:'date',submitted_at:'2026-11-16T09:00:00Z',...options.onboarding}]);
  if(sql.startsWith('SELECT legal_name'))return result([{legal_name:'[TEST] Legal Name'}]);
  if(sql.startsWith('SELECT r.id,r.kind'))return result(reviews);
  if(sql.includes("commercial_public_allowed($1,'storefront')"))return result([{allowed:options.listingAllowed!==false}]);
  if(sql.startsWith('SELECT 1 FROM company_reviews'))return result(options.approvalRecorded===false?[]:[{exists:1}]);
  if(sql.startsWith('UPDATE companies SET lifecycle=')){Object.assign(c,{lifecycle:args[0],status:args[1],suspended_from:args[2],marketplace_status:args[3],storefront_published:args[4],revision:c.revision+1});return result([]);}
  if(sql.startsWith('INSERT INTO company_reviews')){reviews.push({company_id:args[0],kind:args[2],previous_state:args[3],new_state:args[4],reason:args[5]});return result([]);}
  if(sql.startsWith('INSERT INTO audit_events')){audits.push({company:args[1],action:args[2],metadata:JSON.parse(args[4])});return result([]);}
  if(sql.startsWith('SELECT count(*)::int AS total FROM companies'))return result([{total:1}]);
  if(sql.startsWith('SELECT c.id,c.name,c.city'))return result([c]);
  if(sql.startsWith('SELECT scope,label'))return result([]);
  if(sql.includes('count(*) FILTER'))return result([{active:1,suspended:0}]);
  if(sql.includes('FROM audit_events a LEFT JOIN users'))return result([]);
  if(sql.startsWith('SELECT id FROM companies'))return result([{id}]);
  if(sql.startsWith('SELECT id FROM customer_enquiries'))return result([]);
  if(sql.startsWith('SELECT v.id,v.name,v.city FROM marketplace_vendors'))return result((args[0]||[]).filter(x=>x===id).map(x=>({id:x,name:c.name,city:'Test District'})));
  if(sql.startsWith('SELECT phone FROM customer_profiles'))return result([{phone:''}]);
  if(sql.startsWith('INSERT INTO customer_enquiries')){db.enquiryArgs=args;return result([]);}
  if(sql.startsWith('INSERT INTO enquiry_recipients')){recipients.push(args);return result([]);}
  if(sql.startsWith('INSERT INTO enquiry_events')||sql.startsWith('INSERT INTO workflow_notifications'))return result([]);
  throw Error('Unexpected fixture query: '+sql);
 }};
 return db;
}
const req=(body={},method='POST')=>({body,method,params:{id},query:{},session:{user_id:operator,token_hash:'fictional-session'},originalUrl:'/api/platform/companies/'+id+'/actions'});
function handler(router,path,method){const route=router.stack.find(x=>x.route?.path===path&&x.route.methods[method]);assert.ok(route,path);return route.route.stack.at(-1).handle;}
async function action(db,decision,extra={}){pool.connect=async()=>db;let value;await handler(platform,'/companies/:id/actions','post')(req({action:decision,revision:db.c.revision,reason:'Reviewed fixture evidence',...extra}),{json:v=>{value=v;}});return value;}

test('anonymous and CSRF-less admin mutations are rejected by existing middleware',()=>{
 assert.throws(()=>requireUser({session:{user_id:null}},{},()=>{}),{code:'SIGN_IN_REQUIRED'});
 assert.throws(()=>csrf({sessionToken:'fictional',get:()=>''},{},()=>{}),{code:'CSRF_REJECTED'});
 assert.equal(platform.stack[0].handle,requireUser);
});
test('ordinary owner/customer without platform grant, missing permission, and revoked sessions fail closed',async()=>{
 for(const options of [{grant:false},{grant:false,accountType:'customer'},{permissions:['platform.companies.read']},{revoked:true}]){
  const db=fixture(options);pool.connect=async()=>db;let ran=false;
  await assert.rejects(withPlatform(req(),'platform.onboarding.review',()=>{ran=true;}),e=>['PLATFORM_ACCESS_DENIED','PERMISSION_DENIED','SIGN_IN_REQUIRED'].includes(e.code));
  assert.equal(ran,false);assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));assert.equal(db.reviews.length,0);
 }
});
test('activation, marketplace approval, publication and unpublication require distinct explicit decisions',async()=>{
 const db=fixture();await action(db,'approve');assert.equal(db.c.lifecycle,'active');assert.equal(db.c.marketplace_status,'pending');assert.equal(db.c.storefront_published,false);
 await action(db,'approve_marketplace');assert.equal(db.c.marketplace_status,'approved');assert.equal(db.c.storefront_published,false);
 await action(db,'publish');assert.equal(db.c.storefront_published,true);
 await action(db,'unpublish');assert.equal(db.c.storefront_published,false);assert.equal(db.c.lifecycle,'active');
 assert.equal(db.reviews.length,4);assert.equal(db.audits.filter(x=>x.action==='company.review_decision').length,4);
 assert.ok(db.audits.every(x=>x.company===id));assert.equal(db.audits.at(-1).metadata.decision,'unpublish');
});
test('free listing publication uses public policy without paid OS writability or assigning subscription',async()=>{
 const db=fixture({company:{lifecycle:'active',marketplace_status:'approved'}});await action(db,'publish');
 assert.ok(db.calls.some(x=>x.sql.includes("commercial_public_allowed($1,'storefront')")));
 assert.ok(db.calls.every(x=>!x.sql.includes('INSERT INTO company_subscriptions')&&!x.sql.includes('commercial_policy(')));
 assert.equal(db.c.storefront_published,true);
});
test('publication rejects absent public policy, missing approval history and invalid public identity',async()=>{
 for(const options of [{listingAllowed:false},{approvalRecorded:false},{brand:{public_name:''}},{onboarding:{brand_saved_at:null}}]){
  const db=fixture({company:{lifecycle:'active',marketplace_status:'approved'},...options});await assert.rejects(action(db,'publish'));
  assert.equal(db.c.storefront_published,false);assert.equal(db.reviews.length,0);
 }
});
test('self approval and affiliated approval are forbidden; stale decisions do not write',async()=>{
 for(const options of [{company:{created_by:operator}},{affiliated:true}]){const db=fixture(options);await assert.rejects(action(db,'approve'),{code:'INDEPENDENT_REVIEW_REQUIRED'});assert.equal(db.reviews.length,0);}
 const db=fixture();await assert.rejects(action(db,'approve',{revision:9}),{code:'REVISION_CHANGED'});assert.equal(db.c.lifecycle,'pending_review');
});
test('rejection and corrections preserve existing states and record distinct decision/reason audit',async()=>{
 for(const decision of ['reject','request_changes']){const db=fixture();await action(db,decision);assert.equal(db.c.lifecycle,'onboarding');assert.equal(db.c.storefront_published,false);assert.equal(db.audits.at(-1).metadata.decision,decision);assert.equal(db.reviews[0].reason,'Reviewed fixture evidence');}
 for(const [decision,state] of [['reject_marketplace','rejected'],['return_marketplace','withdrawn']]){const db=fixture({company:{lifecycle:'active'}});await action(db,decision);assert.equal(db.c.marketplace_status,state);assert.equal(db.c.lifecycle,'active');assert.equal(db.c.storefront_published,false);}
});
test('rejections, corrections, suspension and unpublication need reasons; invalid transitions fail',async()=>{
 for(const decision of ['reject','request_changes','reject_marketplace','return_marketplace','suspend','unpublish']){assert.ok(reasonRequired(decision));await assert.rejects(action(fixture(),decision,{reason:'short'}));}
 for(const decision of ['approve_marketplace','publish','reactivate','unpublish'])assert.throws(()=>reviewTransition(initial(),decision),{code:'INVALID_TRANSITION'});
 assert.throws(()=>reviewTransition(initial(),'grant_admin'));
});
test('admin queues are allowlisted and use parameterized public-name search',async()=>{
 for(const queue of Object.keys(reviewQueues)){const db=fixture();pool.connect=async()=>db;const r=req({},'GET');r.query={queue,search:"x' OR true --"};let output;await handler(platform,'/companies','get')(r,{json:v=>{output=v;}});assert.equal(output.total,1);const q=db.calls.find(x=>x.sql.startsWith('SELECT c.id,c.name,c.city'));assert.ok(q.sql.includes(reviewQueues[queue]));assert.ok(q.sql.includes('b.public_name'));assert.equal(q.args[0],r.query.search);assert.ok(!q.sql.includes(r.query.search));}
 const r=req({},'GET');r.query={queue:'untrusted SQL'};await assert.rejects(handler(platform,'/companies','get')(r,{json(){}}));
});
test('company review details expose submission, separate identity and actual coverage without customer records',async()=>{
 const db=fixture();pool.connect=async()=>db;let value;await handler(platform,'/companies/:id','get')(req({},'GET'),{json:v=>{value=v;}});
 assert.equal(value.onboarding.submitted_at,'2026-11-16T09:00:00Z');assert.equal(value.brand.public_name,'[TEST] Public Name');assert.ok(Array.isArray(value.areas));assert.ok(db.calls.every(x=>!x.sql.includes('FROM customer_enquiries')));
});
test('failed review journaling rolls back the existing transaction instead of committing a partial decision',async()=>{
 const db=fixture(),query=db.query.bind(db);db.query=async(sql,args)=>{if(sql.startsWith('INSERT INTO company_reviews'))throw Error('Fixture journal unavailable');return query(sql,args);};
 await assert.rejects(action(db,'approve'),/Fixture journal unavailable/);assert.ok(db.calls.some(x=>x.sql==='ROLLBACK'));assert.ok(!db.calls.some(x=>x.sql==='COMMIT'));
 // This proves transaction control flow only, not PostgreSQL rollback semantics.
});
const enquiry={title:'[TEST] Solar advice',requestedItem:'Solar consultation',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'advice',state:'Kerala',district:'Test District',pin:'673001',locality:'',address:'',requirements:'',contactMethod:'in_app',timeframe:'',mode:'direct',service:'energy_consultation',companyIds:[id],submissionKey:'30000000-0000-4000-8000-000000000001'};
test('customer request routes only to selected published company and records in-app notification',async()=>{
 const db=fixture({userId:customer,accountType:'customer'});pool.connect=async()=>db;const r=req(enquiry);r.session.user_id=customer;let response;
 await handler(purchaseCustomer,'/enquiries','post')(r,{status(n){assert.equal(n,201);return this;},json:v=>{response=v;}});
 assert.deepEqual(response.recipients,['[TEST] Example Solar']);assert.equal(db.recipients.length,1);assert.equal(db.recipients[0][1],id);assert.equal(db.enquiryArgs[1],customer);assert.equal(db.enquiryArgs[21],'sent');
 assert.ok(db.calls.some(x=>x.sql.startsWith('INSERT INTO workflow_notifications')));
 const query=db.calls.find(x=>x.sql.startsWith('SELECT v.id,v.name,v.city'));assert.match(query.sql,/v.id=ANY/);assert.match(query.sql,/FROM marketplace_vendors/);assert.doesNotMatch(query.sql,/'crm'/);
});
test('unpublished/ineligible selected recipient cannot be silently substituted',async()=>{
 const db=fixture();await assert.rejects(eligibleRecipients(db,{...enquiry,companyIds:[other],location:{state:'kerala',district:'test district',pin:'673001'}}),{code:'WORKFLOW_CHANGED'});assert.equal(db.recipients.length,0);
});
test('recipient preview applies the same published/coverage/service boundary without requiring paid CRM',async()=>{
 const calls=[],db={async query(sql,args){calls.push({sql,args});if(sql.includes('count(*)'))return result([{total:1}]);return result([{id}]);}};
 const data={...enquiry,productId:null,categoryId:null,offerId:null,location:{state:'kerala',district:'test district',pin:'673001'}};
 const preview=await matching(db,data,1,id);assert.equal(preview.total,1);assert.ok(calls.every(x=>x.sql.includes('FROM marketplace_vendors')));assert.match(calls[0].sql,/company_service_areas/);assert.match(calls[0].sql,/ANY\(v.services\)/);assert.ok(calls[0].args.includes(id));assert.doesNotMatch(calls[0].sql,/'crm'/);
});
test('company list/detail scope is recipient company; another tenant cannot open a request',async()=>{
 const calls=[],db={async query(sql,args){calls.push({sql,args});if(sql.includes('count(*)'))return result([{total:0}]);return result([]);}};
 await listEnquiries(db,{page:1},{ctx:{companyId:other}});assert.match(calls[0].sql,/r.company_id=\$1/);assert.equal(calls[0].args[0],other);
 await assert.rejects(receivedEnquiry(db,{companyId:other,lifecycle:'active'},id),{code:'NOT_FOUND'});assert.match(calls.at(-1).sql,/r.company_id=\$2/);assert.deepEqual(calls.at(-1).args,[id,other]);
});
test('unsubscribed business can read incoming enquiries but cannot reply or prepare quotations',async()=>{
 const db={async query(){return result([{managed:true,had_access:false}]);}},ctx={companyId:id};
 assert.equal(await osGate(db,ctx,{method:'GET',originalUrl:'/api/companies/current/enquiries'}),false);
 for(const path of ['enquiries/'+id+'/messages','enquiries/'+id+'/quotations'])await assert.rejects(osGate(db,ctx,{method:'POST',originalUrl:'/api/companies/current/'+path}),{code:'OS_SUBSCRIPTION_REQUIRED'});
});
test('customer directory menu is a hash link and admin UI hides itself without platform permission',()=>{
 const window={},link=(url,label)=>'<a href="#'+url+'">'+label+'</a>';
 const context={window,Account:{user:{name:'[TEST] Customer'},navAllowed:()=>true},CustomerLocale:{text:k=>k,languages:[],complete:()=>true},escapeHTML:x=>String(x??''),link,icon:()=>'',PublicHeader:{logo:()=>''},document:{addEventListener(){}},matchMedia:()=>({addEventListener(){}}),currentPath:'/customer/dashboard',locale:'en',mobileOpen:false,URLSearchParams,location:{hash:'#/customer/dashboard'}};
 vm.runInNewContext(fs.readFileSync('src/customer-dashboard.js','utf8'),context);assert.match(window.CustomerDashboard.shell(''),/href="#\/vendors">[\s\S]*?Find Solar Companies/);
 const adminContext={window:{addEventListener(){}},location:{hash:'#/platform'},document:{addEventListener(){}},Account:{session:{platformPermissions:[]}},Marketplace:{page:()=>null},escapeHTML:x=>String(x??''),URLSearchParams};
 vm.runInNewContext(fs.readFileSync('src/organization.js','utf8'),adminContext);assert.match(adminContext.window.Organization.page('/platform'),/Platform operator access required/);
});
test('admin views render five queues, submitted details, separate publication and explicit unselected decision',()=>{
 const data={company:initial(),profile:{legal_name:'[TEST] Legal'},brand:{public_name:'[TEST] Public',description:'Profile',public_email:'public@example.invalid',appearance:'clean',primary_color:'#601c2b',secondary_color:'#292b29',accent_color:'#d8ab55'},business:{services:['energy_consultation'],service_areas:['Test Area']},onboarding:{submitted_at:'2026-11-16T09:00:00Z',profile_saved_at:'date',brand_saved_at:'date',business_saved_at:'date'},areas:[{label:'Test Area',state:'Kerala',district:'Test District',pin:'673001'}],members:{active:1},history:[],activity:[]};
 const context={window:{addEventListener(){}},location:{hash:'#/platform'},document:{addEventListener(){}},Account:{session:{platformPermissions:permissions},feedback:()=>'',field:()=>'',resource:(p,url,draw)=>draw(p==='/platform'?{companies:[data.company],total:1,page:1,pageSize:20}:data)},Marketplace:{page:()=>null},Workspace:{presets:{}},escapeHTML:x=>String(x??'').replaceAll('<','&lt;'),URLSearchParams,locale:'en',link:(p,label)=>'<a href="#'+p+'">'+label+'</a>',icon:()=>'',status:x=>'<span>'+x+'</span>',heading:(a,b,c)=>'<h1>'+b+'</h1><p>'+c+'</p>'};
 vm.runInNewContext(fs.readFileSync('src/organization.js','utf8'),context);const ui=context.window.Organization;
 const dashboard=ui.page('/platform');for(const queue of Object.keys(reviewQueues))assert.ok(dashboard.includes('queue='+queue));assert.match(dashboard,/<th>Publication<\/th>/);
 context.location.hash='#/platform/company?id='+id;const detail=ui.page('/platform/company');for(const label of ['[TEST] Legal','[TEST] Public','Application submitted','673001','Request company corrections'])assert.ok(detail.includes(label));assert.match(detail,/<select name="action" required>/);assert.match(detail,/<option value="" selected disabled>Choose a decision/);
 assert.ok(!detail.includes('value="publish"'));data.company={...data.company,lifecycle:'active'};const listing=ui.page('/platform/company');assert.ok(listing.includes('value="approve_marketplace"'));assert.ok(listing.includes('value="return_marketplace"'));assert.ok(!listing.includes('value="approve"'));
});
test('checked-in public visibility view retains activation, review, publication and free policy gates (static only)',()=>{
 const sql=fs.readFileSync('server/db/migrations/008_commercial.sql','utf8');for(const text of ["c.status='active'","c.lifecycle='active'","c.marketplace_status='approved'",'c.storefront_published',"commercial_public_allowed(c.id,'storefront')","r.new_state='approved'"])assert.ok(sql.includes(text));
 const free=fs.readFileSync('server/db/migrations/042_business_trial_billing.sql','utf8');assert.match(free,/feature='storefront'.*company_os_enrolment.*THEN true/);
});

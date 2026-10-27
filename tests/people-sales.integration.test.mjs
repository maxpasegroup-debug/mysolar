import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';

test('company people and sales controls enforce profiles, hierarchy, pipeline and exact quotation approvals',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,client,companyA,companyB,enquiryId,quote,stranger}=await connectedFixture(t);
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;},root='/companies/current',ops=root+'/operations';
 const seller=stranger,reviewer=client();await reviewer.register('phase2-reviewer');
 const controls=()=>a.request(root+'/controls').then(ok),why='[TEST] explicit owner configuration';
 const initial=await controls(),sales=initial.bases.sales;
 const profileBody=(name,permissions)=>({id:'',revision:1,name,baseRole:'sales',permissions,discountLimitBps:500,active:true,reason:why});
 const sellerProfile=ok(await a.request(root+'/controls/profiles','POST',profileBody('[TEST] Sales',sales.filter(p=>p!=='quotations.approve')))).id;
 let reviewerBody=profileBody('[TEST] Reviewer',['workspace.read','company.read','quotations.read','quotations.approve']);
 const reviewerProfile=ok(await a.request(root+'/controls/profiles','POST',reviewerBody)).id;
 for(const [person,profileId] of [[seller,sellerProfile],[reviewer,reviewerProfile]]){ok(await a.request(root+'/members','POST',{email:person.user.email,role:'sales',profileId}),201);ok(await person.request('/companies/select','POST',{companyId:companyA}));await person.session();}
 const memberId=async person=>(await db.query('SELECT id,people_revision FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,person.user.id])).rows[0];
 const savePerson=async(person,values={})=>{const m=await memberId(person);return a.request(root+'/controls/people/'+m.id,'POST',{revision:m.people_revision,teamId:'',managerId:'',profileId:person===seller?sellerProfile:reviewerProfile,reason:why,...values});};
 await t.test('profiles narrow server and session permissions, reject escalation and stay within company',async()=>{
  assert.ok(reviewer.user);const session=ok(await reviewer.session());assert.ok(session.permissions.includes('quotations.approve'));assert.ok(!session.permissions.includes('quotations.manage'));assert.equal((await reviewer.request(root+'/quotations/'+initial.id+'/review','POST',{})).status,400);
  assert.equal((await reviewer.request(root+'/controls')).status,403);assert.equal((await reviewer.request(root+'/controls/profiles','POST',profileBody('No',['platform.audit.read']))).status,403);
  assert.equal((await a.request(root+'/controls/profiles','POST',profileBody('No',['platform.audit.read']))).status,400);
  assert.equal((await b.request(root+'/members','POST',{email:seller.user.email,role:'sales',profileId:sellerProfile})).status,400);
  assert.equal((await seller.request(ops+'/list/invoices')).status,403);
 });
 let team;
 await t.test('team and manager assignments reject cross-company references, cycles and stale edits',async()=>{
  const owner=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,a.user.id])).rows[0].id;
  team=ok(await a.request(root+'/controls/teams','POST',{id:'',revision:1,name:'[TEST] Sales team',managerId:owner,active:true,reason:why})).id;
  ok(await savePerson(seller,{teamId:team,managerId:(await memberId(reviewer)).id}));
  assert.equal((await savePerson(reviewer,{managerId:(await memberId(seller)).id})).status,409);
  const foreign=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1',[companyB])).rows[0].id;
  assert.equal((await savePerson(seller,{managerId:foreign})).status,400);
  await db.query("UPDATE users SET status='disabled' WHERE id=$1",[reviewer.user.id]);try{assert.equal((await savePerson(seller,{managerId:(await memberId(reviewer)).id})).status,400);}finally{await db.query("UPDATE users SET status='active' WHERE id=$1",[reviewer.user.id]);}
  const stale=await memberId(seller);ok(await savePerson(seller,{teamId:team}));assert.equal((await a.request(root+'/controls/people/'+stale.id,'POST',{revision:stale.people_revision,teamId:team,managerId:'',profileId:sellerProfile,reason:why})).status,409);
 });
 const policyPayload=(p,changes={})=>({revision:p.revision,requireReview:p.require_review,discountLimitBps:p.discount_limit_bps,qualificationRequired:p.qualification_required,pipeline:p.pipeline,reason:why,...changes});
 let lead,contact;
 await t.test('custom stages preserve canonical sales milestones and require saved qualification',async()=>{
  const p=(await controls()).policy,pipeline=structuredClone(p.pipeline);pipeline[0].next=['site_visit','lost'];pipeline.splice(1,0,{code:'site_visit',label:'Site visit booked',category:'contacted',next:['contacted','lost']});
  ok(await a.request(root+'/controls/policy','POST',policyPayload(p,{pipeline,qualificationRequired:true,requireReview:true,discountLimitBps:500})));
  lead=ok(await a.request(ops+'/leads','POST',{operationKey:randomUUID(),enquiryId,contactId:null,title:'[TEST] Qualified solar lead',source:'',interest:'',location:'[TEST] site',assigneeId:seller.user.id,priority:'normal',nextAction:'[TEST] arrange visit',followUp:null}),201).id;
  const update=async(stage,notes='')=>{const r=(await db.query('SELECT revision FROM crm_leads WHERE id=$1',[lead])).rows[0].revision;return a.request(ops+'/leads/'+lead+'/update','POST',{revision:r,stage,priority:'normal',assigneeId:seller.user.id,nextAction:'[TEST] next',followUp:null,notes});};
  assert.equal((await update('qualified')).status,409);ok(await update('site_visit'));ok(await update('contacted'));assert.equal((await update('qualified')).status,409);
  let r=ok(await a.request(ops+'/record/leads/'+lead)).record;contact=r.contact_id;
  ok(await a.request(ops+'/leads/'+lead+'/qualification','POST',{revision:r.revision,qualification:{requirement:'[TEST] rooftop solar',siteAddress:'[TEST] site address',capacity:'Unconfirmed',budget:'Unconfirmed',timeframe:'',notes:''},lostReason:''}));ok(await update('qualified'));
  assert.equal(ok(await a.request(ops+'/list/leads?status=qualified')).total,1);
  assert.equal((await update('lost')).status,409);ok(await update('lost','[TEST] customer postponed'));assert.equal(ok(await a.request(ops+'/record/leads/'+lead)).record.lost_reason,'[TEST] customer postponed');
  const policy=(await controls()).policy,bad=structuredClone(policy.pipeline);bad.splice(bad.findIndex(x=>x.code==='site_visit'),1);assert.equal((await a.request(root+'/controls/policy','POST',policyPayload(policy,{pipeline:bad}))).status,400);ok(await update('new'));
 });
 await t.test('customer search and duplicate review handle phone, email and address without cross-tenant matches',async()=>{
  ok(await a.request(ops+'/contacts/'+contact+'/update','POST',{revision:1,kind:'individual',name:'[TEST] Athira fixture',email:'phase2-contact@example.invalid',phone:'+918123456789',billingAddress:'[TEST] billing',serviceAddress:'[TEST] Rural village'}));
  for(const search of ['8123456789','phase2-contact@','Rural village'])assert.equal(ok(await a.request(ops+'/list/contacts?search='+encodeURIComponent(search))).items[0].id,contact);
  const matches=ok(await a.request(ops+'/contacts/duplicates?phone=8123456789'));assert.equal(matches.items[0].id,contact);assert.equal(ok(await b.request(ops+'/contacts/duplicates?phone=8123456789')).items.length,0);
  assert.equal((await a.request(ops+'/contacts','POST',{operationKey:randomUUID(),kind:'individual',name:'[TEST] duplicate',email:'',phone:'8123456789',billingAddress:'',serviceAddress:''})).status,409);
 });
 let draft;
 const current=async()=>ok(await a.request(root+'/quotations/'+draft)).quote;
 const review=async(person,action)=>person.request(root+'/quotations/'+draft+'/review','POST',{revision:(await current()).revision,action,reason:'[TEST] explicit review of saved terms'});
 const send=async()=>a.request(root+'/quotations/'+draft+'/actions','POST',{revision:(await current()).revision,action:'send'});
 await t.test('direct sending and unauthorised or self approval cannot bypass review',async()=>{
  const previousId=ok(await a.request(root+'/quotations')).items[0].id,previous=ok(await a.request(root+'/quotations/'+previousId)).quote;draft=ok(await a.request(root+'/enquiries/'+enquiryId+'/quotations','POST',{...quote(previous.revision),reference:'TEST-PHASE2-REVIEW'}),201).id;
  assert.equal((await send()).status,409);assert.equal((await reviewer.request(root+'/quotations/'+draft+'/review','POST',{revision:1,action:'approve',reason:why})).status,409);ok(await review(a,'submit'));assert.equal((await review(a,'approve')).status,409);assert.equal((await review(seller,'approve')).status,403);assert.equal((await review(b,'approve')).status,404);ok(await review(reviewer,'approve'));
 });
 await t.test('editing content, policy changes and reviewer revocation invalidate permission to send',async()=>{
  let q=await current();ok(await a.request(root+'/quotations/'+draft,'PUT',{...quote(q.revision),reference:'TEST-PHASE2-REVIEW',items:quote(1).items.map(x=>({...x,discount:'10'}))}));assert.equal((await send()).status,409);
  ok(await review(a,'submit'));ok(await review(reviewer,'approve'));let p=(await controls()).policy;ok(await a.request(root+'/controls/policy','POST',policyPayload(p)));assert.equal((await send()).status,409);
  ok(await review(a,'submit'));ok(await review(reviewer,'approve'));reviewerBody={...reviewerBody,id:reviewerProfile,revision:1,active:false};ok(await a.request(root+'/controls/profiles','POST',reviewerBody));assert.equal((await send()).status,409);assert.equal(ok(await reviewer.session()).permissions.includes('quotations.approve'),false);
  reviewerBody={...reviewerBody,revision:2,active:true};ok(await a.request(root+'/controls/profiles','POST',reviewerBody));ok(await review(a,'submit'));ok(await review(reviewer,'approve'));ok(await send());assert.equal((await customer.request('/customer/quotations/'+draft)).status,200);
 });
 await t.test('discount limits apply even when general review is disabled; owner exceptions are explicit and audited',async()=>{
  const p=(await controls()).policy;ok(await a.request(root+'/controls/policy','POST',policyPayload(p,{requireReview:false,discountLimitBps:500})));
  const old=await current();draft=ok(await a.request(root+'/enquiries/'+enquiryId+'/quotations','POST',{...quote(old.revision),reference:'TEST-PHASE2-DISCOUNT',items:quote(1).items.map(x=>({...x,discount:'20'}))}),201).id;
  assert.equal((await send()).status,409);ok(await review(a,'submit'));assert.equal((await review(reviewer,'override')).status,403);ok(await review(a,'override'));ok(await send());const q=await current();assert.equal(q.approval_override,true);assert.ok((await db.query("SELECT 1 FROM audit_events WHERE company_id=$1 AND action='quotation.review_override'",[companyA])).rowCount);assert.equal((await a.request(root+'/quotations/'+draft+'/review','POST',{revision:q.revision,action:'submit',reason:why})).status,409);
  await assert.rejects(db.query('DELETE FROM quotation_review_events WHERE company_id=$1',[companyA]),/immutable/);
 });
 await t.test('profile-restricted employees cannot be assigned work they may not perform, and CSRF remains required',async()=>{
  assert.equal((await a.request(ops+'/leads/'+lead+'/update','POST',{revision:ok(await a.request(ops+'/record/leads/'+lead)).record.revision,stage:'lost',priority:'normal',assigneeId:reviewer.user.id,nextAction:'',followUp:null,notes:''})).status,400);
  const p=(await controls()).policy;assert.equal((await a.request(root+'/controls/policy','POST',policyPayload(p),{'X-CSRF-Token':''})).status,403);
 });
 await t.test('authorised sales can hand an approved quotation to an order without gaining confirmation rights or exposing private review data',async()=>{
  const quoteData=ok(await customer.request('/customer/quotations/'+draft)).quote;assert.equal(quoteData.reviewer_id,undefined);assert.equal(quoteData.review_status,undefined);
  const order=ok(await seller.request(ops+'/orders','POST',{operationKey:randomUUID(),quotationId:draft,reference:'TEST-PHASE2-ORDER',billingAddress:'[TEST] billing',serviceAddress:'[TEST] site',expectedDate:null,ownerId:seller.user.id,acceptanceMode:'in_app'}),201).id;
  ok(await seller.request(ops+'/orders/'+order+'/actions','POST',{revision:1,action:'request_confirmation',reference:'',notes:'[TEST] customer review requested'}));
  const own=ok(await customer.request('/customer/operations/record/orders/'+order)).record;assert.equal(own.terms.quote.reviewer_id,undefined);assert.equal(own.terms.quote.approval_override,undefined);
  ok(await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true}));assert.equal((await seller.request(ops+'/orders/'+order+'/actions','POST',{revision:3,action:'confirm',reference:'[TEST]',notes:why})).status,403);ok(await a.request(ops+'/orders/'+order+'/actions','POST',{revision:3,action:'confirm',reference:'[TEST]',notes:why}));
 });
 await t.test('invitation profiles apply atomically and an inactive profile cannot fall back to broad access',async()=>{
  const body=profileBody('[TEST] Invited reader',['workspace.read','company.read','customers.read']);const id=ok(await a.request(root+'/controls/profiles','POST',body)).id;
  const invitation=ok(await a.request(root+'/invitations','POST',{email:b.user.email,role:'sales',delivery:'share',profileId:id}),201),url=new URL(invitation.shareUrl),token=new URLSearchParams(url.hash.split('?')[1]).get('token');assert.ok(token);
  ok(await a.request(root+'/controls/profiles','POST',{...body,id,revision:1,active:false}));assert.equal((await b.request('/invitations/accept','POST',{token})).status,400);assert.equal((await db.query('SELECT 1 FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,b.user.id])).rowCount,0);
  ok(await a.request(root+'/controls/profiles','POST',{...body,id,revision:2,active:true}));ok(await b.request('/invitations/accept','POST',{token}));const session=ok(await b.session());assert.ok(session.permissions.includes('customers.read'));assert.ok(!session.permissions.includes('crm.manage'));assert.equal((await b.request('/invitations/accept','POST',{token})).status,400);
 });
 await t.test('access revocation remains possible without writable entitlements while access expansion is blocked',async()=>{
  await db.query("INSERT INTO commercial_settings_versions(data,effective_at,created_by,reason) SELECT jsonb_set(data,'{mode}','\"controlled\"'),now(),$1,'[TEST] controlled access without a subscription' FROM commercial_settings_versions ORDER BY effective_at DESC,id DESC LIMIT 1",[a.user.id]);
  ok(await a.request(root+'/controls/profiles','POST',{...reviewerBody,revision:3,active:false}));assert.equal((await a.request(root+'/controls/profiles','POST',{...reviewerBody,revision:4,active:true})).status,403);assert.equal((await a.request(root+'/controls')).status,200);
 });
});

// Explicitly injected staging credentials only. No .env loading or default production target.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {features,limitNames} from '../server/commercial/policy.js';

export async function stagingAcceptance({origin,authorization,grantOperator,fixtureSuffix=null,fixturePassword=null,operatorExists=false}){
 if(origin!=='https://mysolar-staging.up.railway.app'||!authorization||!grantOperator)throw Error('Explicit approved staging target and access required');
 const checks=[],suffix=fixtureSuffix||randomBytes(5).toString('hex'),password=fixturePassword||randomBytes(24).toString('hex')+'Aa1!';
 const check=(name,ok)=>{checks.push({name,passed:!!ok});console.log((ok?'PASS ':'FAIL ')+name);assert.ok(ok,name);};
 const raw=(path,options={})=>fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});
 const expect=(name,result,status)=>{if(result.status!==status)console.log(JSON.stringify({check:name,expected:status,actual:result.status,errorCode:result.data?.error?.code,message:result.data?.error?.message}));check(name,result.status===status);return result;};
 const client=label=>({label,email:'phase11-'+suffix+'-'+label+'@example.invalid',cookie:'',csrf:'',user:null,company:null,
  async request(path,method='GET',body,extra={}){const response=await raw('/api'+path,{method,headers:{Authorization:authorization,Cookie:this.cookie,...(this.user&&path!=='/auth/session'?{'X-Account-ID':this.user.id}:{}),...(path.startsWith('/companies/current')?{'X-Company-ID':this.company?.id||''}:{}),...(!['GET','HEAD'].includes(method)?{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':this.csrf}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const cookie=response.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];const data=await response.json();if(path==='/auth/session'&&response.ok){this.csrf=data.csrfToken;this.user=data.user;this.company=data.activeCompany;}return {status:response.status,data,headers:response.headers};},
  async session(){return this.request('/auth/session');},
  async login(){await this.session();expect(this.label+' login',await this.request('/auth/login','POST',{email:this.email,password}),200);await this.session();},
  async register(){const session=await this.session();check(this.label+' secure session cookie',session.headers.get('set-cookie')?.includes('__Host-mysolar_session=')&&session.headers.get('set-cookie')?.includes('HttpOnly')&&session.headers.get('set-cookie')?.includes('Secure'));expect(this.label+' signup',await this.request('/auth/register','POST',{name:'[FICTIONAL STAGING] '+this.label,email:this.email,password}),201);await this.session();}
 });
 const a=client('owner-a'),b=client('owner-b'),customer=client('customer'),staff=client('staff'),operator=client('operator');
 try{
  expect('public liveness',await raw('/healthz'),200);expect('public readiness',await raw('/readyz'),200);
  expect('private staging rejects anonymous application access',await raw('/'),401);
  const page=await raw('/',{headers:{Authorization:authorization}});expect('private staging application loads',page,200);check('staging excluded from indexing',page.headers.get('x-robots-tag')?.includes('noindex'));
  for(const path of ['/styles.css','/src/app.js','/assets/app-192.png','/manifest.webmanifest'])expect('public asset '+path,await raw(path,{headers:{Authorization:authorization}}),200);
  for(const path of ['/.env','/.git/config','/server/config.js'])expect('private file denied '+path,await raw(path,{headers:{Authorization:authorization}}),404);
  for(const actor of [a,b,customer,staff])await (fixtureSuffix?actor.login():actor.register());
  expect('missing CSRF rejected',await a.request('/companies','POST',{},{'X-CSRF-Token':''}),403);
  expect('foreign origin rejected',await a.request('/companies','POST',{}, {Origin:'https://untrusted.example.invalid'}),403);
  expect('customer cannot access operator console',await customer.request('/platform/companies'),403);
  await (operatorExists?operator.login():operator.register());await grantOperator(operator.email);await operator.login();
  async function setup(actor){
   if(actor.company){const existing=(await operator.request('/platform/companies/'+actor.company.id)).data;if(existing.company?.lifecycle==='pending_review'){expect(actor.label+' independent audited activation',await operator.request('/platform/companies/'+actor.company.id+'/actions','POST',{revision:existing.company.revision,action:'approve',reason:'Fictional staging acceptance only'}),200);await actor.session();return;}if(existing.company?.lifecycle==='active')return;}
   expect(actor.label+' create company',await actor.request('/companies','POST',{name:'[FICTIONAL STAGING] '+actor.label,city:'Kochi',email:actor.email,phone:''}),201);await actor.session();
   let state=(await actor.request('/companies/current/setup')).data;
   const name='[FICTIONAL STAGING] '+actor.label;
   expect(actor.label+' profile',await actor.request('/companies/current/onboarding/profile','PUT',{revision:state.company.revision,legalName:name,displayName:name,businessType:'distributor',contactPerson:'Fictional rehearsal owner',email:actor.email,phone:'+910000000000',address:'Fictional staging address',state:'Kerala',district:'Kochi',pin:'682001',language:'en',website:''}),200);
   state=(await actor.request('/companies/current/setup')).data;
   expect(actor.label+' brand',await actor.request('/companies/current/branding','PUT',{revision:state.company.revision,publicName:name,logoUrl:'',primary:'#651c2b',secondary:'#202020',accent:'#d7af53',welcome:'Fictional staging only',email:actor.email,phone:'',description:'Fictional company for isolated staging acceptance.',appearance:'warm',requestedDomain:''}),200);
   state=(await actor.request('/companies/current/setup')).data;
   expect(actor.label+' service areas',await actor.request('/companies/current/onboarding/business','PUT',{revision:state.company.revision,services:['solar_panels','maintenance'],rooftop:true,areas:['Kochi'],contactMethod:'email',marketplaceRequested:false}),200);
   state=(await actor.request('/companies/current/setup')).data;
   expect(actor.label+' submit',await actor.request('/companies/current/onboarding/submit','POST',{revision:state.company.revision}),200);
   state=(await operator.request('/platform/companies/'+actor.company.id)).data;
   expect(actor.label+' independent audited activation',await operator.request('/platform/companies/'+actor.company.id+'/actions','POST',{revision:state.company.revision,action:'approve',reason:'Fictional staging acceptance only'}),200);await actor.session();
  }
  await setup(a);await setup(b);
  expect('owner dashboard',await a.request('/companies/current/operations/dashboard'),200);
  expect('customer dashboard',await customer.request('/customer/experience/overview'),200);
  expect('tenant context substitution rejected',await a.request('/companies/current/team','GET',undefined,{'X-Company-ID':b.company.id}),409);
  expect('foreign company selection rejected',await customer.request('/companies/select','POST',{companyId:a.company.id}),403);
  expect('unconfigured recovery safely unavailable',await customer.request('/auth/recover','POST',{email:customer.email}),503);
  expect('ordinary owner cannot access commercial plans',await b.request('/platform/commercial/plans'),403);
  expect('pre-billing cannot invite PRO executive',await a.request('/companies/current/invitations','POST',{email:staff.email,role:'part_time_sales',delivery:'share'}),403);
  const invitation=expect('employee private invitation',await a.request('/companies/current/invitations','POST',{email:staff.email,role:'sales',delivery:'share'}),201);
  const token=new URLSearchParams(new URL(invitation.data.shareUrl).hash.split('?')[1]).get('token');
  expect('wrong employee recipient rejected',await customer.request('/invitations/accept','POST',{token}),400);
  expect('employee accepts invitation',await staff.request('/invitations/accept','POST',{token}),200);await staff.session();check('employee role is sales',staff.company.role==='sales');
  expect('employee invitation replay denied',await staff.request('/invitations/accept','POST',{token}),400);
  expect('employee cannot add staff',await staff.request('/companies/current/invitations','POST',{email:'denied@example.invalid',role:'accounts',delivery:'share'}),403);
  const contact=expect('CRM contact created',await a.request('/companies/current/operations/contacts','POST',{operationKey:randomUUID(),kind:'individual',name:'[FICTIONAL STAGING] Customer',email:customer.email,phone:'',billingAddress:'',serviceAddress:''}),201);
  expect('foreign company contact inaccessible',await b.request('/companies/current/operations/record/contacts/'+contact.data.id),404);
  const record=(await a.request('/companies/current/operations/record/contacts/'+contact.data.id)).data.record;
  const customerInvite=expect('customer access invitation',await a.request('/companies/current/operations/contacts/'+contact.data.id+'/invitations','POST',{revision:record.revision,delivery:'share',confirmCustomerAccess:true}),201);
  const ct=new URLSearchParams(new URL(customerInvite.data.shareUrl).hash.split('?')[1]).get('token');
  expect('customer explicit acceptance required',await customer.request('/invitations/customer/accept','POST',{token:ct,confirmAccess:false}),400);
  expect('customer dashboard connection accepted',await customer.request('/invitations/customer/accept','POST',{token:ct,confirmAccess:true}),200);
  const terms={name:'[FICTIONAL STAGING] PRO',description:'Staging fixture only; no purchase or payment',price:'5999',currency:'INR',taxMode:'exclusive',taxRate:'18',interval:'monthly',trialDays:7,effectiveFrom:new Date(Date.now()-86400000).toISOString(),effectiveTo:null,features:Object.fromEntries(Object.keys(features).map(k=>[k,k!=='custom_domain'])),limits:Object.fromEntries(Object.keys(limitNames).map(k=>[k,k==='team'?10:0])),support:''};
  const plan=expect('draft PRO fixture plan',await operator.request('/platform/commercial/plans','POST',{code:'pro',terms,reason:'Fictional staging fixture; no payment'}),201);
  expect('explicit fixture plan publication',await operator.request('/platform/commercial/plans/'+plan.data.id+'/state','POST',{revision:1,status:'active',reason:'Fictional staging acceptance'}),200);
  const subscriptions={};
  for(const actor of [a,b]){const subscription=expect(actor.label+' manual fixture subscription',await operator.request('/platform/commercial/companies/'+actor.company.id+'/subscriptions','POST',{revision:0,planId:plan.data.id,status:'active',startAt:new Date(Date.now()-30000).toISOString(),endAt:new Date(Date.now()+86400000).toISOString(),reason:'Fictional staging manual access; no verified payment'}),201);subscriptions[actor.label]=subscription.data.id;}
  const partner=expect('PRO partner invitation',await a.request('/companies/current/partners','POST',{name:'[FICTIONAL STAGING] Partner B',email:b.email}),201);
  const pt=new URLSearchParams(new URL(partner.data.shareUrl).hash.split('?')[1]).get('token');
  expect('partner requires explicit consent',await b.request('/companies/current/partners/accept','POST',{token:pt,confirmAccess:false}),400);
  const race=await Promise.all([1,2].map(()=>b.request('/companies/current/partners/accept','POST',{token:pt,confirmAccess:true})));
  check('concurrent partner acceptance has one success',race.filter(x=>x.status===200).length===1&&race.filter(x=>x.status===400||x.status===409).length===1);
  expect('partner replay denied',await b.request('/companies/current/partners/accept','POST',{token:pt,confirmAccess:true}),400);
  expect('company-domain registration remains unavailable without entitlement',await a.request('/companies/current/domains','POST',{hostname:'fixture.example.invalid',operationKey:randomUUID()}),403);
  const subscription=(await operator.request('/platform/commercial/companies/'+a.company.id)).data.current;
  check('manual access does not imply payment',subscription.activation_source==='manual_administration');
  expect('suspend subscription',await operator.request('/platform/commercial/companies/'+a.company.id+'/subscriptions/'+subscriptions[a.label]+'/actions','POST',{revision:subscription.revision,action:'suspend',endAt:null,reason:'Fictional staging downgrade boundary'}),200);
  expect('suspended subscription preserves dashboard reads',await a.request('/companies/current/operations/dashboard'),200);
  expect('suspended PRO blocks new partner',await a.request('/companies/current/partners','POST',{name:'[FICTIONAL STAGING] Denied',email:'denied@example.invalid'}),403);
  const logout=expect('employee logout',await staff.request('/auth/logout','POST',{}),200);await staff.session();check('logged-out employee has no user',staff.user===null);
  return {checks,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,realEmailDelivery:'NOT_RUN',fixturesOnly:true};
 }finally{
  await writeFile('.verification/phase11-staging-api-results.json',JSON.stringify({checks,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,fixturesOnly:true},null,2)+'\n');
 }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHostname,classifyHostname,requestHostname} from '../server/domains/hostname.js';
import {newChallenge,proofMatches} from '../server/domains/proof.js';
import {hostnameBoundary,resolveHostname} from '../server/domains/resolution.js';
import {UnconfiguredDomainProvider,providerMethods} from '../server/domains/provider.js';

test('domain normalization handles case, one trailing dot and IDNs',()=>{
 assert.equal(normalizeHostname('Solar.Example.COM.'),'solar.example.com');
 assert.equal(normalizeHostname('b\u00fccher.com'),'xn--bcher-kva.com');
 assert.equal(normalizeHostname('xn--bcher-kva.com'),'xn--bcher-kva.com');
});
test('malformed and unsupported hostnames cannot enter the registry',()=>{
 for(const host of ['',' example.com','example.com ','https://example.com','example.com:443','user@example.com','example.com/path','example.com?x','example.com#x','example.com%2f','example.com\\x','example.com..','example..com','-solar.com','solar_.com','127.0.0.1','0x7f000001','localhost','solar.local','solar.test','a'.repeat(64)+'.com','solar\u3002com','*.example.com'])assert.throws(()=>normalizeHostname(host),host);
});
test('platform subdomains are distinguished and infrastructure names reserved',()=>{
 assert.equal(classifyHostname('tenant.mysolar.solutions','mysolar.solutions').kind,'platform_subdomain');
 assert.equal(classifyHostname('www.example.com','mysolar.solutions').kind,'custom');
 assert.equal(classifyHostname('www.example.com','localhost').kind,'custom');
 for(const h of ['mysolar.solutions','www.mysolar.solutions','auth.mysolar.solutions','a.b.mysolar.solutions','project.up.railway.app'])assert.throws(()=>classifyHostname(h,'mysolar.solutions'));
});
const req=(host,extra={})=>({headers:{host,...extra},rawHeaders:['Host',host]});
test('request authority ignores forwarded-host and tenant selectors',()=>{
 assert.equal(requestHostname(req('EXAMPLE.com:443',{'x-forwarded-host':'other.com',forwarded:'host=evil.com','x-company-id':'foreign'})),'example.com');
 for(const host of ['example.com:bad','example.com:','example.com:0443','example.com:444','example.com,evil.com','evil.com@example.com','example.com\u3002'])assert.throws(()=>requestHostname(req(host)));
 assert.throws(()=>requestHostname({...req('example.com'),rawHeaders:['Host','example.com','host','evil.com']}));
 assert.throws(()=>requestHostname(req('127.0.0.1:3000')));
 assert.equal(requestHostname(req('127.0.0.1:3000'),{production:false}),'127.0.0.1');
 assert.equal(requestHostname(req('[::1]:3000'),{production:false}),'[::1]');
 assert.throws(()=>requestHostname(req('0x7f000001:3000'),{production:false}));
});
test('DNS challenges are random, expiring, hashed and assignment-bound',()=>{
 const domain={id:'assignment-a',company_id:'company-a',hostname:'solar.example.com'},challenge=newChallenge(domain,1000),other=newChallenge(domain,1000),stored={...domain,challenge_hash:challenge.hash};
 assert.notEqual(challenge.hash,other.hash);assert.equal(challenge.expires.getTime(),1000+86400000);
 assert.equal(challenge.instructions.name,'_mysolar-verification.solar.example.com');assert.equal(proofMatches(stored,[[challenge.instructions.value]]),true);
 assert.equal(proofMatches(stored,[[challenge.instructions.value.slice(0,15),challenge.instructions.value.slice(15)]]),true);
 for(const altered of [{id:'assignment-b'},{company_id:'company-b'},{hostname:'other.example.com'}])assert.equal(proofMatches({...stored,...altered},[[challenge.instructions.value]]),false);
 assert.equal(proofMatches(stored,[['wrong']]),false);assert.equal(proofMatches(stored,Array(51).fill([challenge.instructions.value])),false);
 assert.ok(!JSON.stringify(stored).includes(challenge.instructions.value));
});
test('unconfigured provider never fabricates resources or readiness',async()=>{
 const provider=new UnconfiguredDomainProvider();assert.equal(provider.configured,false);
 for(const method of providerMethods)await assert.rejects(provider[method](),{code:'DOMAIN_PROVIDER_UNAVAILABLE'});
});
test('resolution is parameterized and requires all activation gates',async()=>{
 let query,values;const db={async query(text,params){query=text;values=params;return {rows:[{id:'domain',company_id:'company',hostname:params[0]}]};}};
 const result=await resolveHostname(db,'SOLAR.example.com.');assert.deepEqual(values,['solar.example.com']);assert.equal(result.context,'public_website');assert.equal(Object.isFrozen(result),true);
 for(const condition of ["d.status='active'","d.verified_at IS NOT NULL","d.certificate_status='active'","d.provider_hostname_status='active'","c.lifecycle='active'"])assert.ok(query.includes(condition));
 assert.equal(await resolveHostname({query:async()=>({rows:[]})},'solar.example.com'),null);
});
function response(){return {code:null,body:'',headers:{},status(code){this.code=code;return this;},set(k,v){this.headers[k]=v;return this;},type(){return this;},send(body){this.body=body;return this;}};}
test('central platform and exact health checks require no registry query',async()=>{
 let calls=0,next=0;const middleware=hostnameBoundary({db:{async query(){calls++;throw Error('No DB allowed');}},origin:'https://mysolar.solutions',production:true});
 await middleware({...req('mysolar.solutions'),method:'GET',path:'/'},response(),()=>next++);
 await middleware({...req('unregistered.example.com'),method:'GET',path:'/healthz'},response(),()=>next++);
 await middleware({...req('unregistered.example.com'),method:'HEAD',path:'/readyz'},response(),()=>next++);
 assert.equal(next,3);assert.equal(calls,0);
});
test('unknown domains cannot fall back to the platform or private APIs',async()=>{
 const middleware=hostnameBoundary({db:{query:async()=>({rows:[]})},origin:'https://mysolar.solutions',production:true});
 for(const path of ['/','/api/auth/session','/api/companies/current','/healthz/extra']){const res=response();let next=false;await middleware({...req('unknown.example.com',{'x-forwarded-host':'mysolar.solutions'}),method:'GET',path},res,()=>next=true);assert.equal(res.code,404);assert.equal(next,false);assert.equal(res.headers['Cache-Control'],'no-store');}
});
test('active domains cannot expose legacy single-origin authentication',async()=>{
 const middleware=hostnameBoundary({db:{query:async()=>({rows:[{id:'domain',company_id:'company'}]})},origin:'https://mysolar.solutions',production:true});
 const res=response();let next=false;await middleware({...req('solar.example.com'),method:'POST',path:'/api/auth/login'},res,()=>next=true);assert.equal(res.code,503);assert.equal(next,false);
});

test('registry rejects expired proof and activation; removal replays safely without storing a challenge',async()=>{
 const {unitEnvironment}=await import('./helpers/env.mjs');unitEnvironment();
 const service=await import('../server/domains/service.js'),{pool}=await import('../server/db/pool.js');
 try{
  const id='10000000-0000-4000-8000-000000000001',ctx={userId:'20000000-0000-4000-8000-000000000001',companyId:'30000000-0000-4000-8000-000000000001'};
  const input={operationKey:'40000000-0000-4000-8000-000000000001',revision:1,reason:'Local unit removal confirmation'};
  let row={id,company_id:ctx.companyId,hostname:'solar.example.com',status:'pending',revision:1,is_primary:false,challenge_hash:'a'.repeat(64),challenge_expires_at:new Date(0)},stored=null,mutations=0;
  const db={async query(sql,args){
   if(sql.startsWith('SELECT id,domain_id,fingerprint'))return {rows:stored?[{...stored}]:[]};
   if(sql.startsWith('SELECT * FROM company_domains')){assert.equal(args[1],ctx.companyId);return {rows:[{...row}]};}
   if(sql.startsWith('UPDATE company_domains SET status=$1')){mutations++;row={...row,status:args[0],is_primary:false,challenge_hash:null,revision:row.revision+1};return {rows:[]};}
   if(sql.startsWith('INSERT INTO domain_operations')){stored={id:args[0],domain_id:args[2],fingerprint:args[4],action:args[5],status:args[7],last_error_code:args[8]};return {rows:[]};}
   if(sql.startsWith('INSERT INTO audit_events')){const metadata=JSON.parse(args[4]);assert.equal(metadata.previous.status,'pending');assert.equal(metadata.current.status,'removed');assert.ok(!JSON.stringify(metadata).includes('a'.repeat(64)));return {rows:[]};}
   throw Error('Unexpected unit query');
  }};
  await assert.rejects(service.verifyDomain(db,ctx,id,input,{records:[],challengeHash:row.challenge_hash}),{code:'DOMAIN_CHANGED'});
  assert.equal(mutations,0);
  await assert.rejects(service.changeDomain(db,ctx,id,'activate',input),{code:'DOMAIN_ACTIVATION_UNAVAILABLE'});
  const removed=await service.changeDomain(db,ctx,id,'remove',input);assert.equal(removed.domain.status,'removed');assert.equal(mutations,1);
  const repeated=await service.changeDomain(db,ctx,id,'remove',{reason:input.reason,revision:1,operationKey:input.operationKey});assert.equal(repeated.replayed,true);assert.equal(mutations,1);
  await assert.rejects(service.changeDomain(db,ctx,id,'remove',{...input,reason:'Different operation details'}),{code:'DOMAIN_CHANGED'});
  assert.equal(service.publicDomain(row).challenge_hash,undefined);
 }finally{await pool.end();}
});

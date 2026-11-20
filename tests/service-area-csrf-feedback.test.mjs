import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup({differentCompany=false}={}) {
  let sessions=0,renders=0;
  const form={};
  const document={addEventListener(){},querySelector(selector){return ['#market-areas','main form,[data-onboarding-form]'].includes(selector)?form:null;}};
  const session=company=>({user:{id:'owner',accountType:'business'},activeCompany:{id:company,lifecycle:'active'},permissions:['service_areas.manage'],customerPermissions:[],platformPermissions:[],companies:[],csrfToken:'new-token'});
  const fetch=async(url,options)=>{
    if(url==='/api/auth/session'){sessions++;return {ok:true,json:async()=>session(differentCompany&&sessions>1?'other-company':'company')};}
    assert.equal(url,'/api/companies/current/service-areas');assert.equal(options.method,'PUT');
    return {ok:false,status:403,json:async()=>({error:{code:'CSRF_REJECTED',message:'Refresh your security session before continuing.'}})};
  };
  const window={addEventListener(){}};
  const context={window,document,fetch,AbortController,setTimeout,clearTimeout,URLSearchParams,location:{hash:'#/distributor/service-areas',protocol:'https:'},render(){renders++;}};
  vm.runInNewContext(readFileSync(new URL('../src/account.js',import.meta.url),'utf8'),context);
  return {account:window.Account,get renders(){return renders;},get sessions(){return sessions;}};
}

test('a rejected CSRF token refreshes the session without erasing the service-area form',async()=>{
 const env=setup();await env.account.init();const initialRenders=env.renders;
 await assert.rejects(env.account.api('/companies/current/service-areas','PUT',{}),/Refresh your security session/);
 await env.account.refresh({preserveForm:true});
 assert.ok(env.sessions>=2);assert.equal(env.renders,initialRenders);
});

test('a changed active company still forces a redraw after CSRF rejection',async()=>{
 const env=setup({differentCompany:true});await env.account.init();const initialRenders=env.renders;
 await assert.rejects(env.account.api('/companies/current/service-areas','PUT',{}),/Refresh your security session/);
 await env.account.refresh({preserveForm:true});
 assert.ok(env.renders>initialRenders);assert.equal(env.account.activeCompany.id,'other-company');
});

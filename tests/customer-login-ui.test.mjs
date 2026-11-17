import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function setup(hash='#/customer/login',available=true){
 const ctx={location:{hash,search:''},URLSearchParams,escapeHTML:String,window:{},document:{addEventListener(){}},Journey:{authPath:p=>p},link:(path,label)=>`<a href="#${path}">${label}</a>`,Account:{session:{pinAvailable:available,pinEmailAvailable:available},form:(id,content,label)=>`<form id="${id}">${content}<button type="submit">${label}</button></form>`,field:(label,name)=>`<label>${label}<input name="${name}"></label>`,feedback:()=>''}};
 vm.runInNewContext(readFileSync(new URL('../src/mobile-auth.js',import.meta.url),'utf8'),ctx);return {ctx,ui:ctx.window.MobileAuth};
}
test('customer route ignores stale email selection and has only mobile/PIN sign-in',()=>{
 for(const hash of ['#/customer/login','#/customer/login?email=1','#/customer/dashboard']){
  const {ui}=setup(hash);ui.useEmail();assert.equal(ui.emailMode(),false);const html=ui.login({customer:true});
  for(const field of ['countryCode','mobile','pin'])assert.match(html,new RegExp('name="'+field+'"'));
  assert.doesNotMatch(html,/name="(?:email|password|accountType)"|data-auth-mode/);assert.match(html,/method=pin/);assert.match(html,/data-customer-start/);
 }
});
test('customer PIN recovery is route-specific and cannot switch to password mode',()=>{
 const {ui}=setup('#/recover?method=pin');ui.useEmail();assert.equal(ui.emailMode(),false);assert.doesNotMatch(ui.recovery(),/data-auth-mode|name="password"|name="accountType"/);
});
test('missing PIN configuration fails closed without presenting customer password fallback',()=>{
 const {ui}=setup('#/customer/login',false),html=ui.login({customer:true});assert.match(html,/temporarily unavailable/);assert.match(html,/type="submit" disabled/);assert.doesNotMatch(html,/name="email"|name="password"|name="accountType"/);
});
test('Business email/mobile selection is preserved',()=>{
 const {ui}=setup('#/distributor/login');ui.useEmail();assert.equal(ui.emailMode(),true);assert.match(ui.switchButton(),/data-auth-mode="mobile"/);ui.useMobile();assert.equal(ui.emailMode(),false);
});

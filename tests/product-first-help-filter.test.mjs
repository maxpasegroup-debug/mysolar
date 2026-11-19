import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/purchase.js',import.meta.url),'utf8');

function enquiry(guided='home'){
 const listeners=[];
 const account={
  user:{id:'customer-test',name:'Test Customer',email:'customer@example.invalid'},
  session:{permissions:[]},
  resource(_path,_url,render){return render({product:null,vendor:null,discoverableProducts:[],categories:[],profile:null,submissionKey:'fixture-only'});},
  field:(label,name,type,value,extra)=>`<label>${label}<input type="${type}" name="${name}" value="${value}" ${extra}></label>`,
  feedback:()=>'',
 };
 const context={
  window:{addEventListener(){}},
  document:{addEventListener:(name,handler)=>listeners.push([name,handler])},
  location:{hash:`#/customer/enquiry/new?guided=${guided}`},
  URLSearchParams,
  Account:account,
  CompanyLocation:{enquiryFields:()=>'<input name="state"><input name="district">',localityField:()=>'<input name="locality">'},
  escapeHTML:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
  heading:(_eyebrow,title,description)=>`<h1>${title}</h1><p>${description}</p>`,
  link:(url,label)=>`<a href="#${url}">${label}</a>`,
  icon:()=>'',
  status:()=>'',
 };
 vm.runInNewContext(source,context);
 return context.window.Purchase.page('/customer/enquiry/new');
}

test('Help me choose starts without an implicit service eligibility filter',()=>{
 const html=enquiry('home');
 assert.match(html,/name="helpMeChoose" value="true"/);
 assert.match(html,/name="service"><option value="" selected>No additional service requirement<\/option>/);
 assert.match(html,/name="projectType"><option value="rooftop_home" selected>/);
 assert.doesNotMatch(html,/name="service"><option value="energy_consultation" selected>/);
});

test('generic Help me choose uses advice intent and leaves service optional',()=>{
 const html=enquiry('1');
 assert.match(html,/name="helpMeChoose" value="true"/);
 assert.match(html,/name="service"><option value="" selected>No additional service requirement<\/option>/);
 assert.match(html,/name="projectType">[\s\S]*?<option value="advice" selected>/);
});

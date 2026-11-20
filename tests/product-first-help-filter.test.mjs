import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/purchase.js',import.meta.url),'utf8');

function enquiry(guided='home',companyId='',extra=''){
 const listeners=[];
 const account={
  user:{id:'customer-test',name:'Test Customer',email:'customer@example.invalid'},
  session:{permissions:[]},
  resource(_path,url,render){const company=new URLSearchParams(url.split('?')[1]||'').get('companyId');return render({product:null,vendor:company?{id:company,name:'[TEST] Selected distributor'}:null,discoverableProducts:[],categories:[],profile:null,submissionKey:'fixture-only'});},
  field:(label,name,type,value,extra)=>`<label>${label}<input type="${type}" name="${name}" value="${value}" ${extra}></label>`,
  feedback:()=>'',
 };
 const context={
  window:{addEventListener(){}},
  document:{addEventListener:(name,handler)=>listeners.push([name,handler])},
  location:{hash:`#/customer/enquiry/new?guided=${guided}${companyId?'&companyId='+companyId:''}${extra?'&'+extra:''}`},
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

test('district discovery requires no PIN or reviewed-locality selection',()=>{
 const html=enquiry('home');
 assert.match(html,/name="state"/);assert.match(html,/name="district"/);
 assert.match(html,/PIN code \(optional\)/);assert.match(html,/name="pin"[^>]*pattern="\[1-9\]\[0-9\]\{5\}"/);
 assert.doesNotMatch(html,/name="pin"[^>]*required/);assert.doesNotMatch(html,/Reviewed installation locality/);
 assert.match(html,/Only companies that have been approved to serve the entire selected district/);
});

test('installation locality is a visible optional text field and survives profile navigation',()=>{
 const html=enquiry('home','','locality=Payyanur');
 const locationSection=html.match(/<fieldset><legend>2\. Confirm the installation location \*<\/legend>([\s\S]*?)<\/fieldset>/)?.[1];
 assert.ok(locationSection,'the location section is present');
 assert.match(locationSection,/<label>Installation locality · optional<input type="text" name="locality" value="Payyanur"[^>]*><\/label>/);
 assert.doesNotMatch(locationSection,/<(?:select|datalist)[^>]*name="locality"/);
 assert.doesNotMatch(locationSection,/name="locality"[^>]*\brequired\b/);
 assert.equal((html.match(/name="locality"/g)||[]).length,1);
 assert.match(locationSection,/locality is shared as installation information and does not change eligibility/);
});

test('company profile context reaches the direct-recipient quotation form',()=>{
 const id='821518ce-91b6-4aa5-a7ff-7ca5bb751c90',html=enquiry('1',id);
 assert.match(html,/Requesting a quotation from <strong>\[TEST\] Selected distributor<\/strong>/);
 assert.match(html,new RegExp(`name="targetCompanyId" value="${id}"`));
 assert.match(html,/name="mode"><option value="direct" selected>This distributor only<\/option>/);
});

test('the request restores recognized service and project choices after profile navigation',()=>{
 const html=enquiry('home','','service=maintenance&projectType=commercial');
 assert.match(html,/<option value="maintenance" selected>Maintenance<\/option>/);
 assert.match(html,/<option value="commercial" selected>My business or organization<\/option>/);
 const invalid=enquiry('home','','service=unknown&projectType=unknown');
 assert.match(invalid,/name="service"><option value="" selected>/);
 assert.match(invalid,/<option value="rooftop_home" selected>My home<\/option>/);
});

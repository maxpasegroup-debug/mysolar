import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
 const listeners={},data={requestedItem:'Solar advice',title:'Advice',categoryId:'',productId:'',offerId:'',projectType:'rooftop_home',state:'Kerala',district:'Kannur',pin:'670307',locality:'Payyanur',mode:'direct',service:'energy_consultation',address:'',quantity:'',unit:'',requirements:'',timeframe:'',contactMethod:'in_app',submissionKey:'fixture'};
 const send={disabled:true},recipient={},recipients={innerHTML:'',textContent:''},review={innerHTML:''};let pending;
 const form={id:'purchase-enquiry',dataset:{user:'customer',customerName:'Test'},isConnected:true,elements:{targetCompanyId:{value:'company'}},matches:selector=>selector==='.purchase-form',querySelector:selector=>selector.includes('data-operation')?send:selector.includes('recipient')?recipient:null};
 const account={user:{id:'customer'},api:async()=>({total:1,items:[{id:'company',name:'Fixture Solar',city:'Town',service_areas:['PIN']}],pageSize:20}),run:fn=>{pending=fn();return pending;},setMessage(){}};
 const ctx={Account:account,window:{addEventListener(){}},document:{addEventListener:(event,fn)=>(listeners[event]??=[]).push(fn),getElementById:id=>id==='purchase-selected'?review:recipients,querySelectorAll:()=>[]},location:{hash:'#/customer/enquiry/new?companyId=company'},URLSearchParams,escapeHTML:String,FormData:class{[Symbol.iterator](){return Object.entries(data)[Symbol.iterator]();}}};
 vm.runInNewContext(readFileSync(new URL('../src/purchase.js',import.meta.url),'utf8'),ctx);
 const match=async()=>{listeners.submit[0]({target:form,preventDefault(){},submitter:{dataset:{operation:'match'}}});await pending;};
 const edit=(key,value)=>{data[key]=value;for(const fn of listeners.input)fn({target:{name:key,closest:()=>form}});};
 return {account,send,recipient,recipients,review,match,edit};
}
test('optional installation details preserve the reviewed district recipient',async()=>{
 const ui=setup();await ui.match();assert.equal(ui.send.disabled,false);assert.equal(ui.recipient.checked,true);
 for(const [key,value] of Object.entries({requirements:'Roof details',address:'Fictional street',pin:'123456',locality:'Different locality',contactMethod:'email',timeframe:'Next month',quantity:'2',unit:'unit',requestedItem:'Solar consultation'})){ui.edit(key,value);assert.equal(ui.send.disabled,false,key);}
 assert.match(ui.review.innerHTML,/Fixture Solar/);assert.match(ui.review.innerHTML,/Roof details/);
});
test('district and service edits require a fresh recipient review',async()=>{
 for(const [key,value] of Object.entries({state:'Tamil Nadu',district:'Ernakulam',categoryId:'other-category',service:'maintenance',mode:'matching'})){
  const ui=setup();await ui.match();ui.edit(key,value);assert.equal(ui.send.disabled,true,key);assert.match(ui.recipients.textContent,/Find eligible distributors/);
 }
});
test('a delayed match response cannot enable sending after a material edit',async()=>{
 const ui=setup();let resolve;ui.account.api=()=>new Promise(r=>{resolve=r;});const matching=ui.match();ui.edit('district','Ernakulam');resolve({total:1,items:[{id:'company',name:'Fixture Solar'}]});await matching;assert.equal(ui.send.disabled,true);assert.match(ui.recipients.textContent,/changed during the check/);
});

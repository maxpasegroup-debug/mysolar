import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function fixture(initial=''){
 const requests=[],handlers={},notice={textContent:''},list={hidden:true,innerHTML:''},results={textContent:''};
 const saved={name:'locality',value:'',dispatchEvent(){},matches:()=>false};
 const input={id:'solar-choice-locality',disabled:true,value:'',validityMessage:'',setCustomValidity(value){this.validityMessage=value;},setAttribute(){},removeAttribute(){},matches:s=>s==='[role="combobox"]',closest:s=>s==='#purchase-enquiry'?form:s==='[data-location-choice]'?choice:null};
 const choice={dataset:{locationChoice:'locality',initialLocality:initial},querySelector:s=>s==='[role="combobox"]'?input:s==='[type="hidden"]'?saved:s==='[role="listbox"]'?list:results,closest:()=>null};
 const form={dataset:{},isConnected:true,elements:{state:{value:'Kerala'},district:{value:'Kannur'},pin:{value:'670307'}},querySelector:s=>s==='[data-reviewed-locality]'?choice:notice};
 const ctx={window:{},document:{addEventListener:(name,handler)=>(handlers[name]??=[]).push(handler)},Event,URLSearchParams,escapeHTML:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;'),Account:{api:url=>new Promise((resolve,reject)=>requests.push({url,resolve,reject}))}};
 vm.runInNewContext(readFileSync(new URL('../src/company-location.js',import.meta.url),'utf8'),ctx);
 return {ui:ctx.window.CompanyLocation,form,choice,input,saved,notice,list,handlers,requests};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('locality choices ignore stale responses and changing the PIN clears a selected locality',async()=>{
 const f=fixture();f.ui.refreshLocalities(f.form);assert.equal(f.input.disabled,false);assert.match(f.input.validityMessage,/please wait/i);assert.equal(f.requests.length,1);
 f.form.elements.pin.value='670308';f.ui.refreshLocalities(f.form);assert.equal(f.requests.length,2);
 f.requests[1].resolve({items:[{name:'Current locality'}]});f.requests[0].resolve({items:[{name:'Stale locality'}]});await flush();
 assert.deepEqual([...f.choice.localityOptions],['Current locality']);assert.equal(f.input.disabled,false);
 f.saved.value='Current locality';f.input.value='Current locality';f.ui.refreshLocalities(f.form);assert.equal(f.saved.value,'Current locality');
 f.form.elements.district.value='';f.ui.refreshLocalities(f.form);assert.equal(f.input.disabled,true);assert.equal(f.saved.value,'');assert.equal(f.input.value,'');
 assert.match(f.ui.localityField(),/role="combobox"/);assert.match(f.ui.localityField(),/name="locality"/);
});

test('returning from a company profile restores only a currently reviewed locality',async()=>{
 const f=fixture('Payyanur');f.ui.refreshLocalities(f.form);f.requests[0].resolve({items:[{name:'Payyanur'}]});await flush();
 assert.equal(f.saved.value,'Payyanur');assert.equal(f.input.value,'Payyanur');assert.equal(f.choice.dataset.initialLocality,undefined);
 f.choice.dataset.initialLocality='Unreviewed place';f.form.dataset.localityTuple='';f.ui.refreshLocalities(f.form);f.requests[1].resolve({items:[{name:'Payyanur'}]});await flush();
 assert.equal(f.saved.value,'');assert.equal(f.input.value,'');assert.match(f.ui.localityField('Payyanur'),/data-initial-locality="Payyanur"/);
});

test('missing locality references allow searching but reject free text',async()=>{
 const f=fixture();f.ui.refreshLocalities(f.form);f.requests[0].resolve({items:[]});await flush();
 assert.equal(f.input.disabled,false);assert.match(f.notice.textContent,/cannot verify/i);
 f.input.value='Payyanur';for(const handler of f.handlers.input)handler({target:f.input});
 assert.equal(f.saved.value,'');assert.match(f.input.validityMessage,/verified locality/i);assert.match(f.list.innerHTML,/No matches/);
});

test('typing a full reviewed locality accepts the canonical value without clicking a suggestion',async()=>{
 const f=fixture();f.ui.refreshLocalities(f.form);f.requests[0].resolve({items:[{name:'Payyanur Town'},{name:'Other place'}]});await flush();
 f.input.value='  payyanur   TOWN  ';for(const handler of f.handlers.input)handler({target:f.input});
 assert.equal(f.saved.value,'Payyanur Town');assert.equal(f.input.validityMessage,'');
 f.input.value='Payyanur';for(const handler of f.handlers.input)handler({target:f.input});
 assert.equal(f.saved.value,'');assert.match(f.input.validityMessage,/verified locality/i);
});

test('typed localities wait for the current lookup and ambiguous normalized names are not auto-selected',async()=>{
 const f=fixture();f.ui.refreshLocalities(f.form);
 f.input.value='payyanur';for(const handler of f.handlers.input)handler({target:f.input});
 assert.equal(f.saved.value,'');assert.match(f.input.validityMessage,/please wait/i);
 f.requests[0].resolve({items:[{name:'Payyanur'}]});await flush();
 assert.equal(f.saved.value,'Payyanur');assert.equal(f.input.validityMessage,'');
 f.form.elements.pin.value='670308';f.ui.refreshLocalities(f.form);
 f.input.value='payyanur';for(const handler of f.handlers.input)handler({target:f.input});
 f.requests[1].resolve({items:[{name:'Payyanur'},{name:'PAYYANUR'}]});await flush();
 assert.equal(f.saved.value,'');assert.match(f.input.validityMessage,/verified locality/i);
});

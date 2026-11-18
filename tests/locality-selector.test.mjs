import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('locality choices ignore stale responses and unchanged blur events preserve the selection',async()=>{
 const requests=[],select={innerHTML:'',disabled:true,value:'',dispatchEvent(){}},notice={textContent:''};
 const form={dataset:{},isConnected:true,elements:{state:{value:'Kerala'},district:{value:'Kannur'},pin:{value:'670307'}},querySelector:s=>s.includes('data-reviewed-locality')?select:notice};
 const ctx={window:{},document:{addEventListener(){}},Event,URLSearchParams,escapeHTML:s=>String(s).replaceAll('<','&lt;'),Account:{api:url=>new Promise(resolve=>requests.push({url,resolve}))}};
 vm.runInNewContext(readFileSync(new URL('../src/company-location.js',import.meta.url),'utf8'),ctx);const ui=ctx.window.CompanyLocation;
 ui.refreshLocalities(form);assert.equal(select.disabled,false);assert.equal(requests.length,1);
 form.elements.pin.value='670308';ui.refreshLocalities(form);assert.equal(requests.length,2);
 requests[1].resolve({items:[{name:'Current locality'}],notice:'Reviewed'});requests[0].resolve({items:[{name:'Stale locality'}],notice:'Stale'});await new Promise(r=>setImmediate(r));
 assert.match(select.innerHTML,/Current locality/);assert.doesNotMatch(select.innerHTML,/Stale locality/);select.value='Current locality';ui.refreshLocalities(form);assert.equal(requests.length,2);assert.equal(select.value,'Current locality');
 form.elements.district.value='';ui.refreshLocalities(form);assert.equal(select.disabled,true);assert.doesNotMatch(select.innerHTML,/Current locality/);
 assert.match(ui.localityField(),/select name="locality" required disabled/);assert.doesNotMatch(ui.localityField(),/<input/);
});

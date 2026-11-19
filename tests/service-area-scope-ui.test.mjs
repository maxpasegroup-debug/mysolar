import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('choosing whole district clears narrower inputs and requires fresh confirmation',()=>{
 const changes=[],document={addEventListener(type,fn){if(type==='change')changes.push(fn);}};
 const context={window:{addEventListener(){}},document,location:{hash:''},URLSearchParams};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),context);
 const scope={name:'scope',value:'locality'},pin={value:'670307'},locality={value:'[TEST] Locality'},confirm={checked:true,disabled:true,required:false},label={hidden:true};
 const row={querySelector(selector){return ({'[name=scope]':scope,'[name=pin]':pin,'[name=locality]':locality,'[data-district-confirm]':confirm,'[data-district-confirm-label]':label})[selector];}};
 const handler=changes.find(fn=>String(fn).includes('data-district-confirm'));assert.ok(handler);
 // Other edits do not silently modify existing declarations.
 handler({target:{name:'label',closest:()=>row}});assert.equal(pin.value,'670307');assert.equal(locality.value,'[TEST] Locality');
 scope.value='district';handler({target:{name:'scope',value:'district',closest:()=>row}});
 assert.equal(pin.value,'');assert.equal(locality.value,'');assert.equal(confirm.checked,false);assert.equal(confirm.disabled,false);assert.equal(confirm.required,true);assert.equal(label.hidden,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('choosing whole district clears narrower inputs and requires fresh confirmation',()=>{
 const changes=[],document={addEventListener(type,fn){if(type==='change')changes.push(fn);}};
 const context={window:{addEventListener(){}},document,location:{hash:''},URLSearchParams};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),context);
 const scope={name:'scope',value:'locality'},pin={value:'670307'},locality={value:'[TEST] Locality'},confirm={checked:true,disabled:true,required:false},label={hidden:true},hint={hidden:true};
 const row={dataset:{},querySelector(selector){return ({'[name=scope]':scope,'[name=pin]':pin,'[name=locality]':locality,'[data-district-confirm]':confirm,'[data-district-confirm-label]':label,'[data-district-hint]':hint})[selector];}};
 const handler=changes.find(fn=>String(fn).includes('data-district-confirm'));assert.ok(handler);
 // Other edits do not silently modify existing declarations.
 handler({target:{name:'label',closest:()=>row}});assert.equal(pin.value,'670307');assert.equal(locality.value,'[TEST] Locality');
 scope.value='district';handler({target:{name:'scope',value:'district',closest:()=>row}});
 assert.equal(pin.value,'');assert.equal(locality.value,'');assert.equal(pin.readOnly,true);assert.equal(locality.readOnly,true);assert.equal(confirm.checked,false);assert.equal(confirm.disabled,false);assert.equal(confirm.required,true);assert.equal(label.hidden,false);assert.equal(hint.hidden,false);
 scope.value='locality';handler({target:{name:'scope',value:'locality',closest:()=>row}});
 assert.equal(pin.readOnly,false);assert.equal(locality.readOnly,false);assert.equal(pin.value,'670307');assert.equal(locality.value,'[TEST] Locality');assert.equal(hint.hidden,true);
});

test('existing contradictory district values remain editable until deliberately corrected',()=>{
 const changes=[],document={addEventListener(type,fn){if(type==='change')changes.push(fn);}};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),{window:{addEventListener(){}},document,location:{hash:''},URLSearchParams});
 const scope={value:'district'},pin={value:'670307'},locality={value:'[TEST] Locality'},confirm={},label={},hint={};
 const row={querySelector(selector){return ({'[name=scope]':scope,'[name=pin]':pin,'[name=locality]':locality,'[data-district-confirm]':confirm,'[data-district-confirm-label]':label,'[data-district-hint]':hint})[selector];}};
 changes.find(fn=>String(fn).includes('data-district-confirm'))({target:{name:'label',closest:()=>row}});
 assert.equal(pin.value,'670307');assert.equal(locality.value,'[TEST] Locality');assert.equal(pin.readOnly,false);assert.equal(locality.readOnly,false);
});

test('invalid district confirmation produces visible save guidance',()=>{
 const handlers={},document={addEventListener(type,fn){handlers[type]=fn;}};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),{window:{addEventListener(){}},document,location:{hash:''},URLSearchParams});
 const feedback={textContent:''},form={querySelector(){return feedback;}};
 handlers.invalid({target:{closest:()=>form,matches:()=>true}});
 assert.match(feedback.textContent,/Confirm.*entire district/);
});

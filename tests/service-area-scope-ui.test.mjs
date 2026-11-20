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

test('invalid coverage feedback identifies the first field and includes its browser validation message',async()=>{
 const handlers={},document={addEventListener(type,fn){handlers[type]=fn;}};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),{window:{addEventListener(){}},document,location:{hash:''},URLSearchParams});
 const feedback={textContent:''},form={querySelector(){return feedback;}};
 const input=(label,message)=>({closest:()=>form,matches:()=>false,labels:[{textContent:label}],validationMessage:message});
 handlers.invalid({target:input('Public area label','Please fill out this field.')});
 handlers.invalid({target:input('PIN','Please match the requested format.')});
 assert.equal(feedback.textContent,'Public area label: Please fill out this field.');
 await Promise.resolve();
 handlers.invalid({target:input('PIN','Please match the requested format.')});
 assert.equal(feedback.textContent,'PIN: Please match the requested format.');
});

test('legacy lowercase state selections still load the correct district choices',()=>{
 const changes=[],document={addEventListener(type,fn){if(type==='change')changes.push(fn);}};
 const context={window:{addEventListener(){}},document,location:{hash:''},URLSearchParams,IndiaGeography:{Kerala:['Kannur','Kozhikode']},escapeHTML:value=>String(value)};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),context);
 const district={innerHTML:''},scope={value:'locality'},pin={value:''},locality={value:''},confirm={checked:true},label={},hint={};
 const row={querySelector(selector){return ({'[name=district]':district,'[name=scope]':scope,'[name=pin]':pin,'[name=locality]':locality,'[data-district-confirm]':confirm,'[data-district-confirm-label]':label,'[data-district-hint]':hint})[selector];}};
 changes.find(fn=>String(fn).includes('data-district-confirm'))({target:{name:'state',value:'kerala',closest:()=>row}});
 assert.match(district.innerHTML,/value="Kannur"/);assert.match(district.innerHTML,/value="Kozhikode"/);assert.equal(confirm.checked,false);
});

test('coverage save dispatches when an area id input shadows the form id property',async()=>{
 const handlers={},document={addEventListener(type,fn){handlers[type]=fn;}};
 const inputs=Object.entries({id:'10000000-0000-4000-8000-000000000001',scope:'district',label:'[TEST] Kannur',state:'Kerala',district:'Kannur',pin:'',locality:''}).map(([name,value])=>({name,value}));
 const row={querySelectorAll:()=>inputs,querySelector:()=>({checked:true})};
 // In browsers, a named control called id hides HTMLFormElement.id.
 const form={id:inputs[0],dataset:{company:'fixture'},matches:()=>true,getAttribute:name=>name==='id'?'market-areas':null,querySelectorAll:()=>[row],isConnected:true};
 let call,pending;const Account={activeCompany:{id:'fixture'},run:fn=>{pending=fn();},api:async(...args)=>{call=args;return {message:'[TEST] Saved'};},refresh:async()=>{},setMessage:()=>{}};
 class FormData {constructor(){} *[Symbol.iterator](){yield ['revision','5'];}}
 const context={window:{addEventListener(){}},document,Account,FormData,location:{hash:''},URLSearchParams,render(){}};
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),context);
 let prevented=false;handlers.submit({target:form,preventDefault(){prevented=true;}});await pending;
 assert.equal(prevented,true);assert.equal(call[0],'/companies/current/service-areas');assert.equal(call[1],'PUT');assert.equal(call[2].revision,5);
 assert.equal(call[2].areas[0].scope,'district');assert.equal(call[2].areas[0].confirmEntireDistrict,true);assert.equal(call[2].areas[0].pin,'');assert.equal(call[2].areas[0].locality,'');
});

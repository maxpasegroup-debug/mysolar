import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {companyLocation} from '../server/setup/location.js';

test('India directory contains all states/UTs, Kerala districts and unique labels',()=>{
 assert.equal(Object.keys(globalThis.IndiaGeography).length,36);
 assert.equal(globalThis.IndiaGeography.Kerala.length,14);
 assert.ok(globalThis.IndiaGeography.Kerala.includes('Kozhikode'));
 for(const districts of Object.values(globalThis.IndiaGeography)){assert.ok(districts.length);assert.equal(new Set(districts).size,districts.length);}
});
test('server validates country/state, supports new districts and legacy forms',()=>{
 assert.deepEqual(companyLocation({countryCode:'IN',state:'Kerala',district:'Kozhikode'}),{state:'Kerala',district:'Kozhikode'});
 assert.equal(companyLocation({city:'Kochi'}),null);
 for(const input of [{countryCode:'US',state:'Kerala',district:'Kozhikode'},{countryCode:'IN',state:'Unknown',district:'Kozhikode'},{countryCode:'IN',state:'Kerala',district:''},{countryCode:'IN',state:'Kerala',district:'<script>'}])assert.throws(()=>companyLocation(input));
 assert.equal(companyLocation({countryCode:'IN',state:'Kerala',district:'Newly named district'}).district,'Newly named district');
});
test('form uses required dependent controls, restores values and escapes legacy text',()=>{
 const listeners={},ctx={IndiaGeography:globalThis.IndiaGeography,t:value=>value,escapeHTML:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),window:{},document:{addEventListener:(event,fn)=>listeners[event]=fn}};
 vm.runInNewContext(readFileSync(new URL('../src/company-location.js',import.meta.url),'utf8'),ctx);
 const ui=ctx.window.CompanyLocation;
 assert.match(ui.fields(),/value="IN" selected/);assert.match(ui.fields(),/name="district" required disabled/);
 const saved=ui.fields({state:'kerala',district:'KOZHIKODE'});
 assert.match(saved,/value="Kerala" selected/);assert.match(saved,/value="Kozhikode" selected/);
 assert.match(ui.fields({state:'Kerala',district:'<Renamed>'}),/value="&lt;Renamed>"/);
 let content='';const host={querySelector:()=>({set innerHTML(value){content=value;}})};
 listeners.change({target:{name:'state',value:'Tamil Nadu',closest:()=>host}});
 assert.match(content,/Chennai/);assert.doesNotMatch(content,/Kozhikode/);assert.doesNotMatch(content,/selected/);
 const values=ui.values({querySelector:()=>true,elements:{countryCode:{value:'IN'},state:{value:'Kerala'},district:{value:'__other__'},districtOther:{value:' New district '}}});
 assert.equal(values.district,'New district');
});

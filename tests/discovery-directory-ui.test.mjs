import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('partial directory results are identified as declarations requiring quotation eligibility review',()=>{
 const vendor={id:'6c701eb4-2163-4dab-8415-5de02a2f3115',name:'[TEST] Named locality company',city:'Kannur',description:'Published profile',service_areas:['[TEST] Harbour'],offered_categories:[]};
 const data={items:[vendor],total:1,page:1,pageSize:20,categories:[],locationMatch:'declared_only'};
 const context={window:{addEventListener(){}},document:{addEventListener(){}},location:{hash:'#/vendors?state=Kerala'},URLSearchParams,escapeHTML:s=>String(s),icon:()=>'',link:(href,label)=>`<a href="#${href}">${label}</a>`,heading:(a,b,c)=>`<h1>${b}</h1><p>${c}</p>`,status:s=>s,Organization:{logo:()=>''},Account:{field:()=>'',resource:(key,url,draw)=>draw(data)}};
 vm.runInNewContext(readFileSync(new URL('../src/india-geography.js',import.meta.url),'utf8'),context);
 vm.runInNewContext(readFileSync(new URL('../src/marketplace.js',import.meta.url),'utf8'),context);
 const html=context.window.Marketplace.page('/vendors');
 assert.match(html,/Named locality company/);
 assert.match(html,/declare coverage in the searched area/);
 assert.match(html,/eligibility for your installation is checked/);
 assert.doesNotMatch(html,/eligible compan(?:y|ies)/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('public storefront shows safe coverage notice and removes all request links until verified',()=>{
 const id='821518ce-91b6-4aa5-a7ff-7ca5bb751c90';
 const data={vendor:{id,name:'[TEST] Solar',description:'Published business',canonical_path:'/storefront/'+id,services:[]},areas:[{label:'Payyanur',state:'Kerala',district:'Kannur',pin:''}],offers:{items:[{}],total:1,page:1,pageSize:20},categories:[],quotationCoverage:{verified:false,message:'Quotation requests are temporarily unavailable while this company confirms its service locations.'}};
 const ctx={window:{},document:{addEventListener(){}},URLSearchParams,location:{hash:'#/storefront/'+id},escapeHTML:s=>String(s).replaceAll('<','&lt;'),t:s=>s,icon:()=>'',link:(url,label)=>`<a href="#${url}">${label}</a>`,Account:{user:null,resource:(p,url,draw)=>draw(data)},Journey:{setStore(){}},Marketplace:{offerCard:(o,opts)=>opts.quotationAvailable?'OFFER REQUEST':'OFFER INFORMATION'}};
 vm.runInNewContext(readFileSync(new URL('../src/experience.js',import.meta.url),'utf8'),ctx);
 const html=ctx.window.Experience.storefront('/storefront/'+id);
 assert.match(html,/Published business/);assert.match(html,/temporarily unavailable/);assert.doesNotMatch(html,/customer\/enquiry\/new|OFFER REQUEST/);assert.match(html,/OFFER INFORMATION/);
 data.quotationCoverage.verified=true;assert.match(ctx.window.Experience.storefront('/storefront/'+id),/customer\/enquiry\/new/);
});

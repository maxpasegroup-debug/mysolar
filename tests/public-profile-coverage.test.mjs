import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('public storefront keeps the company request path open but hides unverified offer requests',()=>{
 const id='821518ce-91b6-4aa5-a7ff-7ca5bb751c90';
 const data={vendor:{id,name:'[TEST] Solar',description:'Published business',canonical_path:'/storefront/'+id,services:[]},areas:[{label:'Payyanur',state:'Kerala',district:'Kannur',pin:''}],offers:{items:[{}],total:1,page:1,pageSize:20},categories:[],quotationCoverage:{verified:false,message:'This company has not confirmed verified service coverage yet. Enter your installation location to check eligibility; a request is sent only if the match is verified.'}};
 const ctx={window:{},document:{addEventListener(){}},URLSearchParams,location:{hash:'#/storefront/'+id},escapeHTML:s=>String(s).replaceAll('<','&lt;'),t:s=>s,icon:()=>'',link:(url,label)=>`<a href="#${url}">${label}</a>`,Account:{user:null,resource:(p,url,draw)=>draw(data)},Journey:{setStore(){}},Marketplace:{offerCard:(o,opts)=>opts.quotationAvailable?'OFFER REQUEST':'OFFER INFORMATION'}};
 vm.runInNewContext(readFileSync(new URL('../src/experience.js',import.meta.url),'utf8'),ctx);
 const html=ctx.window.Experience.storefront('/storefront/'+id);
 assert.match(html,/Published business/);assert.match(html,/has not confirmed verified service coverage/);assert.match(html,/customer\/enquiry\/new\?companyId=821518ce-91b6-4aa5-a7ff-7ca5bb751c90/);assert.doesNotMatch(html,/OFFER REQUEST/);assert.match(html,/OFFER INFORMATION/);
 data.quotationCoverage.verified=true;assert.match(ctx.window.Experience.storefront('/storefront/'+id),/customer\/enquiry\/new/);
});

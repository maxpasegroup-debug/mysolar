import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();
const {bossSummary,salesPeriods}=await import('../server/operations/boss-summary.js');
const {quoteList}=await import('../server/purchase/service.js');
const {activeQuotationSql}=await import('../server/purchase/active.js');
const company='10000000-0000-4000-8000-000000000001',user='20000000-0000-4000-8000-000000000001';

test('sales periods use India date, calendar boundaries and leap years',()=>{
 assert.deepEqual(salesPeriods(new Date('2024-02-29T19:00:00Z')),{current:{from:'2024-03-01',to:'2024-03-01'},previous:{from:'2024-02-01',to:'2024-02-29'}});
 assert.deepEqual(salesPeriods(new Date('2026-01-03T00:00:00Z')).previous,{from:'2025-12-01',to:'2025-12-31'});
});
test('no permissions means no database queries or financial/employee disclosure',async()=>{
 const db={query(){assert.fail('Unauthorized query');}};
 assert.deepEqual(await bossSummary(db,{companyId:company,userId:user,permissions:[]}),{sales:null,activeQuotations:null,team:null});
});
test('sales reuses the authorized report calculation and never fabricates a missing total',async()=>{
 const calls=[],ctx={companyId:company,userId:user,permissions:['orders.read']},db={query(){assert.fail('Unexpected direct query');}};
 const data=await bossSummary(db,ctx,{now:new Date('2026-10-28T00:00:00Z'),report:async(actual,auth,q)=>{assert.equal(actual,db);assert.equal(auth,ctx);calls.push(q);return {summary:[{label:'Agreed order value incl. recorded tax - not cash received',format:'money',value:'12000'}]};}});
 assert.equal(data.sales.current,'12000');assert.equal(calls.length,2);assert.equal(calls[0].to,'2026-10-28');assert.equal(calls[1].to,'2026-09-30');
 await assert.rejects(bossSummary(db,ctx,{report:async()=>({summary:[]})}),/BOSS_SALES_METRIC_UNAVAILABLE/);
});
test('quote/team queries are read-only and bind the current company; no row records returned',async()=>{
 const queries=[],ctx={companyId:company,userId:user,permissions:['quotations.read','members.read','tasks.manage','tasks.own']};
 const db={async query(sql,args){queries.push({sql,args});assert.match(sql,/^SELECT /);assert.deepEqual(args,[company]);return {rows:[{count:3,private:'Never copied'}]};}};
 const data=await bossSummary(db,ctx);assert.equal(data.activeQuotations,3);assert.deepEqual(data.team,{activeEmployees:3,overdueTasks:3});assert.equal(queries.length,3);
 const quote=queries[0].sql;assert.match(quote,/count\(DISTINCT q.quotation_id\)/);assert.match(quote,/valid_until>=/);assert.match(quote,/NOT EXISTS/);assert.match(quote,/o.company_id=q.company_id/);assert.match(quote,/o.status<>'cancelled'/);
 assert.match(queries[1].sql,/u.status='active'/);assert.match(queries[2].sql,/r.company_id=\$1/);assert.match(queries[2].sql,/due_date</);assert.equal(JSON.stringify(data).includes('Never copied'),false);
});

test('company active list uses exactly the KPI predicate and retains company binding',async()=>{
 const queries=[],db={async query(sql,args){queries.push({sql,args});return {rows:sql.includes('AS total')?[{total:0}]:[]};}},ctx={companyId:company,userId:user,permissions:['quotations.read']};
 await quoteList(db,{page:1,active:true},{ctx});assert.equal(queries.length,2);
 for(const query of queries){assert.ok(query.sql.includes(activeQuotationSql));assert.equal(query.args[0],company);assert.match(query.sql,/q.company_id=\$1/);}
 assert.match(activeQuotationSql,/ce.status IN \('cancelled','closed'\)/);assert.match(activeQuotationSql,/newer.version>q.version/);
 queries.length=0;await quoteList(db,{page:1,active:true},{user:{id:user}});
 for(const query of queries){assert.equal(query.sql.includes(activeQuotationSql),false);assert.equal(query.args[0],user);assert.match(query.sql,/e.customer_id=\$1/);}
});

function ui(permissions=[]){
 const allowed=new Set(permissions),account={activeCompany:{id:company,name:'Company <unsafe>',role:'owner',lifecycle:'active'},session:{companies:[],permissions},isDemo:()=>false,navAllowed:url=>!url.includes('accounts')||allowed.has('finance.read'),person:()=>({name:'Owner <unsafe>',role:'Owner'}),feedback:()=>''};
 const ctx={window:{},Account:account,Workspace:{navigationMarkup:()=>''},Intl,Date,BigInt,document:{addEventListener(){}},escapeHTML:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),t:x=>x,icon:x=>`<svg data-icon="${x}"></svg>`,I18n:{money:x=>'INR '+x},button:()=>'',link:(url,label,css='')=>`<a class="${css}" href="#${url}">${label}</a>`};
 vm.runInNewContext(readFileSync(new URL('../src/boss-dashboard.js',import.meta.url),'utf8'),ctx);return {boss:ctx.window.BossDashboard,account};
}
test('owner view preserves role boundary and uses real values with honest unavailable states',()=>{
 const {boss,account}=ui(['customers.manage','quotations.manage','members.read']);assert.equal(boss.enabled(),true);
 const html=boss.page({cards:[],priorities:[],outstanding:null,boss:{sales:null,activeQuotations:0,team:{activeEmployees:0,overdueTasks:null}}});
 assert.match(html,/Unavailable/);assert.match(html,/Attendance and leave tracking are not available/);assert.match(html,/Coming soon/);assert.match(html,/Not connected/);assert.doesNotMatch(html,/href="#\/distributor\/new\?kind=invoices"/);assert.doesNotMatch(html,/href="#\/distributor\/accounts"/);
 assert.match(html,/href="#\/distributor\/quotation\/new"/);assert.doesNotMatch(html,/4,86,000|1,24,500/);
 account.activeCompany.role='sales';assert.equal(boss.enabled(),false);account.activeCompany.role='owner';account.activeCompany.lifecycle='draft';assert.equal(boss.enabled(),false);
});
test('chart displays exact server totals, period boundaries and a text equivalent',()=>{
 const {boss}=ui(['orders.read','finance.read']);const html=boss.page({cards:[],priorities:[],outstanding:'5000',boss:{sales:{current:'15000',previous:'10000',periods:{current:{from:'2026-10-01',to:'2026-10-28'}}},activeQuotations:2}});
 assert.match(html,/role="img"/);assert.match(html,/INR 15000/);assert.match(html,/Previous full month/);assert.match(html,/no growth percentage implied/);assert.match(html,/2026-10-01/);assert.doesNotMatch(html,/height:150%/);
});

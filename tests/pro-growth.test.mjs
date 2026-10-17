import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {eligiblePro,growthAccess,requirePro,requireStaffEntitlement,validateGrowthTerms} from '../server/commercial/growth.js';
import {staffDetails} from '../server/setup/staff.js';
import {guard} from '../server/commercial/policy.js';
const now=Date.now(),row={code:'pro',company_status:'active',lifecycle:'active',status:'active',start_at:new Date(now-10000).toISOString(),end_at:new Date(now+10000).toISOString()};
test('only a current assigned PRO subscription grants growth access',()=>{
 assert.equal(eligiblePro(row,now),true);assert.equal(eligiblePro({...row,status:'trial'},now),true);
 for(const code of ['free','elite','PRO','enterprise',null])assert.equal(eligiblePro({...row,code},now),false);
 for(const status of ['pending_commercial_activation','past_due','suspended','cancelled','expired'])assert.equal(eligiblePro({...row,status},now),false);
 for(const change of [{company_status:'suspended'},{lifecycle:'pending'},{start_at:row.end_at},{end_at:row.start_at},{end_at:'invalid'}])assert.equal(eligiblePro({...row,...change},now),false);
 assert.equal(eligiblePro(null,now),false);assert.equal(eligiblePro({...row,end_at:new Date(now).toISOString()},now),false);
});
test('resolver uses the current company subscription, never browser plan claims',async()=>{
 const db={query:async(sql,args)=>{assert.match(sql,/s.id=x.current_subscription_id AND s.company_id=c.id/);assert.deepEqual(args,['company-a']);return {rows:[row]};}};
 assert.equal((await growthAccess(db,'company-a')).enabled,true);
 await assert.rejects(requirePro({query:async()=>({rows:[{...row,code:'elite'}]})},'company-a'),e=>e.status===403&&e.code==='PRO_REQUIRED');
 await assert.rejects(requireStaffEntitlement({query:async()=>({rows:[]})},'company-a','part_time_sales'),e=>e.code==='PRO_REQUIRED');
 await requireStaffEntitlement({query:()=>assert.fail('Ordinary employee must not require PRO')},'company-a','sales');
});
test('PRO draft terms enforce authorized price without modifying other tiers',()=>{
 const terms={pricePaise:'599900',currency:'INR',interval:'monthly',taxMode:'exclusive'};
 validateGrowthTerms('pro',terms);validateGrowthTerms('elite',{pricePaise:'1'});validateGrowthTerms('free',{pricePaise:'0'});
 for(const change of [{pricePaise:'5999'},{currency:'USD'},{interval:'annual'},{taxMode:'inclusive'}])assert.throws(()=>validateGrowthTerms('pro',{...terms,...change}));
});
test('executive details are bounded, do not grant roles and preserve account identity',()=>{
 const d=staffDetails({name:'Local executive',state:'Kerala',city:'Kochi',territory:'Ernakulam',phone:'+91 9000000000'},'part_time_sales');
 assert.equal(d.employmentType,'part_time');assert.equal(d.state,'Kerala');
 for(const bad of [{companyId:'foreign'},{role:'owner'},{name:'x'.repeat(101)},{city:'<bad>\n'},{phone:'hello'}])assert.throws(()=>staffDetails(bad,'part_time_sales'));
 assert.throws(()=>staffDetails({name:'x'},'sales'));assert.deepEqual(staffDetails(undefined,'sales'),{});
});
test('new SQL role has only workspace and own-task grants; historical catalogue stays unchanged',async()=>{
 const sql=await readFile(new URL('../server/db/migrations/011_pro_network.sql',import.meta.url),'utf8');
 assert.match(sql,/WHERE id IN \('workspace.read','tasks.own'\)/);assert.match(sql,/FOREIGN KEY\(company_id,assignee_id\) REFERENCES company_memberships\(company_id,user_id\)/);
 const {roleDefinitions}=await import('../server/permissions.js');assert.equal(roleDefinitions.part_time_sales,undefined);
});
test('growth screens escape names, disable non-PRO creation and expose real task routes',async()=>{
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const account={user:{id:'user'},activeCompany:{id:'company'},session:{permissions:['members.manage','invitations.manage','tasks.manage']}};
 const ctx={window:{},document:{addEventListener(){}},Account:account,escapeHTML:escape,location:{hash:'#/distributor/team'},URLSearchParams,icon:()=>'',link:(p,l)=>`<a href="#${escape(p)}">${l}</a>`,Organization:{deliveryFields:()=>''}};vm.createContext(ctx);vm.runInContext(await readFile(new URL('../src/growth.js',import.meta.url),'utf8'),ctx);
 const G=ctx.window.Growth,base={growth:{enabled:false},members:[]};let html=G.team(base);assert.match(html,/<fieldset disabled>/);assert.match(html,/₹5,999/);assert.match(html,/Discuss a PRO upgrade/);
 html=G.team({...base,growth:{enabled:true},members:[{id:'membership',user_id:'user-a',name:'<script>',email:'test@example.invalid',role:'part_time_sales',status:'active',staff_details:{},staff_revision:1}]});assert.match(html,/&lt;script&gt;/);assert.match(html,/tasks\?assignee=user-a/);assert.doesNotMatch(html,/<fieldset disabled>/);
});
test('company action guard blocks direct partner requests without PRO and preserves reads/revocation',async()=>{
 const db={query:async()=>({rows:[]})},ctx={companyId:'a',role:'owner'},req=(method,body={})=>({method,body,originalUrl:'/api/companies/current/partners'});
 await assert.rejects(guard(db,ctx,req('POST'),'partners.manage'),e=>e.code==='PRO_REQUIRED');
 await assert.rejects(guard(db,ctx,req('PATCH',{status:'active'}),'partners.manage'),e=>e.code==='PRO_REQUIRED');
 await guard(db,ctx,req('GET'),'partners.read');await guard(db,ctx,req('PATCH',{status:'revoked'}),'partners.manage');
});
test('part-time writes require PRO in addition to ordinary feature permissions',async()=>{
 const ctx={companyId:'a',role:'part_time_sales'},req={method:'POST',body:{},originalUrl:'/api/companies/current/operations/tasks/id/update'};
 await assert.rejects(guard({query:async()=>({rows:[{...row,status:'expired'}]})},ctx,req,'workspace.read'),e=>e.code==='PRO_REQUIRED');
 const db={query:async sql=>({rows:sql.includes('commercial_policy')?[{policy:{writable:true,features:{projects:false}}}]:[row]})};
 await assert.rejects(guard(db,ctx,req,'workspace.read'),e=>e.code==='ENTITLEMENT_REQUIRED');
});
test('partner screen gives no cross-company dashboard link and disables upgrade-only actions',async()=>{
 const state={user:{id:'u'},activeCompany:{id:'a'},session:{permissions:['partners.read','partners.manage']},feedback:()=>'',resource:(p,url,render)=>render({access:{enabled:false},items:[],incoming:[],employees:[],events:[],page:1})};
 const ctx={window:{},document:{addEventListener(){}},Account:state,escapeHTML:x=>String(x??''),URLSearchParams,location:{hash:'#/distributor/partners'},icon:()=>'',link:(p,l)=>`<a href="#${p}">${l}</a>`,heading:()=>'',Organization:{inviteReceipt:()=>''}};vm.createContext(ctx);vm.runInContext(await readFile(new URL('../src/growth.js',import.meta.url),'utf8'),ctx);
 const html=ctx.window.Growth.page('/distributor/partners');assert.match(html,/fieldset disabled/);assert.match(html,/No partners yet/);assert.match(html,/#\/companies/);assert.doesNotMatch(html,/dashboard\?/);
});

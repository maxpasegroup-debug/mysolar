import {recordSurvey} from './helpers/installation-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';
test('project coordination and reviewed handoffs preserve history and assignment isolation',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,stranger,companyA,client}=await connectedFixture(t),root='/companies/current/operations',controls='/companies/current/controls',why='[TEST] reviewed operational handoff';
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 ok(await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'field_engineer'}),201);ok(await stranger.request('/companies/select','POST',{companyId:companyA}));await stranger.session();
 const replacement=client();await replacement.register('coordination-replacement');ok(await a.request('/companies/current/members','POST',{email:replacement.user.email,role:'field_engineer'}),201);ok(await replacement.request('/companies/select','POST',{companyId:companyA}));await replacement.session();
 const contact=ok(await a.request(root+'/contacts','POST',{operationKey:randomUUID(),kind:'individual',name:'[TEST] customer',email:'',phone:'',billingAddress:'',serviceAddress:''}),201).id;
 const project=ok(await a.request(root+'/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:null,leadId:null,reference:'TEST-COORDINATION',name:'[TEST] project',location:'[TEST]',scope:'[TEST] installation',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:why}),201).id;
 const read=async(kind,id,person=a)=>ok(await person.request(root+'/record/'+kind+'/'+id));
 const revision=async(kind,id)=>(await read(kind,id)).record.revision;
 for(const person of [stranger,replacement])ok(await a.request(root+'/projects/'+project+'/assign','POST',{revision:await revision('projects',project),userId:person.user.id,action:'assign'}));
 const task=async(title,person=stranger)=>ok(await a.request(root+'/tasks','POST',{operationKey:randomUUID(),title,description:'[TEST] work',contactId:null,orderId:null,projectId:project,serviceId:null,assigneeId:person.user.id,priority:'normal',dueDate:'2026-01-01'}),201).id;
 const first=await task('[TEST] first prerequisite'),second=await task('[TEST] dependent task');
 const update=async(id,status,person=stranger,extra={})=>person.request(root+'/tasks/'+id+'/update','POST',{revision:await revision('tasks',id),status,completionNotes:why,assigneeId:person.user.id,...extra});
 const dependency=async(id,other,person=a)=>person.request(root+'/tasks/'+id+'/dependencies','POST',{revision:await revision('tasks',id),dependsOnId:other,action:'add',reason:why});
 const plan=async(id,extra={})=>a.request(root+'/tasks/'+id+'/coordination','POST',{revision:await revision('tasks',id),startDate:'',dueDate:'2026-01-01',milestoneCode:'survey',evidenceRequired:true,evidenceReference:'',reason:why,...extra});
 await t.test('dependencies reject cycles, self links, foreign records and employee API bypasses',async()=>{
  ok(await dependency(second,first));assert.equal((await dependency(first,second)).status,409);assert.equal((await dependency(first,first)).status,409);assert.equal((await dependency(first,randomUUID())).status,404);assert.equal((await dependency(second,first,stranger)).status,403);assert.equal((await b.request(root+'/record/projects/'+project)).status,404);assert.equal((await update(second,'in_progress')).status,409);
 });
 let item;
 await t.test('schedule, checklist and evidence are enforced before completion',async()=>{
  ok(await plan(first,{startDate:'2099-01-01',dueDate:'2099-01-02'}));assert.equal((await update(first,'in_progress')).status,409);ok(await plan(first));item=ok(await a.request(root+'/tasks/'+first+'/checklist','POST',{revision:await revision('tasks',first),label:'[TEST] check mounting',required:true})).id;
  ok(await update(first,'in_progress'));assert.equal((await update(first,'completed')).status,409);
  ok(await stranger.request(root+'/tasks/'+first+'/checklist/'+item,'POST',{revision:await revision('tasks',first),done:true,evidenceReference:'[TEST] protected project document',notes:why,retire:false}));assert.equal((await update(first,'completed')).status,409);ok(await update(first,'completed',stranger,{evidenceReference:'[TEST] survey report'}));ok(await update(second,'in_progress'));assert.equal((await update(first,'in_progress')).status,409);
 });
 const stage=async(extra={})=>a.request(root+'/projects/'+project+'/stages','POST',{revision:await revision('projects',project),code:'private_check',title:'[TEST] private preparation',position:15,startDate:'',dueDate:'2026-01-01',assigneeId:stranger.user.id,evidenceRequired:true,fieldEditable:true,customerVisible:false,reason:why,...extra});
 await t.test('custom stages, ordered progress, blockers and deadlines use real records',async()=>{
  ok(await stage());const v=(await read('projects',project)).coordination;assert.equal(v.stages.length,9);assert.equal(v.currentStage,'survey');assert.ok(v.stages.find(s=>s.code==='private_check').overdue);assert.equal((await stage({code:'inspection',position:60,evidenceRequired:false})).status,409);
  const milestone=async(code,status)=>a.request(root+'/projects/'+project+'/milestones','POST',{revision:await revision('projects',project),code,status,notes:why,evidenceReference:'[TEST] recorded evidence'});
  assert.equal((await milestone('private_check','done')).status,409);await recordSurvey(a,project);ok(await milestone('survey','done'));ok(await milestone('private_check','blocked'));assert.equal((await read('projects',project)).coordination.stages.find(s=>s.code==='private_check').blocker_reason,why);
 });
﻿ await t.test('private stages stay out of customer records, exports and SIA context',async()=>{
  await db.query('UPDATE company_contacts SET user_id=$1 WHERE id=$2',[customer.user.id,contact]);
  const v=ok(await customer.request('/customer/operations/record/projects/'+project));assert.equal(v.milestones.length,8);assert.doesNotMatch(JSON.stringify(v),/private_check|private preparation|Customer access pending/);
  const exported=await customer.request('/customer/experience/exports/projects/'+project);assert.equal(exported.status,200);assert.doesNotMatch(JSON.stringify(exported.data),/private_check|private preparation/);
  const {gather}=await import('../server/sia/tools.js');const facts=await gather(db,{userId:customer.user.id,channel:'customer',permissions:['customer.installation.own']},'tracking',{kind:'projects',id:project});assert.doesNotMatch(JSON.stringify(facts),/private_check|private preparation/);
 });
 await t.test('role restrictions and direct access changes cannot strand assigned work',async()=>{
  const member=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,stranger.user.id])).rows[0];
  assert.equal((await a.request('/companies/current/members/'+member.id,'PATCH',{role:'accounts',status:'active'})).status,409);
  const profile=ok(await a.request(controls+'/profiles','POST',{id:'',revision:1,name:'[TEST] restricted field',baseRole:'field_engineer',permissions:['workspace.read','company.read'],discountLimitBps:null,active:true,reason:why})).id;
  const revision=(await db.query('SELECT people_revision FROM company_memberships WHERE id=$1',[member.id])).rows[0].people_revision;
  assert.equal((await a.request(controls+'/people/'+member.id,'POST',{revision,teamId:'',managerId:'',profileId:profile,reason:why})).status,409);
  assert.equal((await stranger.request(root+'/projects/'+project+'/transfer/preview','POST',{fromUserId:stranger.user.id,toUserId:replacement.user.id})).status,403);
 });

 await t.test('legacy removal cannot strand outstanding work; previews are bound to work and permissions',async()=>{
  assert.equal((await a.request(root+'/projects/'+project+'/assign','POST',{revision:await revision('projects',project),userId:stranger.user.id,action:'remove'})).status,409);
  const endpoint=root+'/projects/'+project+'/transfer';assert.equal((await a.request(endpoint+'/preview','POST',{fromUserId:stranger.user.id,toUserId:replacement.user.id},{'X-CSRF-Token':'invalid'})).status,403);const payload={fromUserId:stranger.user.id,toUserId:replacement.user.id};let preview=ok(await a.request(endpoint+'/preview','POST',payload));
  const request={...payload,operationKey:randomUUID(),workVersion:preview.workVersion,confirm:true,reason:why};ok(await update(second,'blocked'));assert.equal((await a.request(endpoint,'POST',request)).status,409);preview=ok(await a.request(endpoint+'/preview','POST',payload));request.workVersion=preview.workVersion;
  assert.equal((await a.request(endpoint,'POST',{...request,confirm:false})).status,400);const competing={...request,operationKey:randomUUID()};const results=await Promise.all([a.request(endpoint,'POST',request),a.request(endpoint,'POST',competing)]);assert.equal(results.filter(r=>r.status===200).length,1);assert.ok([404,409].includes(results.find(r=>r.status!==200).status));if(results[1].status===200)request.operationKey=competing.operationKey;ok(await a.request(endpoint,'POST',request));assert.equal((await a.request(endpoint,'POST',{...request,toUserId:a.user.id})).status,409);
  assert.equal((await stranger.request(root+'/record/projects/'+project)).status,404);assert.equal((await stranger.request(root+'/record/tasks/'+second)).status,404);ok(await replacement.request(root+'/record/tasks/'+second));
  const completed=ok(await stranger.request(root+'/record/tasks/'+first));assert.equal(completed.record.assignee_id,stranger.user.id);assert.equal(completed.coordination.project,null);
  const history=(await read('tasks',second)).history.items;assert.ok(history.some(h=>h.metadata?.previousAssigneeId===stranger.user.id&&h.metadata?.newAssigneeId===replacement.user.id));
 });
 await t.test('legacy work on a closed project remains accountable and can be explicitly cancelled by a manager',async()=>{
  const legacy=await task('[TEST] legacy outstanding task',a);await db.query("UPDATE installation_projects SET status='cancelled' WHERE id=$1",[project]);
  assert.equal((await update(legacy,'in_progress',a)).status,409);ok(await update(legacy,'cancelled',a));
  assert.equal((await a.request(root+'/tasks','POST',{operationKey:randomUUID(),title:'[TEST] blocked new work',description:'',contactId:null,orderId:null,projectId:project,serviceId:null,assigneeId:a.user.id,priority:'normal',dueDate:''})).status,409);
  await db.query("UPDATE installation_projects SET status='pending' WHERE id=$1",[project]);
 });
 await t.test('employee departure transfers open work atomically and revokes access while preserving completed history',async()=>{
  const m=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,replacement.user.id])).rows[0],endpoint=controls+'/people/'+m.id+'/departure';
  assert.equal((await a.request('/companies/current/members/'+m.id,'PATCH',{role:'field_engineer',status:'suspended'})).status,409);
  assert.equal((await b.request(endpoint+'/preview','POST',{toUserId:a.user.id,status:'suspended'})).status,404);
  const preview=ok(await a.request(endpoint+'/preview','POST',{toUserId:a.user.id,status:'suspended'}));assert.ok(preview.counts.tasks);const request={toUserId:a.user.id,status:'suspended',operationKey:randomUUID(),workVersion:preview.workVersion,confirm:true,reason:why};ok(await a.request(endpoint,'POST',request));ok(await a.request(endpoint,'POST',request));assert.notEqual((await replacement.request(root+'/record/tasks/'+second)).status,200);
  assert.equal((await db.query('SELECT assignee_id FROM business_tasks WHERE id=$1',[second])).rows[0].assignee_id,a.user.id);assert.equal((await db.query('SELECT assignee_id FROM business_tasks WHERE id=$1',[first])).rows[0].assignee_id,stranger.user.id);assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE company_id=$1 AND action='membership.handoff'",[companyA])).rows[0].n,1);
 });
});

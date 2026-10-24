import {audit} from '../db/pool.js';
import {createHash} from 'node:crypto';
import * as c from './core.js';
import {companyPermissions} from '../permissions.js';

const openTasks="status NOT IN ('completed','cancelled')",openProjects="status IN ('pending','active','on_hold')",openService="status<>'closed'";
export const projectTaskLink=(alias,parameter)=>`(${alias}.project_id=${parameter} OR ${alias}.order_id IN (SELECT id_order.order_id FROM installation_projects id_order WHERE id_order.id=${parameter} AND id_order.company_id=${alias}.company_id) OR ${alias}.service_id IN (SELECT s.id FROM service_requests s JOIN installation_projects p ON p.id=${parameter} AND p.company_id=s.company_id WHERE s.project_id=p.id OR s.order_id=p.order_id))`;
export async function assignmentEvent(db,ctx,kind,id,previous,next,why,extra={}){
 const names=(await db.query('SELECT id,display_name FROM users WHERE id=ANY($1::uuid[])',[[previous,next].filter(Boolean)])).rows;
 const metadata={previousAssigneeId:previous,newAssigneeId:next,previousAssignee:names.find(u=>u.id===previous)?.display_name||null,newAssignee:names.find(u=>u.id===next)?.display_name||null,...extra};
 await c.event(db,ctx,kind,id,'assignment_changed',why,false,metadata);
}
async function member(db,company,id,byUser=false){const m=(await db.query(`SELECT m.*,u.display_name,u.status AS user_status FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.${byUser?'user_id':'id'}=$2`,[company,c.v.uuid(id)])).rows[0];if(!m)throw c.missing();return m;}
export async function employeeWork(db,company,user,project=null){
 const args=[company,user],projectFilter=project?' AND id=$3':'',p=project?' AND project_id=$3':'';if(project)args.push(project);
 const query=async(sql)=>(await db.query(sql,args)).rows;
 const work={
  projects:await query(`SELECT id,reference,revision FROM installation_projects WHERE company_id=$1 AND manager_id=$2 AND ${openProjects}${projectFilter} ORDER BY id`),
  projectTeams:await query(`SELECT p.id,p.reference,p.revision,p.status FROM project_assignments a JOIN installation_projects p ON p.id=a.project_id AND p.company_id=a.company_id WHERE a.company_id=$1 AND a.user_id=$2${project?' AND p.id=$3':''} ORDER BY p.id`),
  tasks:await query(`SELECT t.id,t.title AS reference,t.revision,t.project_id,t.service_id,t.order_id FROM business_tasks t WHERE t.company_id=$1 AND t.assignee_id=$2 AND t.${openTasks}${project?' AND '+projectTaskLink('t','$3'):''} ORDER BY t.id`),
  stages:await query(`SELECT m.project_id,m.code,m.updated_at FROM project_milestones m JOIN installation_projects p ON p.id=m.project_id AND p.company_id=m.company_id WHERE m.company_id=$1 AND m.assignee_id=$2 AND m.status NOT IN ('done','not_applicable') AND p.${openProjects}${project?' AND m.project_id=$3':''} ORDER BY m.project_id,m.code`),
  service:await query(`SELECT s.id,s.reference,s.revision FROM service_requests s WHERE s.company_id=$1 AND s.assignee_id=$2 AND s.${openService}${project?' AND (s.project_id=$3 OR s.order_id IN (SELECT order_id FROM installation_projects WHERE id=$3 AND company_id=$1))':''} ORDER BY s.id`)
 };
 if(!project){
  work.funding=await query("SELECT id,reference,revision FROM funding_applications WHERE company_id=$1 AND assignee_id=$2 AND status NOT IN ('closed','withdrawn') ORDER BY id");
  work.leads=await query("SELECT id,title AS reference,revision FROM crm_leads WHERE company_id=$1 AND assignee_id=$2 AND stage NOT IN ('won','lost') ORDER BY id");
  work.orders=await query("SELECT id,reference,revision FROM business_orders WHERE company_id=$1 AND owner_id=$2 AND status NOT IN ('fulfilled','cancelled') ORDER BY id");
  const m=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[company,user])).rows[0];
  work.teams=m?(await db.query('SELECT id,name AS reference,revision FROM company_teams WHERE company_id=$1 AND manager_id=$2 AND active ORDER BY id',[company,m.id])).rows:[];
  work.reports=m?(await db.query("SELECT id,user_id,people_revision FROM company_memberships WHERE company_id=$1 AND reporting_manager_id=$2 AND status='active' ORDER BY id",[company,m.id])).rows:[];
 }
 return work;
}
export async function ensureWorkPermissions(db,ctx,user,permissions){
 const w=await employeeWork(db,ctx.companyId,user),has=p=>permissions.includes(p),projectAccess=has('projects.read')||has('projects.assigned.read');
 if(w.funding?.length&&(!(has('funding.read')||has('funding.assigned.read'))||!(has('funding.manage')||has('funding.assigned.update')))||w.projects.length&&(!projectAccess||!has('projects.manage'))||w.tasks.length&&!has('tasks.own')||w.stages.length&&(!projectAccess||!has('projects.progress'))||w.projectTeams.some(p=>!['completed','cancelled'].includes(p.status))&&!projectAccess||w.service.length&&!(has('service.read')||has('service.assigned'))||w.leads.length&&(!has('crm.read')||!has('crm.manage'))||w.orders.length&&(!has('orders.read')||!has('orders.manage')))throw c.fail('Transfer this employee’s outstanding work before restricting their role or access. Use the reviewed handoff on Team.');
 return w;
}
export async function requireNoOutstandingWork(db,ctx,user){const w=await employeeWork(db,ctx.companyId,user);if(Object.entries(w).some(([kind,rows])=>kind==='projectTeams'?rows.some(p=>!['completed','cancelled'].includes(p.status)):rows.length))throw c.fail('This employee still has work or team responsibilities. Preview and confirm a handoff on Team before suspending or removing access.');}
function fingerprint(ctx,from,to,work,project,status){return createHash('sha256').update(JSON.stringify({company:ctx.companyId,actor:ctx.userId,from,to,work,project,status})).digest('hex');}
export async function handoffPreview(db,ctx,{fromId,toUserId,projectId=null,status=null}){
 const from=await member(db,ctx.companyId,fromId,Boolean(projectId)),to=await member(db,ctx.companyId,toUserId,true);
 if(from.user_id===to.user_id||to.status!=='active'||to.user_status!=='active')throw c.badInput('Choose a different active employee in this company.');
 if(!projectId&&from.role_id==='owner')throw c.fail('Owner departure requires the separate ownership-transfer workflow.');
 const project=projectId?await c.record(db,ctx,'projects',projectId,{write:true}):null;
 if(project&&['completed','cancelled'].includes(project.status))throw c.fail('Use a company handoff for employee departure; this project is already closed.');
 if(!projectId&&(await db.query('WITH RECURSIVE reports AS (SELECT id,user_id FROM company_memberships WHERE company_id=$1 AND reporting_manager_id=$2 UNION SELECT m.id,m.user_id FROM company_memberships m JOIN reports r ON m.reporting_manager_id=r.id WHERE m.company_id=$1) SELECT 1 FROM reports WHERE user_id=$3',[ctx.companyId,from.id,to.user_id])).rowCount)throw c.badInput('Choose a receiving employee outside the departing employee reporting chain.');
 const work=await employeeWork(db,ctx.companyId,from.user_id,projectId),grants=await companyPermissions(db,to.role_id,ctx.companyId,to.user_id),has=p=>grants.includes(p);
 if(project&&!work.projectTeams.length&&!Object.values(work).some(rows=>rows.length))throw c.missing();
 if(project&&work.tasks.length)c.permit(ctx,'tasks.manage');if(project&&work.service.length)c.permit(ctx,'service.manage');
 if(work.funding?.length){c.permit(ctx,'funding.manage');if(!(has('funding.read')||has('funding.assigned.read'))||!(has('funding.manage')||has('funding.assigned.update')))throw c.badInput('The receiving employee needs loan/subsidy tracking permission.');}
 if(work.projects.length&&!has('projects.manage')||work.tasks.length&&!has('tasks.own')||work.stages.length&&!has('projects.progress')||work.service.length&&!(has('service.read')||has('service.assigned'))||work.leads?.length&&(!has('crm.read')||!has('crm.manage'))||work.orders?.length&&(!has('orders.read')||!has('orders.manage'))||(projectId||work.projectTeams.some(p=>!['completed','cancelled'].includes(p.status))||work.projects.length||work.stages.length||work.tasks.some(t=>t.project_id))&&!(has('projects.read')||has('projects.assigned.read')))throw c.badInput('The receiving employee does not have all permissions needed for this handoff. Choose an authorised person, or transfer individual work first.');
 await c.employee(db,ctx,to.user_id);
 const version=fingerprint(ctx,{id:from.id,user:from.user_id,revision:from.people_revision,status:from.status},{id:to.id,user:to.user_id,revision:to.people_revision,grants},work,project?{id:project.id,revision:project.revision}:null,status);
 return {workVersion:version,from:{id:from.id,userId:from.user_id,name:from.display_name},to:{id:to.id,userId:to.user_id,name:to.display_name},projectId,projectRevision:project?.revision,counts:Object.fromEntries(Object.entries(work).map(([kind,rows])=>[kind,rows.length])),work,status,notice:'This is a preview only. Outstanding work will transfer atomically. Completed records retain their original accountability. Project-wide role permissions remain authoritative.'};
}
export async function performHandoff(db,ctx,input){
 const {projectId=null,fromId,toUserId,status=null}=input;
 if(input.confirm!==true)throw c.badInput('Explicitly confirm the displayed handoff.');
 const why=c.plain(input.reason,'handoff reason',300,10);
 return c.once(db,ctx,input.operationKey,projectId?'project.handoff/'+projectId:'employee.departure/'+fromId,{...input,actorId:ctx.userId},async()=>{
  const preview=await handoffPreview(db,ctx,{projectId,fromId,toUserId,status});if(input.workVersion!==preview.workVersion)throw c.fail('The work or permissions changed. Preview the handoff again before confirming.');
  const from=preview.from.userId,to=preview.to.userId,w=preview.work,affected=new Set();
  if(projectId){await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[projectId,ctx.companyId,to]);affected.add(projectId);}
  for(const p of w.projectTeams){await db.query('DELETE FROM project_assignments WHERE project_id=$1 AND company_id=$2 AND user_id=$3',[p.id,ctx.companyId,from]);const project=(await db.query('SELECT status FROM installation_projects WHERE id=$1 AND company_id=$2',[p.id,ctx.companyId])).rows[0];if(!['completed','cancelled'].includes(project.status))await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[p.id,ctx.companyId,to]);affected.add(p.id);await assignmentEvent(db,ctx,'projects',p.id,from,['completed','cancelled'].includes(project.status)?null:to,why,{responsibility:'project_team',handoff:input.operationKey});}
  for(const p of w.projects){await db.query('UPDATE installation_projects SET manager_id=$1 WHERE id=$2 AND company_id=$3',[to,p.id,ctx.companyId]);await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[p.id,ctx.companyId,to]);affected.add(p.id);await assignmentEvent(db,ctx,'projects',p.id,from,to,why,{responsibility:'project_manager',handoff:input.operationKey});}
  for(const task of w.tasks){await db.query('UPDATE business_tasks SET assignee_id=$1,revision=revision+1 WHERE id=$2 AND company_id=$3',[to,task.id,ctx.companyId]);if(task.project_id){affected.add(task.project_id);await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[task.project_id,ctx.companyId,to]);}await assignmentEvent(db,ctx,'tasks',task.id,from,to,why,{handoff:input.operationKey});await c.notify(db,ctx,'tasks',task.id,'Outstanding work was transferred to you.',{assignee:to});}
  for(const stage of w.stages){await db.query('UPDATE project_milestones SET assignee_id=$1,updated_at=now(),updated_by=$2 WHERE project_id=$3 AND company_id=$4 AND code=$5',[to,ctx.userId,stage.project_id,ctx.companyId,stage.code]);affected.add(stage.project_id);await db.query('INSERT INTO project_assignments(project_id,company_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[stage.project_id,ctx.companyId,to]);await assignmentEvent(db,ctx,'projects',stage.project_id,from,to,why,{stage:stage.code,handoff:input.operationKey});}
  for(const [kind,table,field] of [['funding','funding_applications','assignee_id'],['service','service_requests','assignee_id'],['leads','crm_leads','assignee_id'],['orders','business_orders','owner_id']])for(const row of w[kind]||[]){await db.query(`UPDATE ${table} SET ${field}=$1,revision=revision+1 WHERE id=$2 AND company_id=$3`,[to,row.id,ctx.companyId]);await assignmentEvent(db,ctx,kind,row.id,from,to,why,{handoff:input.operationKey});await c.notify(db,ctx,kind,row.id,'Responsibility was transferred to you.',{assignee:to});}
  for(const id of affected){await db.query('UPDATE installation_projects SET revision=revision+1 WHERE id=$1 AND company_id=$2',[id,ctx.companyId]);const p=(await db.query('SELECT status FROM installation_projects WHERE id=$1 AND company_id=$2',[id,ctx.companyId])).rows[0];if(!['completed','cancelled'].includes(p.status))await c.notify(db,ctx,'projects',id,'Project work was transferred to you.',{assignee:to});}
  if(!projectId){
   for(const team of w.teams)await db.query('UPDATE company_teams SET manager_id=$1,revision=revision+1 WHERE id=$2 AND company_id=$3',[preview.to.id,team.id,ctx.companyId]);
   for(const report of w.reports)await db.query('UPDATE company_memberships SET reporting_manager_id=$1 WHERE id=$2 AND company_id=$3',[preview.to.id,report.id,ctx.companyId]);
   await db.query('UPDATE company_memberships SET status=$1 WHERE id=$2 AND company_id=$3',[c.v.choice(status,['suspended','removed'],'departure access'),preview.from.id,ctx.companyId]);
   await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'membership.handoff',target:preview.from.id,metadata:{previousAssigneeId:from,newAssigneeId:to,counts:preview.counts,status,handoff:input.operationKey,reason:why,teams:w.teams,reports:w.reports}});
  }
  return {message:projectId?'Outstanding project work transferred. The previous employee was removed from the project team.':'Outstanding work transferred and employee access revoked. Completed history was preserved.',counts:preview.counts,handoffId:input.operationKey};
 });
}

import {Router} from 'express';
import {withCompany} from '../tenancy/context.js';
import {audit} from '../db/pool.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';
import * as c from './core.js';

export const workReports=Router();
workReports.use(c.router());
const indiaDay=async db=>(await db.query("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day,extract(hour FROM now() AT TIME ZONE 'Asia/Kolkata')::int AS hour")).rows[0];
const shiftDay=(day,offset)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
workReports.get('/work-reports',async(req,res)=>{
 v.body(req.query,['range','scope'],[]);const range=v.choice(req.query.range||'week',['day','week','month'],'report range'),scope=v.choice(req.query.scope||'mine',['mine','team'],'report scope');
 res.json(await withCompany(req,'workreports.own',async(db,ctx)=>{
  const today=(await indiaDay(db)).day,start=range==='day'?today:range==='week'?shiftDay(today,-6):today.slice(0,8)+'01',team=scope==='team';
  let managerMembershipId=null;if(team&&ctx.role!=='owner'){if(!ctx.permissions.includes('workreports.team'))throw new HttpError(403,'PERMISSION_DENIED','Your role cannot view team self-reports.');managerMembershipId=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2 AND status=\'active\'',[ctx.companyId,ctx.userId])).rows[0]?.id;if(!managerMembershipId)throw new HttpError(403,'PERMISSION_DENIED','Your active team access is unavailable.');}
  const items=(await db.query(`SELECT r.id,r.user_id,r.report_date::text,r.report_hour,r.work_summary,r.progress,r.blockers,r.next_step,r.manager_note,r.reviewed_at,r.created_at,u.display_name AS employee_name,m.reporting_manager_id,(($5::boolean OR m.reporting_manager_id=$6) AND r.user_id<>$7) AS can_review FROM company_work_reports r JOIN users u ON u.id=r.user_id JOIN company_memberships m ON m.company_id=r.company_id AND m.user_id=r.user_id WHERE r.company_id=$1 AND r.report_date BETWEEN $2::date AND $3::date AND ((NOT $4::boolean AND r.user_id=$7) OR ($4::boolean AND ($5::boolean OR r.user_id=$7 OR m.reporting_manager_id=$6))) ORDER BY r.report_date DESC,r.report_hour DESC,r.created_at DESC LIMIT 300`,[ctx.companyId,start,today,team,ctx.role==='owner',managerMembershipId,ctx.userId])).rows;
  const summary=(await db.query(`SELECT u.id AS user_id,u.display_name AS employee_name,count(r.id)::int AS updates,count(r.id) FILTER(WHERE r.reviewed_at IS NULL)::int AS waiting_review FROM company_work_reports r JOIN users u ON u.id=r.user_id JOIN company_memberships m ON m.company_id=r.company_id AND m.user_id=r.user_id WHERE r.company_id=$1 AND r.report_date BETWEEN $2::date AND $3::date AND ((NOT $4::boolean AND r.user_id=$5) OR ($4::boolean AND ($6::boolean OR r.user_id=$5 OR m.reporting_manager_id=$7))) GROUP BY u.id,u.display_name ORDER BY u.display_name`,[ctx.companyId,start,today,team,ctx.userId,ctx.role==='owner',managerMembershipId])).rows;
  return {range,scope,from:start,to:today,items,summary,canSeeTeam:ctx.role==='owner'||ctx.permissions.includes('workreports.team'),notice:'These are employee-written updates. The selected hour is self-reported and is not an attendance record, verified time worked or a productivity score.'};
 }));
});
workReports.post('/work-reports',async(req,res)=>{
 v.body(req.body,['operationKey','reportDate','reportHour','workSummary','progress','blockers','nextStep']);const key=v.uuid(req.body.operationKey),reportDate=c.date(req.body.reportDate),reportHour=Number(req.body.reportHour);
 if(!Number.isInteger(reportHour)||reportHour<0||reportHour>23)throw c.badInput('Choose a valid update hour.');
 const workSummary=c.plain(req.body.workSummary,'work summary',800,4),progress=c.plain(req.body.progress||'','progress',800),blockers=c.plain(req.body.blockers||'','blockers',800),nextStep=c.plain(req.body.nextStep||'','next step',500);
 const result=await withCompany(req,'workreports.own',async(db,ctx)=>c.once(db,ctx,key,'employee.work_report.create',{reportDate,reportHour,workSummary,progress,blockers,nextStep},async()=>{
  const now=await indiaDay(db);if(reportDate>now.day||reportDate<shiftDay(now.day,-30)||reportDate===now.day&&reportHour>now.hour)throw c.badInput('Choose an hour from today or the previous 30 days. Future updates are not accepted.');
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[ctx.companyId,ctx.userId+':'+reportDate+':'+reportHour]);
  if((await db.query('SELECT 1 FROM company_work_reports WHERE company_id=$1 AND user_id=$2 AND report_date=$3 AND report_hour=$4',[ctx.companyId,ctx.userId,reportDate,reportHour])).rowCount)throw c.fail('You already saved an update for this hour. Choose a different hour.');
  const id=c.randomUUID();await db.query('INSERT INTO company_work_reports(id,company_id,user_id,operation_key,report_date,report_hour,work_summary,progress,blockers,next_step) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,ctx.companyId,ctx.userId,key,reportDate,reportHour,workSummary,progress,blockers,nextStep]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'work_report.created',target:id,metadata:{reportDate,reportHour}});return {id,message:'Your work update is saved. It is visible to you and your authorized company manager.'};
 }));
 res.status(201).json(result);
});
workReports.post('/work-reports/:id/review',async(req,res)=>{
 v.body(req.body,['note']);const note=c.plain(req.body.note,'review note',800,4),id=v.uuid(req.params.id);
 res.json(await withCompany(req,'workreports.review',async(db,ctx)=>{
  const report=(await db.query('SELECT r.id,r.user_id,r.reviewed_at,m.reporting_manager_id FROM company_work_reports r JOIN company_memberships m ON m.company_id=r.company_id AND m.user_id=r.user_id WHERE r.id=$1 AND r.company_id=$2 FOR UPDATE OF r',[id,ctx.companyId])).rows[0];if(!report)throw new HttpError(404,'NOT_FOUND','Work update not found.');if(ctx.role!=='owner'&&report.reporting_manager_id!==ctx.membershipId)throw new HttpError(403,'PERMISSION_DENIED','Only the owner or the employee\'s assigned reporting manager can review this update.');if(report.user_id===ctx.userId)throw c.badInput('You cannot review your own work update.');if(report.reviewed_at)throw c.fail('This update has already been reviewed.');await db.query('UPDATE company_work_reports SET manager_note=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3 AND company_id=$4',[note,ctx.userId,id,ctx.companyId]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'work_report.reviewed',target:id,metadata:{employeeId:report.user_id}});return {message:'Your supportive review note is saved. This does not change the employee\'s role or access.'};
 }));
});

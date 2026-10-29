import {activeQuotationSql} from '../purchase/active.js';
import {workspaceBlueprint} from '../setup/sia-plan.js';
import * as c from './core.js';
import {managementReport} from './reporting.js';

export function salesPeriods(now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const [year,month]=today.split('-').map(Number),previousEnd=new Date(Date.UTC(year,month-1,0)).toISOString().slice(0,10);
 return {current:{from:today.slice(0,8)+'01',to:today},previous:{from:previousEnd.slice(0,8)+'01',to:previousEnd}};
}

// Read-only composition. Sales keeps the management report's definition rather
// than maintaining a second financial calculation or client-side total.
export async function bossSummary(db,ctx,{report=managementReport,now=new Date()}={}){
 const result={sales:null,activeQuotations:null,team:null};
 if(ctx.role==='owner'&&c.has(ctx,'company.setup.read'))result.workspacePlan=await workspaceBlueprint(db,ctx.companyId);
 if(c.has(ctx,'orders.read')){
  const periods=salesPeriods(now),values=[];
  for(const period of [periods.current,periods.previous]){
   const data=await report(db,ctx,{report:'sales',...period,page:1});
   const metric=data.summary.find(item=>item.label==='Agreed order value incl. recorded tax - not cash received'&&item.format==='money');
   if(!metric||!/^\d+$/.test(metric.value))throw new Error('BOSS_SALES_METRIC_UNAVAILABLE');
   values.push(metric.value);
  }
  result.sales={current:values[0],previous:values[1],periods,definition:'Currently confirmed orders by confirmation date, including recorded tax. Not invoices, profit or cash received. Previous period is a full month; current period is month to date.'};
 }
 if(c.has(ctx,'quotations.read'))result.activeQuotations=(await db.query(`SELECT count(DISTINCT q.quotation_id)::int AS count FROM quotation_versions q WHERE q.company_id=$1 AND ${activeQuotationSql}`,[ctx.companyId])).rows[0].count;
 if(c.has(ctx,'members.read')){
  result.team={activeEmployees:(await db.query("SELECT count(*)::int AS count FROM company_memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND m.role_id<>'owner' AND m.status='active' AND u.status='active'",[ctx.companyId])).rows[0].count,overdueTasks:null};
  if(c.has(ctx,'tasks.manage')&&c.has(ctx,'tasks.own')){
   const b=new c.Bindings(),where=c.scope(ctx,'tasks',b);
   result.team.overdueTasks=(await db.query(`SELECT count(*)::int AS count FROM business_tasks r WHERE ${where.join(' AND ')} AND r.status NOT IN ('completed','cancelled') AND r.due_date<(now() AT TIME ZONE 'Asia/Kolkata')::date`,b.values)).rows[0].count;
  }
 }
 return result;
}

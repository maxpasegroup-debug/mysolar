import {financeSummary} from './finance-ledger.js';
import * as c from './core.js';
import {salesPolicy} from '../people-sales.js';

// Read model only: all links come from saved foreign keys, never email/phone guesses.
// Reuse the operational row scopes, including assigned-only project/task/service access.
export async function customer360(db,ctx,contact,page=1){
 const company=ctx.companyId,id=contact.id,allowed={};
 for(const kind of ['leads','orders','projects','tasks','invoices','service']){
  try{c.readPermission(ctx,kind);allowed[kind]=true;}catch(error){if(error.status!==403)throw error;}
 }
 const b=new c.Bindings(),companyParam=b.add(company),contactParam=b.add(id);
 const sets=[];
 for(const kind of Object.keys(allowed)){
  const where=c.scope(ctx,kind,b);
  where.push(kind==='tasks'?`(r.contact_id=${contactParam} OR EXISTS(SELECT 1 FROM business_orders o WHERE o.id=r.order_id AND o.company_id=r.company_id AND o.contact_id=${contactParam}) OR EXISTS(SELECT 1 FROM installation_projects p WHERE p.id=r.project_id AND p.company_id=r.company_id AND p.contact_id=${contactParam}) OR EXISTS(SELECT 1 FROM service_requests s WHERE s.id=r.service_id AND s.company_id=r.company_id AND s.contact_id=${contactParam}))`:`r.contact_id=${contactParam}`);
  sets.push(`SELECT '${kind}'::text AS kind,r.id FROM ${c.definitions[kind][0]} r WHERE ${where.join(' AND ')}`);
 }
 sets.push(`SELECT 'contacts'::text AS kind,${contactParam}::uuid AS id`);
 const records=`WITH visible AS (${sets.join(' UNION ALL ')})`;
 const result={asOf:new Date().toISOString(),scope:'Current company and your permitted records. Dates use India time. Each list is paginated; totals cover all matching records.',records:{},financial:null};
 const fields={
  leads:'r.pipeline_step,r.id,r.title,r.stage AS status,r.priority,r.next_action,r.follow_up,r.assignee_id,r.created_at',
  orders:'r.id,r.reference,r.status,r.total_paise,r.expected_date,r.owner_id,r.created_at',
  projects:'r.id,r.name,r.reference,r.status,r.scheduled_date,r.manager_id,r.created_at',
  tasks:'r.id,r.title,r.status,r.priority,r.due_date,r.assignee_id,r.created_at',
  invoices:`r.id,r.reference,r.status,r.total_paise,r.due_date,r.created_at,(SELECT settled::text FROM invoice_financial_balances f WHERE f.company_id=r.company_id AND f.id=r.id) AS collected,(SELECT outstanding::text FROM invoice_financial_balances f WHERE f.company_id=r.company_id AND f.id=r.id) AS outstanding`,
  service:'r.id,r.reference,r.status,r.priority,r.follow_up,r.assignee_id,r.created_at'
 };
 for(const kind of Object.keys(allowed)){
  result.records[kind]=await c.paged(db,fields[kind],`FROM ${c.definitions[kind][0]} r`,
   `r.company_id=${companyParam} AND r.id IN (SELECT id FROM (${sets.join(' UNION ALL ')}) visible WHERE kind='${kind}')`,b,page,'r.created_at DESC,r.id');
 }
 if(result.records.leads){const pipeline=(await salesPolicy(db,company)).pipeline;for(const row of result.records.leads.items)row.stage_label=pipeline.find(x=>x.code===row.pipeline_step)?.label||row.status;}
 // Resolve names only from visible records; no user email or unrelated staff directory.
 result.responsible=(await db.query(`${records}, assignments AS (
  SELECT v.kind,r.id,r.assignee_id AS user_id,r.title AS label,r.stage AS status FROM visible v JOIN crm_leads r ON v.kind='leads' AND v.id=r.id AND r.company_id=${companyParam}
  UNION ALL SELECT v.kind,r.id,r.owner_id,r.reference,r.status FROM visible v JOIN business_orders r ON v.kind='orders' AND v.id=r.id AND r.company_id=${companyParam}
  UNION ALL SELECT v.kind,r.id,r.manager_id,r.name,r.status FROM visible v JOIN installation_projects r ON v.kind='projects' AND v.id=r.id AND r.company_id=${companyParam}
  UNION ALL SELECT v.kind,r.id,a.user_id,r.name||' · Project team',r.status FROM visible v JOIN installation_projects r ON v.kind='projects' AND v.id=r.id AND r.company_id=${companyParam} JOIN project_assignments a ON a.project_id=r.id AND a.company_id=r.company_id AND a.user_id<>r.manager_id
  UNION ALL SELECT v.kind,r.id,r.assignee_id,r.title,r.status FROM visible v JOIN business_tasks r ON v.kind='tasks' AND v.id=r.id AND r.company_id=${companyParam}
  UNION ALL SELECT v.kind,r.id,r.assignee_id,r.reference,r.status FROM visible v JOIN service_requests r ON v.kind='service' AND v.id=r.id AND r.company_id=${companyParam})
  SELECT a.*,u.display_name,m.status AS membership_status FROM assignments a JOIN users u ON u.id=a.user_id
  LEFT JOIN company_memberships m ON m.user_id=a.user_id AND m.company_id=${companyParam}
  ORDER BY a.kind,a.label,a.id LIMIT 100`,b.values)).rows;
 result.responsibleLimit=100;
 result.nextActions=(await db.query(`${records}, actions AS (
  SELECT v.kind,r.id,r.title AS label,r.next_action AS action,r.follow_up AS due,r.priority FROM visible v JOIN crm_leads r ON v.kind='leads' AND v.id=r.id AND r.company_id=${companyParam} WHERE r.stage NOT IN ('won','lost') AND (r.next_action<>'' OR r.follow_up IS NOT NULL)
  UNION ALL SELECT v.kind,r.id,r.title,r.title,r.due_date,r.priority FROM visible v JOIN business_tasks r ON v.kind='tasks' AND v.id=r.id AND r.company_id=${companyParam} WHERE r.status NOT IN ('completed','cancelled')
  UNION ALL SELECT v.kind,r.id,r.reference,'Review service follow-up',r.follow_up,r.priority FROM visible v JOIN service_requests r ON v.kind='service' AND v.id=r.id AND r.company_id=${companyParam} WHERE r.status<>'closed' AND r.follow_up IS NOT NULL
  UNION ALL SELECT v.kind,r.id,r.name,'Review installation progress',r.scheduled_date,'normal' FROM visible v JOIN installation_projects r ON v.kind='projects' AND v.id=r.id AND r.company_id=${companyParam} WHERE r.status IN ('pending','active','on_hold') AND r.scheduled_date IS NOT NULL
  UNION ALL SELECT v.kind,r.id,r.reference,'Review outstanding invoice',r.due_date,'normal' FROM visible v JOIN customer_invoices r ON v.kind='invoices' AND v.id=r.id AND r.company_id=${companyParam} WHERE r.status='issued' AND (SELECT outstanding FROM invoice_financial_balances f WHERE f.company_id=r.company_id AND f.id=r.id)>0)
  SELECT *,due<(now() AT TIME ZONE 'Asia/Kolkata')::date AS overdue FROM actions
  ORDER BY due ASC NULLS LAST,CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,kind,id LIMIT 8`,b.values)).rows;
 result.milestones=await c.paged(db,'m.project_id,p.name,m.code,m.status,m.updated_at','FROM project_milestones m JOIN installation_projects p ON p.id=m.project_id AND p.company_id=m.company_id',`m.company_id=${companyParam} AND m.project_id IN (SELECT id FROM (${sets.join(' UNION ALL ')}) visible WHERE kind='projects')`,b,page,'p.created_at DESC,p.id,m.code');
 result.activity=await c.paged(db,'e.id,e.record_type,e.record_id,e.action,e.notes,e.created_at,u.display_name AS actor','FROM operations_events e LEFT JOIN users u ON u.id=e.actor_id',`e.company_id=${companyParam} AND EXISTS(SELECT 1 FROM (${sets.join(' UNION ALL ')}) visible WHERE kind=e.record_type AND id=e.record_id)`,b,page,'e.created_at DESC,e.id DESC');
 result.documents=await c.paged(db,'d.id,d.record_type,d.record_id,d.title,d.reference,d.document_date,d.notes','FROM operations_documents d',`d.company_id=${companyParam} AND EXISTS(SELECT 1 FROM (${sets.join(' UNION ALL ')}) visible WHERE kind=d.record_type AND id=d.record_id)`,b,page,'d.created_at DESC,d.id');
 result.files=await c.paged(db,'f.id,f.record_kind,f.record_id,f.filename,f.mime,f.size,f.created_at','FROM managed_files f',`f.company_id=${companyParam} AND f.deleted_at IS NULL AND f.scan_status='clean' AND EXISTS(SELECT 1 FROM (${sets.join(' UNION ALL ')}) visible WHERE kind=f.record_kind AND id=f.record_id)`,b,page,'f.created_at DESC,f.id');
 if(c.has(ctx,'quotations.read')){
  const qb=new c.Bindings(),cp=qb.add(company),customer=qb.add(contact.user_id),cid=qb.add(id);
  result.quotations=await c.paged(db,'q.id,q.enquiry_id,q.reference,q.version,q.status,q.total_paise,q.valid_until','FROM quotation_versions q LEFT JOIN customer_enquiries e ON e.id=q.enquiry_id',`q.company_id=${cp} AND (q.manual_contact_id=${cid} OR e.customer_id=${customer} OR EXISTS(SELECT 1 FROM business_orders o WHERE o.company_id=${cp} AND o.contact_id=${cid} AND o.quotation_id=q.id) OR EXISTS(SELECT 1 FROM crm_leads l WHERE l.company_id=${cp} AND l.contact_id=${cid} AND l.enquiry_id=q.enquiry_id))`,qb,page,'q.created_at DESC,q.id');
 }
 if(allowed.invoices){
  const pb=new c.Bindings();
  result.payments=await c.paged(db,'x.id,x.invoice_id,i.reference,x.amount_paise,x.method,x.collected_on,x.external_reference,x.reverses_id','FROM customer_collections x JOIN customer_invoices i ON i.id=x.invoice_id AND i.company_id=x.company_id',`i.company_id=${pb.add(company)} AND i.contact_id=${pb.add(id)}`,pb,page,'x.created_at DESC,x.id');
  result.financial=await financeSummary(db,company,id);if(!allowed.orders)Object.assign(result.financial,{contract:null,unbilled:null,overInvoiced:null});
 }
 return result;
}

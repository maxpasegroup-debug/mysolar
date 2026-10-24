import {invoiceBalance} from '../operations/finance-ledger.js';
import {printRecord} from '../print-record.js';
import {Router} from 'express';
import {requireUser} from '../auth/sessions.js';
import {withCustomer,ownEnquiry,quoteRecord,items,customerQuote,effective} from '../purchase/service.js';
import {ownRecord} from '../operations/customer.js';
import {permissionsFor} from '../permissions.js';
import {audit} from '../db/pool.js';
import * as v from '../validation.js';
import {recordExport,csvExport} from './record-export.js';

export const customerRecords=Router();customerRecords.use(requireUser);
const kinds=['quotations','orders','projects','invoices','service'];
const permission=kind=>kind==='quotations'?'customer.quotations.own':kind==='projects'?'customer.installation.own':'customer.orders.own';
customerRecords.get('/journeys/:id',async(req,res)=>{v.body(req.query,[]);const id=v.uuid(req.params.id);res.json(await withCustomer(req,'customer.enquiries.own',async(db,user)=>{
 const enquiry=await ownEnquiry(db,user,id),grants=await permissionsFor(db,'customer');
 const result={enquiry:{id:enquiry.id,title:enquiry.title,status:enquiry.status},quotations:[],orders:[],projects:[],invoices:[],service:[],perSection:20};
 if(grants.includes('customer.quotations.own'))result.quotations=(await db.query(`SELECT q.id,q.reference AS label,q.version,q.total_paise,q.tax_mode,q.estimated,${effective()} AS status FROM quotation_versions q JOIN customer_enquiries e ON e.id=q.enquiry_id WHERE e.id=$1 AND e.customer_id=$2 AND q.status<>'draft' AND NOT EXISTS(SELECT 1 FROM quotation_versions newer WHERE newer.quotation_id=q.quotation_id AND newer.version>q.version AND newer.status<>'draft') ORDER BY q.created_at DESC,q.id LIMIT 20`,[id,user.id])).rows;
 const from="JOIN company_contacts contact ON contact.id=o.contact_id AND contact.company_id=o.company_id JOIN quotation_versions q ON q.id=o.quotation_id AND q.company_id=o.company_id JOIN customer_enquiries e ON e.id=q.enquiry_id";
 if(grants.includes('customer.orders.own'))result.orders=(await db.query(`SELECT o.id,o.reference AS label,o.status,o.customer_confirmed_at,o.acceptance_mode FROM business_orders o ${from} WHERE e.id=$1 AND e.customer_id=$2 AND contact.user_id=$2 AND o.status<>'draft' ORDER BY o.created_at DESC,o.id LIMIT 20`,[id,user.id])).rows;
 for(const [kind,table] of [['projects','installation_projects'],['invoices','customer_invoices'],['service','service_requests']]){
  if(!grants.includes(permission(kind)))continue;
  result[kind]=(await db.query(`SELECT r.id,r.${kind==='projects'?'name':'reference'} AS label,r.status,r.order_id FROM ${table} r JOIN business_orders o ON o.id=r.order_id AND o.company_id=r.company_id AND o.contact_id=r.contact_id ${from} WHERE e.id=$1 AND e.customer_id=$2 AND contact.user_id=$2 AND o.status<>'draft' ${kind==='invoices'?"AND r.status<>'draft'":''} ORDER BY r.created_at DESC,r.id LIMIT 20`,[id,user.id])).rows;
 }
 return result;
}));});
customerRecords.get('/exports/:kind/:id',async(req,res)=>{
 v.body(req.query,['format'],[]);const kind=v.choice(req.params.kind,kinds,'record type'),id=v.uuid(req.params.id),format=v.choice(req.query.format||'json',['json','csv','html'],'export format');
 const data=await withCustomer(req,permission(kind),async(db,user)=>{
  const record=kind==='quotations'?customerQuote(await quoteRecord(db,id,{user})):await ownRecord(db,user,kind,id);
  const lines=kind==='quotations'?await items(db,id):record.terms?.items||record.snapshot?.terms?.items||[];
  const milestones=kind==='projects'?(await db.query('SELECT code,status,updated_at FROM project_milestones WHERE company_id=$1 AND project_id=$2 AND customer_visible ORDER BY position',[record.company_id,id])).rows:[];
  const collections=kind==='invoices'?(await db.query('SELECT amount_paise,method,collected_on,reverses_id FROM customer_collections WHERE company_id=$1 AND invoice_id=$2 ORDER BY created_at,id LIMIT 1000',[record.company_id,id])).rows:[];
  await audit(db,{actor:user.id,action:'customer.record_exported',target:id,metadata:{kind,format}});
  const totals=kind==='invoices'?(await db.query('SELECT coalesce(sum(amount_paise),0)::text AS amount,count(*)::int AS count FROM customer_collections WHERE company_id=$1 AND invoice_id=$2',[record.company_id,id])).rows[0]:null;if(totals){totals.balance=await invoiceBalance(db,record.company_id,id);totals.credits=(await db.query('SELECT reference,amount_paise,posted_on,reverses_id FROM invoice_credit_notes WHERE company_id=$1 AND invoice_id=$2 ORDER BY created_at,id',[record.company_id,id])).rows;totals.refunds=(await db.query('SELECT amount_paise,method,posted_on,reverses_id FROM customer_refunds WHERE company_id=$1 AND invoice_id=$2 ORDER BY created_at,id',[record.company_id,id])).rows;}return recordExport(kind,record,{lines,milestones,collections,totals});
 });
 res.set({'Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="mysolar-${kind}-${id}.${format}"`,'X-Content-Type-Options':'nosniff'});
 if(format==='html'){res.set('Content-Disposition','inline').type('html').send(printRecord(data));return;}
 if(format==='csv')res.type('text/csv; charset=utf-8').send('\uFEFF'+csvExport(data));else res.type('application/json').send(JSON.stringify(data,null,2));
});

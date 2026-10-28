import {policy,requireFeature} from '../commercial/policy.js';
import {audit} from '../db/pool.js';
import * as c from './core.js';
export const credit=c.router();
export async function enforceCredit(db,ctx,order){
 const contact=(await db.query('SELECT credit_hold,credit_limit_paise FROM company_contacts WHERE id=$1 AND company_id=$2',[order.contact_id,ctx.companyId])).rows[0];
 if(contact.credit_hold)throw c.fail('Customer is on credit hold. Ask an authorised finance employee to review the hold before confirmation.');
 if(contact.credit_limit_paise===null)return;
 const balance=(await db.query(`SELECT coalesce(sum(greatest(o.total_paise-coalesce(i.settled,0)-coalesce(a.available,0),0)),0)::text AS exposure FROM business_orders o
 LEFT JOIN (SELECT order_id,company_id,sum(settled) AS settled FROM invoice_financial_balances WHERE status='issued' GROUP BY order_id,company_id) i ON i.order_id=o.id AND i.company_id=o.company_id
 LEFT JOIN (SELECT order_id,company_id,sum(available) AS available FROM advance_financial_balances GROUP BY order_id,company_id) a ON a.order_id=o.id AND a.company_id=o.company_id
 WHERE o.company_id=$1 AND o.contact_id=$2 AND (o.status IN ('confirmed','processing','partially_fulfilled','fulfilled') OR o.id=$3)`,[ctx.companyId,order.contact_id,order.id])).rows[0];
 if(BigInt(balance.exposure)>BigInt(contact.credit_limit_paise))throw c.fail('This confirmation would exceed the recorded customer credit limit. Ask finance to review terms or record actual receipts; no payment is implied.');
}
credit.post('/contacts/:id/credit',async(req,res)=>{
 c.v.body(req.body,['revision','limit','status','reason']);const d=req.body;
 res.json(await c.context(req,async(db,ctx)=>{c.permit(ctx,'finance.manage');requireFeature(await policy(db,ctx.companyId),'finance');const row=await c.record(db,ctx,'contacts',req.params.id,{lock:true});c.expect(row,d.revision);
 const limit=d.limit===''?null:String(c.decimal(d.limit,2,'credit limit',100000000000n)),hold=c.v.choice(d.status,['open','hold'],'credit status')==='hold',reason=c.plain(d.reason,'credit review reason',300,10);
 await db.query('UPDATE company_contacts SET credit_hold=$1,credit_limit_paise=$2,revision=revision+1 WHERE id=$3 AND company_id=$4',[hold,limit,row.id,ctx.companyId]);await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'customer.credit_terms_reviewed',target:row.id,metadata:{reason,previous:{hold:row.credit_hold,limit:row.credit_limit_paise},next:{hold,limit}}});return {message:'Credit controls recorded. No contract, invoice, receipt or bank balance changed.'};
 }));
});

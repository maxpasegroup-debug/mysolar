import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectedFixture} from './helpers/connected-fixture.mjs';
test('operational finance reconciles partial billing, cash, costs and append-only corrections',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,a,b,customer,stranger,companyA,companyB}=await connectedFixture(t),root='/companies/current/operations',f=root+'/finance',why='[TEST] actual supporting record',ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));return r.data;};
 const day=(await db.query("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day")).rows[0].day,q=ok(await a.request('/companies/current/quotations')).items[0];
 const order=ok(await a.request(root+'/orders','POST',{operationKey:randomUUID(),quotationId:q.id,reference:'TEST-FINANCE-ORDER',billingAddress:'[TEST]',serviceAddress:'[TEST]',expectedDate:null,ownerId:a.user.id,acceptanceMode:'in_app'}),201).id;
 ok(await a.request(root+'/orders/'+order+'/actions','POST',{revision:1,action:'request_confirmation',reference:'',notes:why}));ok(await customer.request('/customer/operations/orders/'+order+'/confirm','POST',{revision:2,confirmTerms:true}));ok(await a.request(root+'/orders/'+order+'/actions','POST',{revision:3,action:'confirm',reference:'[TEST]',notes:why}));
 const contact=(await db.query('SELECT contact_id FROM business_orders WHERE id=$1',[order])).rows[0].contact_id;
 const project=ok(await a.request(root+'/projects','POST',{operationKey:randomUUID(),contactId:contact,orderId:order,leadId:null,reference:'TEST-FINANCE-PROJECT',name:'[TEST] project',location:'[TEST]',scope:'',equipment:'',capacity:'',managerId:a.user.id,scheduledDate:null,reason:why}),201).id;
 const read=async(kind,id,person=a)=>ok(await person.request(root+'/record/'+kind+'/'+id));
 const createInvoice=(reference,amount)=>a.request(root+'/invoices','POST',{operationKey:randomUUID(),orderId:order,reference,dueDate:day,amount,label:'[TEST] milestone allocation'});
 const issue=async id=>a.request(root+'/invoices/'+id+'/actions','POST',{revision:(await read('invoices',id)).record.revision,action:'issue',reason:why});
 const payment=(amount,externalReference)=>({operationKey:randomUUID(),amount,method:'bank_transfer',externalReference,postedOn:day,reason:why,confirmRecord:true});
 const reverse=(kind,id)=>a.request(f+'/entries/'+kind+'/'+id+'/reverse','POST',{operationKey:randomUUID(),reason:why});
 let first,second,advance,allocation,credit,refund,bill,expense;
 await t.test('partial drafts retain source snapshots and competing issuance cannot over-invoice',async()=>{
  first=ok(await createInvoice('TEST-PARTIAL-1','40'),201).id;ok(await issue(first));const draft1=ok(await createInvoice('TEST-PARTIAL-2','78'),201).id,draft2=ok(await createInvoice('TEST-PARTIAL-3','78'),201).id;
  const results=await Promise.all([issue(draft1),issue(draft2)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);second=results[0].status===200?draft1:draft2;assert.equal((await createInvoice('TEST-EXCESS','1')).status,409);
  assert.equal((await read('invoices',first)).record.snapshot.allocation.amountPaise,'4000');assert.equal((await read('orders',order)).financial.summary.invoiced,'11800');
 });
 await t.test('advances are liabilities until applied, with exact-payload idempotency and same-order checks',async()=>{
  const payload=payment('30','TEST-ADVANCE');advance=ok(await a.request(f+'/orders/'+order+'/advances','POST',payload),201).id;assert.equal(ok(await a.request(f+'/orders/'+order+'/advances','POST',payload),201).id,advance);assert.equal((await a.request(f+'/orders/'+order+'/advances','POST',{...payload,amount:'31'})).status,409);
  let v=(await read('orders',order)).financial.summary;assert.equal(v.unapplied,'3000');assert.equal(v.collected,'0');
  const apply={operationKey:randomUUID(),advanceId:advance,amount:'30',reason:why,confirmRecord:true};allocation=ok(await a.request(f+'/invoices/'+first+'/apply-advance','POST',apply),201).id;assert.equal(ok(await a.request(f+'/invoices/'+first+'/apply-advance','POST',apply),201).id,allocation);assert.equal((await a.request(f+'/invoices/'+first+'/apply-advance','POST',{...apply,operationKey:randomUUID()})).status,409);
  v=(await read('orders',order)).financial.summary;assert.equal(v.unapplied,'0');assert.equal(v.collected,'3000');assert.equal((await reverse('advances',advance)).status,409);
  assert.equal((await b.request(f+'/invoices/'+first+'/apply-advance','POST',apply)).status,404);
 });
 await t.test('cash collection, credit notes and actual refunds reconcile without fabricated payment status',async()=>{
  ok(await a.request(root+'/invoices/'+first+'/collections','POST',{operationKey:randomUUID(),amount:'10',method:'bank_transfer',externalReference:'TEST-COLLECT',collectedOn:day,reason:why}),201);
  const payload={operationKey:randomUUID(),reference:'TEST-CREDIT',amount:'10',postedOn:day,reason:why,confirmRecord:true};credit=ok(await a.request(f+'/invoices/'+first+'/credits','POST',payload),201).id;assert.equal(ok(await a.request(f+'/invoices/'+first+'/credits','POST',payload),201).id,credit);
  assert.equal((await read('invoices',first)).financial.balance.customer_credit,'1000');assert.equal((await a.request(f+'/refunds','POST',{...payment('11','TEST-EXCESS-REFUND'),invoiceId:first,advanceId:''})).status,409);
  const r={...payment('10','TEST-REFUND'),invoiceId:first,advanceId:''};refund=ok(await a.request(f+'/refunds','POST',r),201).id;assert.equal(ok(await a.request(f+'/refunds','POST',r),201).id,refund);
  const v=(await read('invoices',first)).financial.balance;assert.equal(v.net_invoiced,'3000');assert.equal(v.settled,'3000');assert.equal(v.outstanding,'0');assert.equal(v.customer_credit,'0');
  const own=ok(await customer.request('/customer/operations/record/invoices/'+first));assert.equal(own.collected,'3000');assert.equal(own.outstanding,'0');assert.equal(own.financial.credits.length,1);assert.doesNotMatch(JSON.stringify(own),/actor_id|TEST-COLLECT|supporting record/);
  const exported=ok(await customer.request('/customer/experience/exports/invoices/'+first));assert.equal(exported.collected_paise,'3000');assert.equal(exported.credited_paise,'1000');assert.equal(exported.refunded_paise,'1000');assert.equal(exported.invoiceAllocation.amountPaise,'4000');
 });
 await t.test('posted entries are immutable and reversals preserve originals and balances',async()=>{
  await assert.rejects(db.query('UPDATE invoice_credit_notes SET amount_paise=1 WHERE id=$1',[credit]),{code:'23514'});await assert.rejects(db.query('DELETE FROM customer_refunds WHERE id=$1',[refund]),{code:'23514'});
  ok(await reverse('refunds',refund),201);ok(await reverse('credits',credit),201);assert.equal((await reverse('credits',credit)).status,409);assert.equal((await read('invoices',first)).financial.balance.net_invoiced,'4000');
  ok(await a.request(root+'/collections/'+allocation+'/reverse','POST',{operationKey:randomUUID(),reason:why}));assert.equal((await read('orders',order)).financial.summary.unapplied,'3000');ok(await reverse('advances',advance),201);assert.ok((await read('orders',order)).financial.advanceHistory.some(r=>r.reverses_id===advance));
  const a2=ok(await a.request(f+'/orders/'+order+'/advances','POST',payment('30','TEST-ADVANCE-2')),201).id;ok(await a.request(f+'/invoices/'+first+'/apply-advance','POST',{operationKey:randomUUID(),advanceId:a2,amount:'30',reason:why,confirmRecord:true}),201);
  ok(await a.request(root+'/invoices/'+second+'/collections','POST',{operationKey:randomUUID(),amount:'78',method:'bank_transfer',externalReference:'TEST-FINAL-COLLECT',collectedOn:day,reason:why}),201);
 });
 await t.test('supplier payments are partial, bounded, retry-safe and distinct from recorded costs',async()=>{
  const supplier=ok(await a.request(root+'/suppliers','POST',{operationKey:randomUUID(),name:'[TEST] Supplier',contact:'',email:'',phone:'',address:''}),201).id;
  bill=ok(await a.request(root+'/bills','POST',{operationKey:randomUUID(),supplierId:supplier,purchaseId:'',reference:'TEST-BILL',amount:'23.60',taxMode:'inclusive',taxAmount:'3.60',dueDate:day,evidenceReference:'[TEST] supplier document'}),201).id;
  ok(await a.request(f+'/bills/'+bill+'/project','POST',{operationKey:randomUUID(),projectId:project,reason:why}),201);assert.equal((await a.request(f+'/bills/'+bill+'/project','POST',{operationKey:randomUUID(),projectId:project,reason:why})).status,409);
  const p=payment('10','TEST-SUPPLIER-PAY');const id=ok(await a.request(f+'/bills/'+bill+'/payments','POST',p),201).id;assert.equal(ok(await a.request(f+'/bills/'+bill+'/payments','POST',p),201).id,id);assert.equal((await a.request(f+'/bills/'+bill+'/payments','POST',payment('14','TEST-TOO-MUCH'))).status,409);
  assert.equal((await read('bills',bill)).financial.balance.outstanding,'1360');ok(await reverse('payments',id),201);assert.equal((await read('bills',bill)).financial.balance.outstanding,'2360');await assert.rejects(db.query('UPDATE supplier_bills SET amount_paise=1 WHERE id=$1',[bill]),{code:'23514'});
 });
 await t.test('profitability requires reliable cost inputs and a current explicit completeness review',async()=>{
  let v=(await read('projects',project)).financial;assert.equal(v.profitability,null);
  const body={operationKey:randomUUID(),category:'labour',amount:'11.80',taxAmount:'1.80',externalReference:'TEST-DIRECT-COST',evidenceReference:'[TEST] cost proof',postedOn:day,reason:why,confirmRecord:true};expense=ok(await a.request(f+'/projects/'+project+'/expenses','POST',body),201).id;assert.equal(ok(await a.request(f+'/projects/'+project+'/expenses','POST',body),201).id,expense);
  v=(await read('projects',project)).financial;assert.equal(v.gross,'3540');assert.equal(v.net,'3000');assert.equal(v.profitability,null);assert.equal(v.eligible,true);
  ok(await a.request(f+'/projects/'+project+'/review-costs','POST',{operationKey:randomUUID(),fingerprint:v.fingerprint,reason:why,confirmRecord:true}),201);v=(await read('projects',project)).financial;assert.equal(v.profitability.revenueNet,'10000');assert.equal(v.profitability.marginPaise,'7000');
  const unknown=ok(await a.request(f+'/projects/'+project+'/expenses','POST',{...body,operationKey:randomUUID(),amount:'1',taxAmount:'',externalReference:'TEST-UNKNOWN-COST'}),201).id;v=(await read('projects',project)).financial;assert.equal(v.net,null);assert.equal(v.profitability,null);assert.equal(v.reviewCurrent,false);ok(await reverse('expenses',unknown),201);assert.equal((await read('projects',project)).financial.profitability,null);
 });
 await t.test('company reports, customer 360, dashboard and source ledgers reconcile',async()=>{
  const report=ok(await a.request(f+'/summary')),v=report.totals;assert.equal(v.contract,'11800');assert.equal(v.invoiced,'11800');assert.equal(v.collected,'11800');assert.equal(v.unbilled,'0');assert.equal(v.unapplied,'0');assert.equal(v.cash_received,'11800');assert.equal(v.outstanding,'0');assert.equal(report.payable.outstanding,'2360');
  assert.deepEqual((await read('contacts',contact)).customer360.financial,v);assert.equal(ok(await a.request(root+'/dashboard')).outstanding,'0');assert.equal(ok(await a.request(root+'/list/invoices')).financeReport.totals.cash_received,v.cash_received);
  const source=(await db.query('SELECT sum(settled)::text AS total FROM invoice_financial_balances WHERE company_id=$1 AND status=\'issued\'',[companyA])).rows[0];assert.equal(source.total,v.collected);
 });
 await t.test('tenant, role, CSRF, confirmation, future-date and cross-ledger duplicate safeguards reject direct bypasses',async()=>{
  ok(await a.request('/companies/current/members','POST',{email:stranger.user.email,role:'sales'}),201);ok(await stranger.request('/companies/select','POST',{companyId:companyA}));await stranger.session();assert.equal((await stranger.request(f+'/summary')).status,403);assert.equal((await stranger.request(f+'/refunds','POST',{...payment('1','DENIED'),invoiceId:first,advanceId:''})).status,403);
  assert.equal((await b.request(f+'/bills/'+bill+'/payments','POST',payment('1','FOREIGN'))).status,404);assert.equal((await customer.request(f+'/summary')).status,409);
  assert.equal((await a.request(f+'/bills/'+bill+'/payments','POST',payment('1','CSRF'),{'X-CSRF-Token':'invalid'})).status,403);
  assert.equal((await a.request(f+'/bills/'+bill+'/payments','POST',{...payment('1','NO-CONFIRM'),confirmRecord:false})).status,400);assert.equal((await a.request(f+'/bills/'+bill+'/payments','POST',{...payment('1','FUTURE'),postedOn:'2099-01-01'})).status,400);
  assert.equal((await a.request(f+'/bills/'+bill+'/payments','POST',payment('1','TEST-ADVANCE'))).status,409);
  const count=(await db.query('SELECT count(*)::int AS n FROM supplier_payments WHERE company_id=$1',[companyA])).rows[0].n;assert.equal(count,2);
 });
 await t.test('advance refunds cannot spend the same available balance concurrently',async()=>{
  const another=randomUUID();await db.query("INSERT INTO business_orders(id,company_id,contact_id,reference,terms,total_paise,billing_address,service_address,owner_id,status,acceptance_mode,confirmed_by,confirmed_at,agreement_reference) VALUES($1,$2,$3,'TEST-ADVANCE-ONLY','{}',5000,'[TEST]','[TEST]',$4,'confirmed','external',$4,now(),'[TEST]')",[another,companyA,contact,a.user.id]);
  const ad=ok(await a.request(f+'/orders/'+another+'/advances','POST',payment('20','TEST-ADVANCE-ONLY')),201).id;
  const results=await Promise.all([1,2].map(n=>a.request(f+'/refunds','POST',{...payment('15','TEST-CONCURRENT-REFUND-'+n),invoiceId:'',advanceId:ad})));assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const successful=results.find(r=>r.status===201).data.id;
  assert.equal((await reverse('advances',ad)).status,409);ok(await reverse('refunds',successful),201);ok(await reverse('advances',ad),201);assert.equal((await read('orders',another)).financial.summary.unapplied,'0');
 });
 await t.test('credit corrections cannot over-invoice after replacement invoicing',async()=>{
  const n=ok(await a.request(f+'/invoices/'+second+'/credits','POST',{operationKey:randomUUID(),reference:'TEST-REBILL-CREDIT',amount:'5',postedOn:day,reason:why,confirmRecord:true}),201).id;
  const replacement=ok(await createInvoice('TEST-CREDIT-REPLACEMENT','5'),201).id;ok(await issue(replacement));assert.equal((await reverse('credits',n)).status,409);
  ok(await a.request(root+'/invoices/'+replacement+'/actions','POST',{revision:2,action:'void',reason:why}));ok(await reverse('credits',n),201);
 });
 await t.test('accounting staff can record project costs without gaining project management or owner refund authority',async()=>{
  const member=(await db.query('SELECT id FROM company_memberships WHERE company_id=$1 AND user_id=$2',[companyA,stranger.user.id])).rows[0];ok(await a.request('/companies/current/members/'+member.id,'PATCH',{role:'accounts',status:'active'}));await stranger.session();
  assert.equal((await stranger.request(root+'/record/projects/'+project)).status,403);const report=ok(await stranger.request(f+'/summary'));assert.ok(report.projects.items.some(p=>p.id===project));
  ok(await stranger.request(f+'/projects/'+project+'/expenses','POST',{operationKey:randomUUID(),category:'travel',amount:'2',taxAmount:'0',externalReference:'TEST-ACCOUNTS-COST',evidenceReference:'[TEST] proof',postedOn:day,reason:why,confirmRecord:true}),201);
  assert.equal((await stranger.request(f+'/refunds','POST',{...payment('1','TEST-NO-REFUND-AUTH'),invoiceId:first,advanceId:''})).status,403);assert.equal((await stranger.request(f+'/projects/'+project+'/review-costs','POST',{operationKey:randomUUID(),fingerprint:'invalid',reason:why,confirmRecord:true})).status,403);
 });

});

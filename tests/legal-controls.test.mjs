import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {unitEnvironment} from './helpers/env.mjs';
unitEnvironment();
const {documents,reviewed,publicCatalogue,commercialReady}=await import('../server/legal/catalogue.js');
const {grievanceDeadlines}=await import('../server/legal/routes.js');

test('legal proposals retain approved commercial amounts without inventing tax or annual rates',()=>{
 const content=JSON.stringify(documents);for(const amount of ['3,500','6,999','9,999','35,000'])assert.ok(content.includes(amount));assert.match(content,/web only/);assert.match(content,/No payment mandate is required/);assert.match(content,/Annual prices.*not approved/);
 assert.equal(commercialReady(),false);assert.ok(publicCatalogue().documents.every(d=>d.status==='draft'));assert.equal(documents.length,6);assert.equal(new Set(documents.map(d=>d.digest)).size,6);
});
test('approval is bound to exact content, reviewer evidence and grievance appointment',()=>{
 const d=documents[0],r={grievance:{name:'[TEST]',designation:'[TEST]',email:'officer@example.invalid'},documents:{[d.key]:{digest:d.digest,status:'approved',legalReviewer:'[TEST]',reference:'[TEST]',approvedAt:'2026-01-01T00:00:00Z',effectiveAt:'2026-01-01T00:00:00Z'}}};assert.equal(reviewed(d,r),true);assert.equal(reviewed({...d,digest:'changed'},r),false);assert.equal(reviewed(d,{...r,grievance:null}),false);assert.equal(commercialReady(r),false);
});
test('grievance acknowledgment and calendar-month dates handle end-of-month safely',()=>{
 assert.deepEqual(grievanceDeadlines(new Date('2026-01-31T12:30:00Z')),{acknowledgedBy:'2026-02-02T12:30:00.000Z',resolvedBy:'2026-02-28T12:30:00.000Z'});
});
test('signup agreement uses explicit unselected policy controls and never opts into marketing',()=>{
 const catalogue=publicCatalogue();const context=vm.createContext({window:{Account:{session:{legal:catalogue}}},document:{getElementById:()=>null}});vm.runInContext(readFileSync(new URL('../src/legal-center.js',import.meta.url),'utf8'),context);
 const ui=context.window.LegalConsent;assert.doesNotMatch(ui.fields('customer'),/type="checkbox"/);assert.equal(ui.payload({},'customer'),undefined);
 context.window.Account.session.legal={documents:catalogue.documents.map(d=>({...d,status:'reviewed'}))};assert.match(ui.fields('business'),/type="checkbox" required/);assert.doesNotMatch(ui.fields('business'),/\bchecked\b/);assert.throws(()=>ui.payload({},'business'),/Review and agree/);
 const receipts=JSON.parse(JSON.stringify(ui.payload({legalAgree:'on'},'customer')));assert.equal(receipts.length,3);assert.ok(receipts.every(r=>Object.keys(r).sort().join(',')==='digest,key'));assert.ok(!receipts.some(r=>r.key==='distributor'));
});

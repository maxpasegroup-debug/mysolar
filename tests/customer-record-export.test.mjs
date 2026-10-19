import test from 'node:test';
import assert from 'node:assert/strict';
import {recordExport,csvCell,csvExport} from '../server/customer/record-export.js';
test('customer exports use an allowlist and exclude private notes, credentials and document references',()=>{
 const data=recordExport('orders',{id:'fixture',status:'confirmed',private_notes:'SECRET',agreement_notes:'PRIVATE AGREEMENT',terms:{quote:{reference:'Q1',total_paise:'11800',issuer_snapshot:{name:'Solar company',public_email:'public@example.invalid',api_key:'SECRET'},internal_notes:'SECRET'},items:[]}});
 const json=JSON.stringify(data);assert.doesNotMatch(json,/SECRET|PRIVATE AGREEMENT|api_key|private_notes/);assert.equal(data.commercial.total_paise,'11800');assert.equal(data.issuer.name,'Solar company');
});
test('invoice exports reuse the saved order snapshot and exact net collections',()=>{
 const data=recordExport('invoices',{total_paise:'9007199254740993',snapshot:{terms:{quote:{reference:'Q2',installation_scope:'Equipment only'}}}},{collections:[{amount_paise:'101',method:'cash',reason:'PRIVATE'},{amount_paise:'-1',method:'reversal',reverses_id:'original'}]});
 assert.equal(data.commercial.reference,'Q2');assert.equal(data.collected_paise,'100');assert.equal(data.outstanding_paise,'9007199254740893');assert.equal(data.collections[1].reversal,true);assert.doesNotMatch(JSON.stringify(data),/PRIVATE|original/);
});
test('CSV exports quote newlines, quotes and spreadsheet formula prefixes',()=>{
 for(const value of ['=HYPERLINK("bad")',' +cmd','\t=1','@SUM(1)','-42','\rformula'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('plain "text"'),'"plain ""text"""');assert.equal(csvCell('11800'),'"11800"');assert.match(csvExport({record:{name:'=1',note:'line1\nline2'}}),/"record","name","'=1"/);
});
test('installation exports omit private milestone notes and evidence URLs',()=>{
 const data=recordExport('projects',{name:'Installation'},{milestones:[{code:'survey',status:'done',notes:'PRIVATE',evidence_reference:'https://private.invalid/file'}]});assert.doesNotMatch(JSON.stringify(data),/PRIVATE|private.invalid/);assert.equal(data.milestones[0].status,'done');
});
test('bounded collection exports label truncation and use the authoritative aggregate',()=>{
 const data=recordExport('invoices',{total_paise:'10000'},{collections:[{amount_paise:'100',method:'cash'}],totals:{amount:'2500',count:1001}});assert.equal(data.collectionsTruncated,true);assert.equal(data.collectionCount,1001);assert.equal(data.collected_paise,'2500');assert.equal(data.outstanding_paise,'7500');
});

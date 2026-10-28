import test from 'node:test';import assert from 'node:assert/strict';
import {unitEnvironment} from './helpers/env.mjs';unitEnvironment();
const {csvCell}=await import('../server/operations/finance-export.js');
test('accountant CSV preserves quoted source text and neutralizes formula-like text',()=>{
 assert.equal(csvCell('Customer, "A"'),'"Customer, ""A"""');assert.equal(csvCell('line\nnext'),'"line\nnext"');
 for(const value of ['=1+1','+SUM(A1)','-1+2','@SUM(A1)','  =HYPERLINK("x")'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('-12300',true),'"-12300"');assert.equal(csvCell('0',true),'"0"');assert.equal(csvCell(null),'""');
});

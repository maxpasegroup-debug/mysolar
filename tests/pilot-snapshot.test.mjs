import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCohort,connectionOptions} from '../scripts/pilot-snapshot.mjs';
const company='10000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000001';
const cohort=()=>({version:1,approval:{reference:'test-approval-01',approvedAt:'2026-01-01T00:00:00Z'},window:{start:'2026-01-02T00:00:00Z',end:'2026-01-03T00:00:00Z'},companyIds:[company],customerIds:[customer],participantIds:[customer]});
test('pilot collection requires explicit approval and a bounded, completed observation window',()=>{
 assert.equal(validateCohort(cohort(),Date.parse('2026-01-04')).companyIds[0],company);
 assert.throws(()=>validateCohort({...cohort(),approval:{reference:null,approvedAt:null}}));
 assert.throws(()=>validateCohort({...cohort(),window:{start:'2026-02-30T00:00:00Z',end:'2026-03-03T00:00:00Z'}}));
 assert.throws(()=>validateCohort(cohort(),Date.parse('2026-01-02')));
 assert.throws(()=>validateCohort({...cohort(),approval:{reference:'test-approval-01',approvedAt:'2026-01-03T00:00:00Z'}}));
});
test('pilot collection rejects undeclared identities, duplicate UUIDs and personal-data fields',()=>{
 assert.throws(()=>validateCohort({...cohort(),companyIds:[company,company]}));assert.throws(()=>validateCohort({...cohort(),participantIds:[]}));assert.throws(()=>validateCohort({...cohort(),customerIds:['not-a-uuid']}));assert.throws(()=>validateCohort({...cohort(),email:'private@example.invalid'}));
});
test('local snapshots refuse remote/non-test databases and preserve explicit TLS policy',()=>{
 assert.throws(()=>connectionOptions({DATABASE_URL:'postgresql://unit:unit@remote.invalid/mysolar_test_unit'},true));assert.throws(()=>connectionOptions({DATABASE_URL:'postgresql://unit:unit@localhost/production'},true));assert.throws(()=>connectionOptions({DATABASE_URL:'postgresql://unit:unit@localhost/mysolar_test_unit?sslmode=disable',DATABASE_SSL:'require'},true));
 const config=connectionOptions({DATABASE_URL:'postgresql://unit:unit@localhost/mysolar_test_unit',DATABASE_SSL:'require'},true);assert.deepEqual(config.ssl,{rejectUnauthorized:true});assert.equal(config.application_name,'mysolar-pilot-readonly');
});

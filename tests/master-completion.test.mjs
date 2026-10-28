import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {creationIdentity,prepareCompanyCreation} from '../server/tenancy/company-creation.js';
import {quotationStaffAccess,quotationCustomer,quotationReminderCondition} from '../server/automation/quotation-scope.js';
import {companyNotificationScope} from '../server/purchase/notification-scope.js';
import {dueCondition} from '../server/automation/catalogue.js';

const user='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',key='30000000-0000-4000-8000-000000000001';
const payload={name:'[TEST] Solar company',email:'company@example.invalid',city:'Kozhikode',phone:'',businessPreset:'both',businessType:'both',state:'Kerala',district:'Kozhikode'};
function fake({existing=null,member=true,fingerprint=creationIdentity(user,key,payload).fingerprint,duplicate=false}={}){
 const calls=[];return {calls,async query(sql,args){calls.push({sql,args});assert.match(sql,/^SELECT /);
  if(sql.includes('WHERE id=$1'))return {rows:existing?[existing]:[],rowCount:existing?1:0};
  if(sql.includes('SELECT 1 FROM company_memberships'))return {rows:[],rowCount:member?1:0};
  if(sql.includes('FROM audit_events'))return {rows:fingerprint?[{metadata:{creationFingerprint:fingerprint}}]:[],rowCount:fingerprint?1:0};
  if(sql.includes('JOIN company_memberships'))return {rows:duplicate?[{id:randomUUID()}]:[],rowCount:duplicate?1:0};
  assert.fail('Unexpected query');
 }};
}
test('company retry ID is bound to current user and key, not supplied company identity',()=>{
 const a=creationIdentity(user,key,payload);assert.match(a.id,/^[a-f0-9-]{36}$/);assert.equal(creationIdentity(user,key,payload).id,a.id);assert.notEqual(creationIdentity(other,key,payload).id,a.id);
 assert.notEqual(creationIdentity(user,key,{...payload,city:'Chennai'}).fingerprint,a.fingerprint);assert.throws(()=>creationIdentity(user,'bad-key',payload));assert.notEqual(creationIdentity(user,undefined,payload).id,creationIdentity(user,undefined,payload).id);
});
test('new company request checks duplicates without writing or changing lifecycle',async()=>{
 const db=fake(),result=await prepareCompanyCreation(db,user,key,payload);assert.equal(result.replayed,false);assert.equal(db.calls.length,2);assert.match(db.calls[1].sql,/m.user_id=\$1/);assert.match(db.calls[1].sql,/m.role_id='owner'/);assert.deepEqual(db.calls[1].args,[user,payload.name,payload.email,payload.city]);
});
test('identical retry reuses original company only with current owner membership and original audit digest',async()=>{
 const id=creationIdentity(user,key,payload).id,db=fake({existing:{id,created_by:user}}),result=await prepareCompanyCreation(db,user,key,payload);assert.equal(result.replayed,true);assert.equal(result.id,id);assert.equal(db.calls.length,3);assert.ok(db.calls.every(q=>!q.sql.includes('UPDATE')));
});
test('changed payload, missing audit proof, removed owner and other creator fail closed',async()=>{
 const id=creationIdentity(user,key,payload).id;
 for(const options of [{fingerprint:'wrong'},{fingerprint:null},{member:false},{existing:{id,created_by:other}}]){
  const db=fake({existing:{id,created_by:user},...options});await assert.rejects(prepareCompanyCreation(db,user,key,payload),error=>[403,409].includes(error.status));
 }
});
test('reloaded or legacy form cannot silently create an identical owned company',async()=>{
 for(const retryKey of [key,undefined])await assert.rejects(prepareCompanyCreation(fake({duplicate:true}),user,retryKey,payload),{code:'COMPANY_ALREADY_EXISTS'});
});
test('manual quotation reminders can only target staff with quotation and CRM read access',async()=>{
 const row={manual_contact_id:key,enquiry_id:null};assert.equal(quotationStaffAccess(['quotations.read','crm.read'],row),true);assert.equal(quotationStaffAccess(['quotations.read','leads.read'],row),false);assert.equal(quotationStaffAccess(['crm.read'],row),false);
 let calls=0;assert.equal(await quotationCustomer({query(){calls++;throw Error('Must not infer customer consent');}},row),null);assert.equal(calls,0);
 const marketplace={enquiry_id:key,manual_contact_id:null};assert.equal(quotationStaffAccess(['quotations.read','leads.read'],marketplace),true);assert.equal(await quotationCustomer({async query(sql,args){assert.deepEqual(args,[key]);return {rows:[{user_id:user}]};}},marketplace),user);
});
test('expiry reminder selection includes maintained manual sources and excludes converted/closed work',()=>{
 assert.match(quotationReminderCondition,/c.company_id=r.company_id/);assert.match(quotationReminderCondition,/r.manual_contact_id IS NOT NULL/);assert.match(quotationReminderCondition,/o.company_id=r.company_id/);assert.match(quotationReminderCondition,/o.status<>'cancelled'/);assert.match(dueCondition('quotation'),/valid_until>=/);assert.match(dueCondition('quotation'),/customer_enquiries/);
});
test('notification visibility rechecks current module permission and tenant source for list and read',()=>{
 assert.equal(companyNotificationScope({permissions:[]},'$2'),'(false OR false)');
 const quote=companyNotificationScope({permissions:['quotations.read']},'$2');assert.match(quote,/q.company_id=\$2/);assert.match(quote,/q.id=n.version_id/);assert.doesNotMatch(quote,/enquiry_recipients/);
 const enquiry=companyNotificationScope({permissions:['leads.read']},'$3');assert.match(enquiry,/n.version_id IS NULL/);assert.match(enquiry,/er.company_id=\$3/);assert.doesNotMatch(enquiry,/FROM quotation_versions/);
});

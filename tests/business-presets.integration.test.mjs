import test from 'node:test';
import assert from 'node:assert/strict';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {resolveBusinessPreset,businessPresets} from '../server/setup/presets.js';
import {seedIdentity} from './helpers/identity.mjs';
import {randomUUID} from 'node:crypto';

test('business presets reject unsupported and contradictory capabilities',()=>{
 for(const [preset,type] of Object.entries(businessPresets))assert.deepEqual(resolveBusinessPreset(type,preset),{businessType:type,businessPreset:preset});
 assert.deepEqual(resolveBusinessPreset('installer'),{businessType:'installer',businessPreset:'installer'});
 for(const preset of ['supplier','manufacturer','__proto__',null])assert.throws(()=>resolveBusinessPreset('distributor',preset));
 assert.throws(()=>resolveBusinessPreset('installer','dealer'));
});

test('four presets use one tenant-safe resumable company flow', {skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;
 await env.applyMigrations(db,{through:'034_quotation_sources.sql'});
 const legacyOwner=await seedIdentity(db,{name:'[TEST] Legacy owner',email:'legacy-preset@example.invalid',password:'Fictional legacy password 123!'}),legacyCompany=randomUUID();
 await db.query('INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,$2,$3,$4,$5)',[legacyCompany,'[TEST] Legacy installer','[TEST] City','legacy-business@example.invalid',legacyOwner]);
 await db.query("UPDATE company_profiles SET business_type='installer' WHERE company_id=$1",[legacyCompany]);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='company_profiles' AND column_name='business_preset'")).rows[0].n,0);
 await env.applyMigrations(db);const ledger=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
 assert.deepEqual((await db.query('SELECT business_type,business_preset FROM company_profiles WHERE company_id=$1',[legacyCompany])).rows[0],{business_type:'installer',business_preset:null});
 await env.applyMigrations(db);assert.deepEqual((await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,ledger);
 await env.start();
 const owners=[];
 for(const [preset,type] of Object.entries(businessPresets))await t.test(preset+': create, resume, defaults and activation remain independent',async()=>{
  const owner=env.client();await owner.register('preset-'+preset);
  const created=await owner.request('/companies','POST',{name:'[TEST] '+preset,city:'[TEST] City',email:preset+'@example.invalid',phone:'',businessType:type,businessPreset:preset});assert.equal(created.status,201,JSON.stringify(created.data));
  await owner.session();assert.equal(owner.company.business_preset,preset);assert.equal(owner.company.business_type,type);assert.equal(owner.company.lifecycle,'draft');
  const setup=(await owner.request('/companies/current/setup')).data;assert.equal(setup.profile.business_preset,preset);assert.equal(setup.company.storefront_published,false);assert.equal(setup.onboarding.profile_saved_at,null);
  assert.equal((await owner.request('/companies/current/operations/dashboard')).status,409);
  // Fixture-only independent activation: selecting a preset did not activate it.
  await db.query("UPDATE companies SET lifecycle='active' WHERE id=$1",[owner.company.id]);await owner.session();
  assert.equal((await owner.request('/companies/current/operations/dashboard')).status,200);
  assert.equal(owner.company.business_preset,preset);
  await db.query("UPDATE companies SET lifecycle='draft' WHERE id=$1",[owner.company.id]);await owner.session();
  owners.push(owner);
 });
 const owner=owners[1],before=(await owner.request('/companies/current/setup')).data;
 const input={revision:before.company.revision,legalName:'[TEST] Retail business',displayName:'[TEST] Retail business',businessType:'distributor',businessPreset:'dealer',contactPerson:'[TEST] Owner',email:'retail@example.invalid',phone:'9990000001',address:'[TEST] Address',state:'[TEST] State',district:'[TEST] District',pin:'682001',language:'en',website:''};
 await t.test('profile save persists preset and audit with revision protection',async()=>{
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',input)).status,200);
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',input)).status,409);
  const saved=(await owner.request('/companies/current/setup')).data;assert.equal(saved.profile.business_preset,'dealer');assert.ok(saved.onboarding.profile_saved_at);assert.equal(saved.company.lifecycle,'onboarding');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_events WHERE company_id=$1 AND action='company.business_preset_saved'",[owner.company.id])).rows[0].n,1);
  const legacyInput={...input,revision:saved.company.revision};delete legacyInput.businessPreset;
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',legacyInput)).status,200);
  assert.equal((await owner.request('/companies/current/setup')).data.profile.business_preset,'dealer');
 });
 await t.test('invalid presets, tenant spoofing, CSRF and origin bypass fail',async()=>{
  const revision=(await owner.request('/companies/current/setup')).data.company.revision;
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision,businessPreset:'supplier'})).status,400);
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision,businessPreset:'installer'})).status,400);
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision},{'X-Company-ID':owners[0].company.id})).status,409);
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision},{'X-CSRF-Token':''})).status,403);
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision},{Origin:'https://untrusted.example.invalid'})).status,403);
 });
 await t.test('preset change preserves saved services, role, entitlements and data',async()=>{
  await db.query("UPDATE company_business_profiles SET services=ARRAY['energy_consultation'],rooftop_available=false WHERE company_id=$1",[owner.company.id]);
  const permissions=(await owner.session()).data.permissions;
  const saved=(await owner.request('/companies/current/setup')).data;
  assert.equal((await owner.request('/companies/current/onboarding/profile','PUT',{...input,revision:saved.company.revision,businessType:'installer',businessPreset:'installer'})).status,200);
  await owner.session();assert.equal(owner.company.business_preset,'installer');assert.deepEqual((await owner.session()).data.permissions,permissions);
  const changed=(await owner.request('/companies/current/setup')).data;assert.deepEqual(changed.business.services,['energy_consultation']);assert.equal(changed.business.rooftop_available,false);assert.equal(changed.company.storefront_published,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_subscriptions')).rows[0].n,0);
  const employee=owners[3];await db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES(gen_random_uuid(),$1,$2,'sales')",[owner.company.id,employee.user.id]);
  await db.query('UPDATE sessions SET active_company_id=$1 WHERE user_id=$2',[owner.company.id,employee.user.id]);await employee.session();
  assert.equal((await employee.request('/companies/current/onboarding/profile','PUT',{...input,revision:changed.company.revision})).status,403);
 });
 await t.test('database rejects inconsistent preset classification atomically',async()=>{
  await assert.rejects(db.query("UPDATE company_profiles SET business_preset='dealer' WHERE company_id=$1",[owner.company.id]),e=>e.code==='23514');
  assert.equal((await db.query('SELECT business_preset FROM company_profiles WHERE company_id=$1',[owner.company.id])).rows[0].business_preset,'installer');
 });
 await t.test('concurrent preset edits use the existing company lock and optimistic revision',async()=>{
  const revision=(await owner.request('/companies/current/setup')).data.company.revision;
  const results=await Promise.all([
   owner.request('/companies/current/onboarding/profile','PUT',{...input,revision,businessType:'both',businessPreset:'both'}),
   owner.request('/companies/current/onboarding/profile','PUT',{...input,revision,businessType:'distributor',businessPreset:'dealer'})
  ]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const row=(await db.query('SELECT business_type,business_preset FROM company_profiles WHERE company_id=$1',[owner.company.id])).rows[0];
  assert.equal(businessPresets[row.business_preset],row.business_type);
 });
});

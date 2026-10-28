import test from 'node:test';
import assert from 'node:assert/strict';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('company address selections persist atomically without changing activation or publication',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db);await env.start();
 const owner=env.client();await owner.register('location-owner');
 const payload={name:'[ISOLATED TEST] Address company',city:'Kozhikode',email:'location@example.invalid',phone:'',businessPreset:'both',businessType:'both',countryCode:'IN',state:'Kerala',district:'Kozhikode'};
 const initial=Number((await db.query('SELECT count(*) AS n FROM companies')).rows[0].n);
 for(const invalid of [{countryCode:'US'},{state:'Not a state'},{district:''}])assert.equal((await owner.request('/companies','POST',{...payload,...invalid})).status,400);
 assert.equal(Number((await db.query('SELECT count(*) AS n FROM companies')).rows[0].n),initial);
 const created=await owner.request('/companies','POST',payload);assert.equal(created.status,201,JSON.stringify(created.data));await owner.session();
 const id=created.data.company.id,p=(await db.query('SELECT state,district FROM company_profiles WHERE company_id=$1',[id])).rows[0];assert.deepEqual(p,{state:'Kerala',district:'Kozhikode'});
 assert.equal(created.data.company.storefront_published,false);
 const setup=(await owner.request('/companies/current/setup')).data;
 assert.equal(setup.profile.state,'Kerala');assert.equal(setup.profile.district,'Kozhikode');assert.notEqual(setup.company.lifecycle,'active');
 const profile={revision:setup.company.revision,legalName:payload.name,displayName:payload.name,businessType:'both',businessPreset:'both',contactPerson:'[TEST] Owner',email:payload.email,phone:'9000000001',address:'[TEST] Address',countryCode:'IN',state:'Tamil Nadu',district:'Chennai',pin:'600001',language:'en',website:''};
 const saved=await owner.request('/companies/current/onboarding/profile','PUT',profile);assert.equal(saved.status,200,JSON.stringify(saved.data));
 assert.deepEqual((await db.query('SELECT state,district FROM company_profiles WHERE company_id=$1',[id])).rows[0],{state:'Tamil Nadu',district:'Chennai'});
 assert.equal((await db.query('SELECT city FROM companies WHERE id=$1',[id])).rows[0].city,'Chennai');
 for(const asset of ['/src/india-geography.js','/src/company-location.js'])assert.equal((await fetch(env.base+asset)).status,200);
});

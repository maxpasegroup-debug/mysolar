import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('customer location validation uses shared geography before matching or saving',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const browserScript=process.env.MYSOLAR_LOCATION_BROWSER_SCRIPT;
 const env=await isolatedApp(t,{port:browserScript?3000:0}),{db}=env;await env.applyMigrations(db);await env.start();
 const email='enquiry-location@example.invalid',password=randomBytes(24).toString('base64url');
 await seedIdentity(db,{name:'[TEST] Location customer',email,password,accountType:'customer'});
 const c=env.client();await c.session();assert.equal((await c.request('/auth/login','POST',{email,password,accountType:'customer'})).status,200);await c.session();
 const payload={title:'[TEST] Solar advice',requestedItem:'[TEST] Home solar',categoryId:'',productId:'',offerId:'',quantity:'',unit:'',projectType:'rooftop_home',state:'Kerala',district:'Kozhikode',pin:'673014',locality:'[TEST] town',address:'[TEST] street',requirements:'',contactMethod:'in_app',timeframe:'',mode:'matching',service:'energy_consultation'};
 assert.equal((await c.request('/customer/enquiry-matches','POST',{enquiry:payload,page:1})).status,200);
 for(const fields of [{state:'Unknown'},{state:'Tamil Nadu'},{district:''},{district:'Unknown'},{pin:'012345'}]){
  assert.equal((await c.request('/customer/enquiry-matches','POST',{enquiry:{...payload,...fields},page:1})).status,400);
  assert.equal((await c.request('/customer/enquiries','POST',{...payload,...fields,companyIds:[],submissionKey:randomUUID()})).status,400);
 }
 assert.equal((await db.query('SELECT count(*)::int AS n FROM customer_enquiries')).rows[0].n,0);
 if(browserScript)await (await import(browserScript)).run({env,email,password});
});

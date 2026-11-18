import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {seedIdentity} from './helpers/identity.mjs';

test('051 preserves populated legacy identities, coverage, reviews, enquiries and quotations',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db}=env;await env.applyMigrations(db,{through:'050_direct_subscription_no_trial.sql'});
 const user=await seedIdentity(db,{name:'[TEST] Migration identity',email:'migration-locality@example.invalid',password:'Migration fixture only 123!'}),company=randomUUID(),enquiry=randomUUID(),thread=randomUUID(),quote=randomUUID();
 await db.query("INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,'[TEST] Migration company','Kannur','migration@example.invalid',$2)",[company,user]);
 await db.query("INSERT INTO company_service_areas(id,company_id,scope,label,state,district,pin,locality,state_key,district_key,locality_key) VALUES(gen_random_uuid(),$1,'locality','[TEST] Legacy','Kerala','Kannur','','Payyanur','kerala','kannur','payyanur')",[company]);
 await db.query("INSERT INTO company_reviews(company_id,actor_user_id,kind,previous_state,new_state,reason,revision) VALUES($1,$2,'marketplace','pending','approved','[TEST] Historical review',1)",[company,user]);
 await db.query("INSERT INTO customer_enquiries(id,customer_id,submission_key,title,requested_item,project_type,state,district,pin,locality,address,contact_method,contact_snapshot,distribution_mode,status) VALUES($1,$2,gen_random_uuid(),'[TEST] Legacy enquiry','Advice','advice','Kerala','Kannur','670307','Payyanur','[TEST] Roof','in_app','{}','direct','sent')",[enquiry,user]);
 await db.query("INSERT INTO enquiry_recipients(enquiry_id,company_id,vendor_snapshot) VALUES($1,$2,'{}')",[enquiry,company]);
 await db.query('INSERT INTO enquiry_quotations(id,enquiry_id,company_id) VALUES($1,$2,$3)',[thread,enquiry,company]);
 await db.query("INSERT INTO quotation_versions(id,quotation_id,enquiry_id,company_id,version,reference,valid_until,tax_mode,totals,created_by,status,sent_at) VALUES($1,$2,$3,$4,1,'TEST-LEGACY',current_date+7,'exempt','{}',$5,'sent',now())",[quote,thread,enquiry,company,user]);
 const tables=['users','companies','company_reviews','customer_enquiries','enquiry_recipients','enquiry_quotations','quotation_versions'];
 const snapshot=async()=>{const rows={};for(const table of tables)rows[table]=(await db.query(`SELECT to_jsonb(x) AS row FROM ${table} x ORDER BY to_jsonb(x)::text`)).rows;return rows;};
 const before=await snapshot(),areas=(await db.query('SELECT to_jsonb(a) AS row FROM company_service_areas a')).rows;
 await env.applyMigrations(db);await env.applyMigrations(db);
 assert.deepEqual(await snapshot(),before);assert.deepEqual((await db.query("SELECT to_jsonb(a)-'locality_reference_id' AS row FROM company_service_areas a")).rows,areas);
 assert.equal((await db.query('SELECT locality_reference_id FROM company_service_areas')).rows[0].locality_reference_id,null);
 assert.equal((await db.query('SELECT count(*)::int n FROM postal_localities')).rows[0].n,0);
});

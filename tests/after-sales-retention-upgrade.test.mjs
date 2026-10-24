import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID as id} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {migrationManifest} from '../server/db/migrations.js';

test('retention migration preserves historical closures without manufacturing customer approval',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,applyMigrations}=await isolatedApp(t);await applyMigrations(db,{through:'027_financing_subsidy.sql'});const user=id(),company=id(),contact=id(),service=id();
 await db.query("INSERT INTO users(id,email,display_name,password_hash) VALUES($1,'retention-upgrade@example.invalid','[TEST] Owner','NOT-A-LOGIN-HASH')",[user]);
 await db.query("INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,'[TEST] Company','[TEST] City','fixture@example.invalid',$2)",[company,user]);await db.query("INSERT INTO company_contacts(id,company_id,user_id,kind,name) VALUES($1,$2,$3,'individual','[TEST] Customer')",[contact,company,user]);
 await db.query("INSERT INTO service_requests(id,company_id,contact_id,reference,issue,priority,status,resolution) VALUES($1,$2,$3,'TEST-OLD-SERVICE','[TEST] Issue','normal','closed','PRIVATE-HISTORICAL-RESOLUTION')",[service,company,contact]);
 const original=(await db.query('SELECT * FROM service_requests WHERE id=$1',[service])).rows[0],applied=[];await applyMigrations(db,{onApplied:n=>applied.push(n)});assert.deepEqual(applied,(await migrationManifest()).filter(x=>x.name>'027_financing_subsidy.sql').map(x=>x.name));const current=(await db.query('SELECT * FROM service_requests WHERE id=$1',[service])).rows[0];for(const key of Object.keys(original))assert.deepEqual(current[key],original[key]);assert.equal(current.closure_basis,'legacy');assert.equal(current.resolution_cycle,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM service_feedback')).rows[0].n,0);
 await assert.rejects(db.query('UPDATE service_requests SET escalation_level=4 WHERE id=$1',[service]),{code:'23514'});await assert.rejects(db.query("INSERT INTO service_resolutions(company_id,service_id,cycle,summary,evidence_reference,actor_id) VALUES($1,$2,1,'[TEST]','[TEST]',$3)",[id(),service,user]),{code:'23503'});
 const resolution=(await db.query("INSERT INTO service_resolutions(company_id,service_id,cycle,summary,evidence_reference,actor_id) VALUES($1,$2,1,'[TEST] Shared repair','[TEST] Evidence',$3) RETURNING id",[company,service,user])).rows[0].id;
 await assert.rejects(db.query("INSERT INTO service_feedback(company_id,service_id,resolution_id,actor_id,accepted,rating,comment) VALUES($1,$2,$3,$4,true,6,'[TEST]')",[company,service,resolution,user]),{code:'23514'});
 const other=id();await db.query("INSERT INTO users(id,email,display_name,password_hash) VALUES($1,'retention-other@example.invalid','[TEST] Other','NOT-A-LOGIN-HASH')",[other]);await assert.rejects(db.query("INSERT INTO service_feedback(company_id,service_id,resolution_id,actor_id,accepted,comment) VALUES($1,$2,$3,$4,true,'[TEST]')",[company,service,resolution,other]),{code:'23503'});
 assert.deepEqual((await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,await migrationManifest());const again=[];await applyMigrations(db,{onApplied:n=>again.push(n)});assert.deepEqual(again,[]);
});

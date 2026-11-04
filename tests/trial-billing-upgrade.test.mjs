import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {migrationManifest} from '../server/db/migrations.js';

test('041 to 043 rehearses rollback, retry, checksum enforcement and legacy preservation',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db,applyMigrations}=env;await applyMigrations(db,{through:'041_sia_company_plan.sql'});
 const user=randomUUID(),oldCompany=randomUUID();await db.query("INSERT INTO users(id,email,display_name,password_hash,account_type) VALUES($1,'upgrade@example.invalid','[TEST] Upgrade','not-a-login-hash','business')",[user]);
 const company=id=>db.query("INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,'[TEST] Upgrade company','Test','company@example.invalid',$2)",[id,user]);await company(oldCompany);
 const old=(await db.query('SELECT * FROM companies WHERE id=$1',[oldCompany])).rows[0],ledger=()=>db.query('SELECT name,checksum FROM schema_migrations ORDER BY name');
 const before42=(await ledger()).rows;
 // Deliberate late DDL collision in this disposable schema only.
 await db.query('CREATE TABLE os_billing_events(fixture boolean)');await assert.rejects(applyMigrations(db,{through:'042_business_trial_billing.sql'}),{code:'42P07'});
 assert.deepEqual((await ledger()).rows,before42);assert.equal((await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='registration_challenges' AND column_name='verified_at'")).rowCount,0);
 assert.equal((await db.query("SELECT to_regclass(current_schema()||'.company_os_enrolment') AS table_name")).rows[0].table_name,null);
 await db.query('DROP TABLE os_billing_events');await applyMigrations(db,{through:'042_business_trial_billing.sql'});
 assert.deepEqual((await db.query('SELECT * FROM companies WHERE id=$1',[oldCompany])).rows[0],old);assert.equal((await db.query('SELECT 1 FROM company_os_enrolment WHERE company_id=$1',[oldCompany])).rowCount,0);
 const fresh=randomUUID();await company(fresh);assert.equal((await db.query('SELECT 1 FROM company_os_enrolment WHERE company_id=$1',[fresh])).rowCount,1);
 const before43=(await ledger()).rows;await db.query('CREATE FUNCTION os_billing_purpose_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$');
 await assert.rejects(applyMigrations(db),{code:'42723'});assert.deepEqual((await ledger()).rows,before43);
 assert.equal((await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='os_billing_contracts' AND column_name='purpose'")).rowCount,0);
 assert.equal((await db.query("SELECT to_regclass(current_schema()||'.os_trial_configuration') AS table_name")).rows[0].table_name,null);
 await db.query('DROP FUNCTION os_billing_purpose_immutable()');await applyMigrations(db);
 const manifest=await migrationManifest();assert.deepEqual((await ledger()).rows,manifest);const repeated=[];await applyMigrations(db,{onApplied:name=>repeated.push(name)});assert.deepEqual(repeated,[]);
 const last=manifest.at(-1);await db.query("UPDATE schema_migrations SET checksum='fixture-mismatch' WHERE name=$1",[last.name]);await assert.rejects(applyMigrations(db),/checksum mismatch/);await db.query('UPDATE schema_migrations SET checksum=$1 WHERE name=$2',[last.checksum,last.name]);
 assert.deepEqual((await ledger()).rows,manifest);assert.equal((await db.query('SELECT count(*)::int AS n FROM os_trial_configuration')).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM os_billing_contracts')).rows[0].n,0);
 await env.start();assert.equal((await fetch(env.base+'/readyz')).status,200);
 await db.query("INSERT INTO schema_migrations(name,checksum) VALUES('999_disposable_future.sql','fixture-only')");
 assert.equal((await fetch(env.base+'/readyz')).status,503);await assert.rejects(applyMigrations(db),/not supported by this release/);
 await db.query("DELETE FROM schema_migrations WHERE name='999_disposable_future.sql'");assert.equal((await fetch(env.base+'/readyz')).status,200);
 console.log('Disposable PostgreSQL migration ledger: '+manifest.length+' matching entries through '+last.name+'; repeat no-op; 042/043 failure rollback and retry passed.');
});

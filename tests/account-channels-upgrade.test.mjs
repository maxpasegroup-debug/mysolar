import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID as id} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {migrationManifest} from '../server/db/migrations.js';
test('account-purpose upgrade preserves identities and stops for mixed historical access',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,applyMigrations}=await isolatedApp(t);await applyMigrations(db,{through:'029_management_automation.sql'});const buyer=id(),owner=id(),company=id(),contact=id();
 for(const [uid,email] of [[buyer,'shared-upgrade@example.invalid'],[owner,'business-upgrade@example.invalid']])await db.query("INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,'[TEST] Existing person','NOT-A-LOGIN-HASH')",[uid,email]);
 await db.query("INSERT INTO companies(id,name,city,business_email,created_by) VALUES($1,'[TEST] Company','[TEST] City','company@example.invalid',$2)",[company,owner]);await db.query("INSERT INTO company_memberships(id,company_id,user_id,role_id) VALUES($1,$2,$3,'owner')",[id(),company,owner]);await db.query("INSERT INTO company_contacts(id,company_id,user_id,kind,name) VALUES($1,$2,$3,'individual','[TEST] Mixed customer')",[contact,company,owner]);
 await assert.rejects(applyMigrations(db),{code:'23514'});assert.equal((await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users' AND column_name='account_type'")).rowCount,0);
 // Explicit reviewed fixture correction, never an automatic production reassignment.
 await db.query('UPDATE company_contacts SET user_id=$1 WHERE id=$2',[buyer,contact]);const before=(await db.query('SELECT * FROM users ORDER BY id')).rows,contacts=(await db.query('SELECT * FROM company_contacts')).rows;
 await applyMigrations(db);const after=(await db.query('SELECT * FROM users ORDER BY id')).rows;for(let i=0;i<before.length;i++)for(const k of Object.keys(before[i]))assert.deepEqual(after[i][k],before[i][k]);assert.deepEqual((await db.query('SELECT * FROM company_contacts')).rows,contacts);assert.equal(after.find(u=>u.id===owner).account_type,'business');assert.equal(after.find(u=>u.id===buyer).account_type,'customer');
 await assert.rejects(db.query("INSERT INTO users(id,email,display_name,password_hash,account_type) VALUES($1,'shared-upgrade@example.invalid','[TEST] Separate owner','NOT-A-LOGIN-HASH','business')",[id()]),{code:'23505'});await assert.rejects(db.query("INSERT INTO users(id,email,display_name,password_hash,account_type) VALUES($1,'shared-upgrade@example.invalid','[TEST] Duplicate buyer','NOT-A-LOGIN-HASH','customer')",[id()]),{code:'23505'});
 assert.deepEqual((await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,await migrationManifest());const applied=[];await applyMigrations(db,{onApplied:n=>applied.push(n)});assert.deepEqual(applied,[]);
});

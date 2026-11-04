import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedApp} from './helpers/isolated-app.mjs';
import {cleanupAuthChallenges} from '../server/auth/cleanup.js';

test('challenge cleanup removes expired/consumed proofs and retains active verified signup',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const {db,applyMigrations}=await isolatedApp(t);await applyMigrations(db);
 const owner=randomUUID();await db.query("INSERT INTO users(id,email,display_name,password_hash) VALUES($1,'cleanup@example.invalid','[TEST] Cleanup','fixture-only')",[owner]);
 const ids={};for(const kind of ['active','verified','expired','used']){
  const id=ids[kind]=randomUUID(),expired=kind==='expired',used=kind==='used';
  await db.query("INSERT INTO registration_challenges(id,email,session_hash,code_hash,context,created_at,expires_at,used_at,verified_at) VALUES($1,$2,'fixture-session','fixture-code','encrypted-fixture',now()-interval '1 hour',now()+($3::int*interval '1 minute'),CASE WHEN $4 THEN now() END,CASE WHEN $5 THEN now() END)",[id,kind+'@example.invalid',expired?-1:15,used,kind==='verified']);
  await db.query("INSERT INTO password_reset_challenges(id,user_id,session_hash,code_hash,credential_hash,created_at,expires_at,used_at) VALUES($1,$2,'fixture-session','fixture-code','fixture-credential',now()-interval '1 hour',now()+($3::int*interval '1 minute'),CASE WHEN $4 THEN now() END)",[id,owner,expired?-1:15,used]);
 }
 await db.query('BEGIN');const removed=await cleanupAuthChallenges(db);await db.query('COMMIT');assert.deepEqual(removed,{registration:2,recovery:2});
 assert.deepEqual((await db.query('SELECT id FROM registration_challenges ORDER BY id')).rows.map(r=>r.id).sort(),[ids.active,ids.verified].sort());
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,1);
 await db.query('BEGIN');assert.deepEqual(await cleanupAuthChallenges(db),{registration:0,recovery:0});await db.query('ROLLBACK');
 const {maintainAuthChallenges}=await import('../server/auth/maintenance.js');
 const run=async work=>{await db.query('BEGIN');try{const r=await work(db);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}};
 assert.equal((await maintainAuthChallenges({run})).state,'cleaned');assert.equal((await maintainAuthChallenges({run})).state,'cooldown');
 await db.query("UPDATE process_heartbeats SET last_at=now()-interval '6 minutes' WHERE name='auth_cleanup'");
 assert.equal((await maintainAuthChallenges({run})).state,'cleaned');
});

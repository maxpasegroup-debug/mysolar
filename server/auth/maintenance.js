import {transaction} from '../db/pool.js';
import {cleanupAuthChallenges} from './cleanup.js';

// Reuse the mail worker, with a database lease shared by all its replicas.
// This removes expired/consumed proofs only; it never sends mail or changes accounts.
export async function maintainAuthChallenges({run=transaction}={}){
 return run(async db=>{
  const lock=(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('mysolar-auth-challenge-cleanup')) AS acquired")).rows[0];
  if(!lock.acquired)return {state:'busy'};
  if((await db.query("SELECT 1 FROM process_heartbeats WHERE name='auth_cleanup' AND last_status='cleaned' AND last_at>now()-interval '5 minutes'")).rowCount)return {state:'cooldown'};
  const removed=await cleanupAuthChallenges(db);
  await db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('auth_cleanup',now(),'cleaned') ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status='cleaned'");
  return {state:'cleaned',removed};
 });
}

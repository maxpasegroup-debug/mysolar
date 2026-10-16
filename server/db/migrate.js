import { pool } from './pool.js';
import { applyMigrations } from './migrations.js';
let db;
try{db=await pool.connect();await db.query('SELECT pg_advisory_lock(726431982)');await applyMigrations(db,{onApplied:name=>console.log('Applied migration: '+name)});}
catch{console.error('Migration failed. Check database configuration and migration history. No credentials are logged.');process.exitCode=1;}
finally{if(db){await db.query('SELECT pg_advisory_unlock(726431982)').catch(()=>{});db.release();}await pool.end();}
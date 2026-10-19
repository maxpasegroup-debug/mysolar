import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import {isolatedApp} from './helpers/isolated-app.mjs';
test('disposable database backup restores migration history and fictional records',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async t=>{
 const env=await isolatedApp(t),{db,schema}=env;await env.applyMigrations(db);const url=new URL(process.env.TEST_DATABASE_URL),bin=resolve('.verification/postgres/pgsql/bin'),suffix=process.platform==='win32'?'.exe':'';for(const name of ['pg_dump','pg_restore'])await access(resolve(bin,name+suffix));const directory=resolve('.verification/recovery');await mkdir(directory,{recursive:true});const file=resolve(directory,'fictional-'+randomUUID()+'.dump'),target='mysolar_test_restore_'+randomUUID().replaceAll('-','');assert.match(target,/^mysolar_test_restore_[a-f0-9]+$/);await db.query('CREATE TABLE restore_probe(id integer PRIMARY KEY,value text NOT NULL)');await db.query("INSERT INTO restore_probe VALUES(1,'fictional restore evidence')");
 const processEnv={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1))};
 const dump=spawnSync(resolve(bin,'pg_dump'+suffix),['--format=custom','--schema='+schema,'--file='+file],{env:processEnv,windowsHide:true,encoding:'utf8'});assert.equal(dump.status,0,'Local fictional pg_dump failed');await db.query('CREATE DATABASE "'+target+'"');let restored;
 try{const restore=spawnSync(resolve(bin,'pg_restore'+suffix),['--exit-on-error','--dbname='+target,file],{env:processEnv,windowsHide:true,encoding:'utf8'});assert.equal(restore.status,0,'Local fictional pg_restore failed');const destination=new URL(url);destination.pathname='/'+target;restored=new pg.Client({connectionString:destination.href});await restored.connect();await restored.query('SET search_path TO "'+schema+'",public');assert.equal((await restored.query('SELECT value FROM restore_probe WHERE id=1')).rows[0].value,'fictional restore evidence');assert.deepEqual((await restored.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows,(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows);}finally{if(restored)await restored.end();await db.query('DROP DATABASE "'+target+'"');}
});

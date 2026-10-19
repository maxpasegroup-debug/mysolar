import { spawnSync } from 'node:child_process';
import { mkdir,writeFile,unlink,access,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes,randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import pg from 'pg';

// A new, workspace-local cluster for every run. Never reads Railway or .env credentials.
const base=resolve('.verification/postgres');
const bin=resolve(process.env.POSTGRES_BIN||resolve(base,'pgsql/bin'));
const executable=name=>resolve(bin,name+(process.platform==='win32'?'.exe':''));
for(const name of ['postgres','initdb','pg_ctl'])await access(executable(name));
// Optional explicit filenames allow focused regression runs using the same safe
// cluster lifecycle. Unknown paths cannot escape the test directory.
const available=(await readdir(resolve('tests'))).filter(name=>name.endsWith('.test.mjs'));
const requested=process.argv.slice(2);
if(requested.some(name=>!available.includes(name)))throw new Error('Choose existing test filenames from tests/.');
const specs=(requested.length?requested:available).map(name=>resolve('tests',name));
const cluster=resolve(base,'cluster-'+randomUUID());
if(!cluster.startsWith(base+'\\')&&!cluster.startsWith(base+'/'))throw new Error('Invalid test cluster path');
await mkdir(cluster,{recursive:true});
const password=randomBytes(32).toString('hex'),passwordFile=resolve(base,'bootstrap-password-'+randomUUID());
await writeFile(passwordFile,password,{mode:0o600});
// On Windows a daemon can retain inherited pipe handles after pg_ctl exits.
const run=(name,args,options={})=>{const result=spawnSync(executable(name),args,{windowsHide:true,encoding:'utf8',...(name==='pg_ctl'?{stdio:'ignore'}:{}),...options});if(result.status!==0)throw new Error(name+' failed: '+(result.stderr||result.stdout||'inspect the isolated cluster server.log'));return result;};
const probe=createServer();await new Promise((accept,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',accept);});const port=probe.address().port;await new Promise(accept=>probe.close(accept));
let started=false;
try{
 try{run('initdb',['-D',cluster,'-U','mysolar_test_admin','--auth=scram-sha-256','--pwfile='+passwordFile,'--encoding=UTF8','--locale=C']);}finally{await unlink(passwordFile).catch(()=>{});}
 run('pg_ctl',['-D',cluster,'-l',resolve(cluster,'server.log'),'-o','-h 127.0.0.1 -p '+port,'-w','start']);started=true;
 const connection=new URL('postgresql://127.0.0.1:'+port+'/postgres');connection.username='mysolar_test_admin';connection.password=password;
 const db=new pg.Client({connectionString:connection.href,connectionTimeoutMillis:5000});await db.connect();try{await db.query('CREATE DATABASE mysolar_test_phase1');}finally{await db.end();}
 connection.pathname='/mysolar_test_phase1';
 process.stdout.write('Isolated local PostgreSQL ready. Running tests; credentials are kept in memory.\n');
 const testEnv={...process.env,NODE_ENV:'test',DATABASE_URL:connection.href,TEST_DATABASE_URL:connection.href,SIA_PROVIDER:'disabled'};
 for(const name of ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','SIA_API_KEY','SIA_PROVIDER_URL','SIA_MODEL','SESSION_SECRET','STAGING_MODE','STAGING_ACCESS_USER','STAGING_ACCESS_PASSWORD','STAGING_EMAIL_RECIPIENTS'])delete testEnv[name];
 const result=spawnSync(process.execPath,['--test',...specs],{windowsHide:true,stdio:'inherit',env:testEnv});
 process.exitCode=result.status??1;
}finally{
 if(started)run('pg_ctl',['-D',cluster,'-m','fast','-w','stop']);
 process.stdout.write((started?'Local test cluster stopped.':'Local test cluster did not start.')+' Railway production was not used.\n');
}

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {applyMigrations} from '../../server/db/migrations.js';
import {unitEnvironment} from './env.mjs';

export async function isolatedApp(t) {
 const url=new URL(process.env.TEST_DATABASE_URL);
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.ok(['127.0.0.1','localhost','::1'].includes(url.hostname.replace(/[\[\]]/g,'')));assert.match(decodeURIComponent(url.pathname),/^\/mysolar_test_[a-z0-9_]+$/);
 const db=new pg.Client({connectionString:url.href,connectionTimeoutMillis:3000});await db.connect();
 assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,decodeURIComponent(url.pathname.slice(1)));
 const schema='mysolar_integration_'+randomUUID().replaceAll('-','');let server,pool;
 t.after(async()=>{t.mock.restoreAll();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(pool)await pool.end();try{await db.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');}finally{await db.end();}});
 await db.query('CREATE SCHEMA "'+schema+'"');await db.query('SET search_path TO "'+schema+'",public');
 const original=(await db.query('SELECT version() AS version')).rows[0].version;
 const appUrl=new URL(url);appUrl.searchParams.set('options','-c search_path='+schema+',public');unitEnvironment();process.env.DATABASE_URL=appUrl.href;process.env.INVITATION_DELIVERY='email';
 const start=async()=>{const {app}=await import('../../server/index.js');pool=(await import('../../server/db/pool.js')).pool;server=app.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;};
 let base;
 const client=()=>({cookie:'',csrf:'',user:null,company:null,async request(path,method='GET',body,extra={}){
  const response=await fetch(base+'/api'+path,{method,headers:{Cookie:this.cookie,...(this.user&&path!=='/auth/session'?{'X-Account-ID':this.user.id}:{}),...(path.startsWith('/companies/current')?{'X-Company-ID':this.company?.id||''}:{}),...(['GET','HEAD'].includes(method)?{}:{Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Token':this.csrf}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const cookie=response.headers.getSetCookie()[0];if(cookie)this.cookie=cookie.split(';')[0];const data=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text();if(path==='/auth/session'&&response.ok){this.csrf=data.csrfToken;this.user=data.user;this.company=data.activeCompany;}return {status:response.status,data,headers:response.headers};
 },async session(){return this.request('/auth/session');},async register(name){await this.session();const r=await this.request('/auth/register','POST',{name:'[ISOLATED TEST] '+name,email:name+'@example.invalid',password:'Integration-only password 123!'});assert.equal(r.status,201,JSON.stringify(r.data));await this.session();},async createCompany(name){const r=await this.request('/companies','POST',{name:'[ISOLATED TEST] '+name,city:'Kochi',email:name+'@example.invalid',phone:''});assert.equal(r.status,201,JSON.stringify(r.data));await this.session();await db.query("UPDATE companies SET lifecycle='active' WHERE id=$1",[this.company.id]);await this.session();return this.company.id;}});
 return {db,schema,version:original,client,applyMigrations,async start(){base=await start();return base;},async connection(){const c=new pg.Client({connectionString:appUrl.href});await c.connect();return c;},get base(){return base;}};
}

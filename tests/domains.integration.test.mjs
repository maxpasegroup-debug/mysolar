import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Resolver} from 'node:dns/promises';
import {writeFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {migrationManifest} from '../server/db/migrations.js';
import {isolatedApp} from './helpers/isolated-app.mjs';

test('isolated PostgreSQL: migrations 009–011 and domain security/lifecycle',{skip:!process.env.TEST_DATABASE_URL,timeout:180000},async t=>{
 const env=await isolatedApp(t),{db,schema,applyMigrations}=env;
 let history;
 await t.test('008 upgrades sequentially through 009, 010 and 011 without changing historical checksums',async()=>{
  await applyMigrations(db,{through:'008_commercial.sql'});const before=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
  for(const boundary of ['009_shared_invitations.sql','010_domain_registry.sql','011_pro_network.sql','012_automation.sql'])await applyMigrations(db,{through:boundary});
  await applyMigrations(db);const expected=await migrationManifest();history=(await db.query('SELECT name,checksum,applied_at FROM schema_migrations ORDER BY name')).rows;
  assert.equal(history.length,expected.length);assert.deepEqual(history.map(x=>({name:x.name,checksum:x.checksum})),expected);assert.deepEqual(history.slice(0,8).map(x=>({name:x.name,checksum:x.checksum})),before);
  await applyMigrations(db);assert.deepEqual((await db.query('SELECT name,checksum,applied_at FROM schema_migrations ORDER BY name')).rows,history);
 });
 await t.test('all schema constraints are validated; domain/partner indexes and narrow grants exist',async()=>{
  const indexes=(await db.query('SELECT indexname FROM pg_indexes WHERE schemaname=$1',[schema])).rows.map(x=>x.indexname);
  for(const name of ['domain_hostname_claim','domain_primary_company','domain_company_directory','domain_operation_queue','domain_operation_history','domain_removed_cleanup','partner_pending_email','partner_accepted_pair','memberships_territory'])assert.ok(indexes.includes(name),name);
  const invalid=(await db.query('SELECT conname FROM pg_constraint WHERE connamespace=$1::regnamespace AND NOT convalidated',[schema])).rows;assert.deepEqual(invalid,[]);
  assert.deepEqual((await db.query("SELECT permission_id FROM role_permissions WHERE role_id='part_time_sales' ORDER BY permission_id")).rows.map(x=>x.permission_id),['tasks.own','workspace.read']);
  for(const [role,permission] of [['owner','partners.manage'],['owner','domains.manage'],['platform_admin','platform.domains.manage']])assert.equal((await db.query('SELECT 1 FROM role_permissions WHERE role_id=$1 AND permission_id=$2',[role,permission])).rowCount,1);
  await writeFile('.verification/phase10-migrations.json',JSON.stringify({database:'mysolar_test_phase1',schema,postgresVersion:env.version,migrations:history,checksumsMatch:true,repeatUnchanged:true,invalidConstraints:invalid,indexes:indexes.sort()},null,2));
 });
 const base=await env.start(),a=env.client(),b=env.client(),stranger=env.client();for(const [actor,name] of [[a,'domain-a'],[b,'domain-b'],[stranger,'domain-stranger']])await actor.register(name);
 const companyA=await a.createCompany('domain-company-a'),companyB=await b.createCompany('domain-company-b');
 await t.test('readiness detects missing or changed migration tracking and restores only on exact history',async()=>{
  assert.equal((await fetch(base+'/readyz')).status,200);
  const last=history.at(-1);await db.query('UPDATE schema_migrations SET checksum=$1 WHERE name=$2',['0'.repeat(64),last.name]);
  try{assert.equal((await fetch(base+'/readyz')).status,503);await assert.rejects(applyMigrations(db),/checksum mismatch/);}
  finally{await db.query('UPDATE schema_migrations SET checksum=$1 WHERE name=$2',[last.checksum,last.name]);}
  await db.query('DELETE FROM schema_migrations WHERE name=$1',[last.name]);
  try{assert.equal((await fetch(base+'/readyz')).status,503);}
  finally{await db.query('INSERT INTO schema_migrations(name,checksum,applied_at) VALUES($1,$2,$3)',[last.name,last.checksum,last.applied_at]);}
  assert.equal((await fetch(base+'/readyz')).status,200);
 });
 let registered,body;
 const create=(hostname)=>({hostname,operationKey:randomUUID(),reason:'[ISOLATED TEST] authorized domain registration'});
 const action=async(actor,row,name,extra={})=>actor.request('/companies/current/domains/'+row.id+'/actions','POST',{action:name,operationKey:randomUUID(),revision:row.revision,reason:'[ISOLATED TEST] domain lifecycle transition',...extra});
 const current=async(actor,id)=>{const r=await actor.request('/companies/current/domains/'+id);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.domain;};
 await t.test('pre-billing does not silently allow custom domains; origin/CSRF/permissions block bypasses',async()=>{
  body=create('pilot-a.example.org');assert.equal((await a.request('/companies/current/domains','POST',body)).data.error.code,'ENTITLEMENT_REQUIRED');
  assert.equal((await a.request('/companies/current/domains','POST',body,{'X-CSRF-Token':''})).status,403);
  assert.equal((await a.request('/companies/current/domains','POST',body,{Origin:'https://untrusted.example.org'})).status,403);
  assert.equal((await stranger.request('/platform/domains')).status,403);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM company_domains')).rows[0].n,0);
  // Explicit local fixture policy, never a change to deployed settings or prices.
  await db.query("INSERT INTO commercial_settings_versions(data,effective_at,created_by,reason) SELECT jsonb_set(data,'{features,custom_domain}','true'::jsonb),now(),$1,'[ISOLATED TEST] enable registry for fixture' FROM commercial_settings_versions ORDER BY effective_at DESC,id DESC LIMIT 1",[a.user.id]);
 });
 await t.test('registration is normalized/idempotent; raw proof is returned once and never persisted',async()=>{
  body=create('Pilot-A.Example.ORG.');const r=await a.request('/companies/current/domains','POST',body);assert.equal(r.status,201,JSON.stringify(r.data));registered=r.data;assert.equal(registered.domain.hostname,'pilot-a.example.org');assert.equal(registered.domain.status,'pending');
  const replay=await a.request('/companies/current/domains','POST',body);assert.equal(replay.status,200);assert.equal(replay.data.domain.id,registered.domain.id);assert.equal(replay.data.challenge,undefined);
  assert.equal((await a.request('/companies/current/domains','POST',{...body,hostname:'changed.example.org'})).status,409);
  const stored=(await db.query('SELECT * FROM company_domains WHERE id=$1',[registered.domain.id])).rows[0];assert.notEqual(stored.challenge_hash,registered.challenge.value);assert.doesNotMatch(JSON.stringify((await db.query('SELECT * FROM audit_events')).rows),new RegExp(registered.challenge.value));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM domain_operations WHERE domain_id=$1',[stored.id])).rows[0].n,1);
  assert.equal((await b.request('/companies/current/domains/'+stored.id)).status,404);assert.equal((await a.request('/companies/current/domains','GET',undefined,{'X-Company-ID':companyB})).status,409);
  assert.equal((await a.request('/companies/current/domains','POST',{...create('spoof.example.org'),companyId:companyB})).status,400);
 });
 await t.test('concurrent hostname claims serialize across tenants and produce one durable owner',async()=>{
  const responses=await Promise.all([a,b].map(actor=>actor.request('/companies/current/domains','POST',create('contended.example.org'))));assert.deepEqual(responses.map(x=>x.status).sort(),[201,409]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM company_domains WHERE hostname='contended.example.org' AND status<>'removed'")).rows[0].n,1);
 });
 const dns=new Map();t.mock.method(Resolver.prototype,'resolveTxt',async hostname=>{if(!dns.has(hostname))throw Object.assign(new Error('Isolated DNS proof not found'),{code:'ENODATA'});return dns.get(hostname);});
 const verify=async(actor,row,overrides={})=>actor.request('/companies/current/domains/'+row.id+'/verify','POST',{operationKey:randomUUID(),revision:row.revision,reason:'[ISOLATED TEST] validate TXT ownership',...overrides});
 await t.test('bad DNS proof persists a failed operation; retries are idempotent and cannot become approved',async()=>{
  const input={operationKey:randomUUID(),revision:registered.domain.revision,reason:'[ISOLATED TEST] failed ownership proof'};
  const failed=await verify(a,registered.domain,input);assert.equal(failed.status,400);assert.equal(failed.data.operation.last_error_code,'DNS_PROOF_NOT_FOUND');assert.equal(failed.data.domain.status,'pending');
  dns.set(registered.challenge.name,[[registered.challenge.value]]);const retry=await verify(a,registered.domain,input);assert.equal(retry.status,400);assert.equal(retry.data.replayed,true);assert.equal(retry.data.domain.status,'pending');
 });
 await t.test('expired/stale challenges cannot verify; rotating proof invalidates previous TXT value',async()=>{
  await db.query("UPDATE company_domains SET challenge_expires_at=now()-interval '1 second' WHERE id=$1",[registered.domain.id]);let row=await current(a,registered.domain.id);assert.equal((await verify(a,row)).status,409);
  const fresh=await action(a,row,'challenge');assert.equal(fresh.status,200);assert.notEqual(fresh.data.challenge.value,registered.challenge.value);row=fresh.data.domain;
  assert.equal((await verify(a,row)).status,400);row=await current(a,row.id);dns.set(fresh.data.challenge.name,[[fresh.data.challenge.value]]);
  assert.equal((await verify(a,{...row,revision:row.revision-1})).status,409);
  const verified=await verify(a,row);assert.equal(verified.status,200,JSON.stringify(verified.data));assert.equal(verified.data.domain.status,'verified');registered=verified.data;
 });
 await t.test('verified ownership is not activation; unconfigured provider intentions remain blocked',async()=>{
  let row=await current(a,registered.domain.id);assert.equal((await action(a,row,'activate')).data.error.code,'DOMAIN_ACTIVATION_UNAVAILABLE');
  const setup=await action(a,row,'setup');assert.equal(setup.status,200);assert.equal(setup.data.operation.status,'blocked');assert.equal(setup.data.operation.last_error_code,'DOMAIN_PROVIDER_UNAVAILABLE');
  const primary=await action(a,row,'primary');assert.equal(primary.status,200);assert.equal(primary.data.domain.is_primary,true);row=primary.data.domain;
  await assert.rejects(db.query("UPDATE company_domains SET status='active' WHERE id=$1",[row.id]),e=>e.code==='23514');
  await assert.rejects(db.query("UPDATE company_domains SET hostname='stolen.example.org' WHERE id=$1",[row.id]),e=>e.code==='P0001');
  await assert.rejects(db.query("UPDATE company_domains SET company_id=$1 WHERE id=$2",[companyB,row.id]),e=>e.code==='P0001');
 });
 await t.test('cross-company operation foreign keys and one primary hostname are enforced by PostgreSQL',async()=>{
  const second=await a.request('/companies/current/domains','POST',create('second-a.example.org'));assert.equal(second.status,201);dns.set(second.data.challenge.name,[[second.data.challenge.value]]);const v=await verify(a,second.data.domain);assert.equal(v.status,200);
  await assert.rejects(db.query('UPDATE company_domains SET is_primary=true WHERE id=$1',[v.data.domain.id]),e=>e.code==='23505');
  await assert.rejects(db.query("UPDATE domain_operations SET company_id=$1 WHERE domain_id=$2",[companyB,registered.domain.id]),e=>e.code==='23503');
 });
 await t.test('unknown/spoofed hosts are rejected; eligible local fixtures still cannot serve custom-domain traffic',async()=>{
  const {resolveHostname}=await import('../server/domains/resolution.js');assert.equal(await resolveHostname(db,'pilot-a.example.org'),null);
  // Fixture-only provider observations exercise the deny boundary, not a real provider.
  await db.query("UPDATE company_domains SET status='active',provider='isolated-fixture',provider_hostname_id='fixture-only',provider_hostname_status='active',certificate_status='active',provider_checked_at=now() WHERE id=$1",[registered.domain.id]);
  assert.equal((await resolveHostname(db,'pilot-a.example.org')).company_id,companyA);
  // Undici fetch does not send the supplied Host override. Use an actual raw
  // HTTP authority to exercise Express's received Host header, not fetch's URL.
  const rawHost=host=>new Promise((resolve,reject)=>{const request=httpRequest(base+'/api/auth/session',{headers:{Host:host}},response=>{response.resume();response.on('end',()=>resolve({status:response.statusCode,headers:response.headers}));});request.on('error',reject);request.end();});
  const unknown=await rawHost('unknown.example.org');assert.equal(unknown.status,404);assert.equal(unknown.headers['set-cookie'],undefined);
  const active=await rawHost('pilot-a.example.org');assert.equal(active.status,503);assert.equal(active.headers['set-cookie'],undefined);
  const forwarded=await a.request('/auth/session','GET',undefined,{'X-Forwarded-Host':'pilot-a.example.org',Forwarded:'host=pilot-a.example.org'});assert.equal(forwarded.status,200);assert.equal(forwarded.data.activeCompany.id,companyA);
 });
 await t.test('suspension/removal deny resolution immediately; reassignment needs cleanup and a fresh proof',async()=>{
  let row=await current(a,registered.domain.id);const suspended=await action(a,row,'suspend');assert.equal(suspended.status,200);
  const {resolveHostname}=await import('../server/domains/resolution.js');assert.equal(await resolveHostname(db,'pilot-a.example.org'),null);row=suspended.data.domain;
  const input={operationKey:randomUUID(),revision:row.revision,reason:'[ISOLATED TEST] remove old domain'};const removed=await action(a,row,'remove',input);assert.equal(removed.status,200);assert.equal(removed.data.domain.status,'removed');assert.equal(removed.data.operation.status,'blocked');
  assert.equal((await action(a,row,'remove',input)).data.replayed,true);assert.equal((await b.request('/companies/current/domains','POST',create('pilot-a.example.org'))).status,409);
  await assert.rejects(db.query("UPDATE company_domains SET status='pending',challenge_hash=$1,challenge_expires_at=now()+interval '1 day' WHERE id=$2",['0'.repeat(64),row.id]),e=>e.code==='P0001');
  await db.query("UPDATE company_domains SET provider_hostname_status='removed',certificate_status='removed' WHERE id=$1",[row.id]);
  const claimed=await b.request('/companies/current/domains','POST',create('pilot-a.example.org'));assert.equal(claimed.status,201);assert.notEqual(claimed.data.domain.id,row.id);assert.equal(claimed.data.domain.status,'pending');
  assert.equal((await verify(b,claimed.data.domain)).status,400);dns.set(claimed.data.challenge.name,[[claimed.data.challenge.value]]);assert.equal((await verify(b,await current(b,claimed.data.domain.id))).status,200);
 });
 await t.test('commercial restrictions retain domain reads/removal; only operators can cross company boundaries',async()=>{
  await db.query("INSERT INTO commercial_settings_versions(data,effective_at,created_by,reason) SELECT jsonb_set(data,'{mode}','\"controlled\"'::jsonb),now(),$1,'[ISOLATED TEST] restrict new unassigned actions' FROM commercial_settings_versions ORDER BY effective_at DESC,id DESC LIMIT 1",[a.user.id]);
  assert.equal((await a.request('/companies/current/domains','POST',create('restricted.example.org'))).data.error.code,'ENTITLEMENT_REQUIRED');assert.equal((await a.request('/companies/current/domains')).status,200);
  const row=(await db.query("SELECT id FROM company_domains WHERE hostname='second-a.example.org' AND company_id=$1",[companyA])).rows[0];let retained=await current(a,row.id);const suspended=await action(a,retained,'suspend');assert.equal(suspended.status,200);assert.equal((await action(a,suspended.data.domain,'remove')).status,200);
  assert.equal((await a.request('/platform/domains')).status,403);await db.query("INSERT INTO platform_admin_grants(user_id,reason) VALUES($1,'[ISOLATED TEST] domain operator')",[a.user.id]);
  const directory=await a.request('/platform/domains');assert.equal(directory.status,200);assert.ok(directory.data.items.some(x=>x.company_id===companyB));assert.doesNotMatch(JSON.stringify(directory.data),/challenge_hash|token_hash/);
  const owned=(await db.query("SELECT id FROM company_domains WHERE hostname='pilot-a.example.org' AND company_id=$1 AND status='verified'",[companyB])).rows[0],other=await current(b,owned.id);
  const result=await a.request('/platform/domains/'+other.id+'/actions','POST',{action:'suspend',operationKey:randomUUID(),revision:other.revision,reason:'[ISOLATED TEST] authorized operator suspension'});assert.equal(result.status,200);assert.equal(result.data.domain.status,'suspended');
  assert.equal((await db.query("SELECT 1 FROM audit_events WHERE actor_user_id=$1 AND company_id=$2 AND target_id=$3 AND action='domain.suspend'",[a.user.id,companyB,other.id])).rowCount,1);
  assert.deepEqual((await db.query('SELECT name,checksum,applied_at FROM schema_migrations ORDER BY name')).rows,history);
 });
 await t.test('public static assets are complete and private sources stay unavailable',async()=>{
  const index=await (await fetch(base+'/')).text();const assets=[...index.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)].map(x=>'/'+x[1]);
  for(const path of assets){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok(r.headers.get('content-security-policy'));}
  assert.ok(assets.includes('/src/growth.js'));for(const path of ['/.env','/server/partners/routes.js','/server/db/migrations/011_pro_network.sql','/.git/config'])assert.equal((await fetch(base+path)).status,404,path);
 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { migrationManifest,applyMigrations } from '../server/db/migrations.js';
test('migration manifest: virtual 002 catalogue is ordered between 001 and 003',async()=>{const m=await migrationManifest();assert.equal(m[0].name,'001_identity.sql');assert.equal(m[1].name,'002_role_catalogue_v1');assert.equal(m[2].name,'003_company_setup.sql');assert.equal(new Set(m.map(x=>x.name)).size,m.length);});

test('migration source: LF checkout policy preserves byte-identical checksums across platforms',async()=>{
 assert.match(await readFile(new URL('../.gitattributes',import.meta.url),'utf8'),/^server\/db\/migrations\/\*\.sql text eol=lf$/m);
 for(const item of await migrationManifest())if(item.name.endsWith('.sql'))assert.ok(!(await readFile(new URL('../server/db/migrations/'+item.name,import.meta.url),'utf8')).includes('\r'),item.name+' must use committed LF bytes');
});
test('migration source: historical SQL hashes still match pre-edit baseline',async()=>{const baseline=JSON.parse(await readFile(new URL('./fixtures/migration-checksums.json',import.meta.url),'utf8'));for(const f of baseline){const source=await readFile(new URL('../'+f.file,import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),f.sha256,f.file);}});
test('migration runner contract: changed applied history is rejected, not overwritten',async()=>{const db={query:async sql=>sql.startsWith('SELECT checksum')?{rowCount:1,rows:[{checksum:'different-checksum'}]}:{rowCount:0,rows:[]}};await assert.rejects(applyMigrations(db),/checksum mismatch/);});
test('migration runner contract: unknown partial boundary is rejected before SQL execution',async()=>{let queried=false;await assert.rejects(applyMigrations({query:async()=>{queried=true;}},{through:'made-up.sql'}),/Unknown migration/);assert.equal(queried,false);});

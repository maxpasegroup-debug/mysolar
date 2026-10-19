// Local preparation only: no environment loading, database access or Railway commands.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrationManifest } from '../server/db/migrations.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
const digest=data=>createHash('sha256').update(data).digest('hex');
const rootFiles=new Set(['index.html','offline.html','manifest.webmanifest','sw.js','package.json','package-lock.json','railway.json','scripts/check.mjs']);
const runtime=path=>rootFiles.has(path)||/^[^/]+\.css$/.test(path)||/^(?:server|src|assets)\//.test(path);
// Reviewed Phase 10 runtime changes. Unexpected runtime edits require another review.
const reviewed=new Set(['src/workspace.js','src/account.js','src/operations.js','experience.css','package.json','src/automation.js','server/automation/catalogue.js','server/automation/engine.js','server/automation/routes.js','server/automation/worker.js','server/db/migrations/012_automation.sql','server/sia/tools.js','experience.css','marketplace.css','server/operations/notifications.js','src/experience.js','src/marketplace.js','src/purchase.js','server/customer/experience.js','server/customer/records.js','server/customer/record-export.js','server/marketplace/public.js','server/operations/customer.js','server/purchase/company.js','index.html','styles.css','src/workspace.js','src/account.js','src/app.js','src/operations.js','server/operations/read.js','src/growth.js','src/organization.js','sw.js','server/index.js','server/mail.js','server/staging.js','server/config.js','server/mail-config.js']);
const tracked=git('ls-files','-z').split('\0').filter(Boolean);
const dirty=git('diff','HEAD','--name-only','-z').split('\0').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean);
if(dirty.some(path=>runtime(path)&&!reviewed.has(path))||untracked.some(path=>runtime(path)&&!reviewed.has(path)))throw new Error('Unreviewed runtime changes: stop and review the release scope.');
const paths=[...new Set([...tracked,...untracked.filter(path=>reviewed.has(path))])].filter(runtime).sort();
for(const required of rootFiles)if(!paths.includes(required))throw new Error('Required release file missing.');
const buffers=new Map();
for(const path of paths){
  if(!(await lstat(resolve(root,path))).isFile())throw new Error('Release accepts regular files only.');
  buffers.set(path,await readFile(resolve(root,path)));
}
// Explicit commands in this candidate, without changing the linked production configuration.
const railway=JSON.parse(buffers.get('railway.json').toString('utf8'));
railway.build={...railway.build,buildCommand:'npm run build'};
railway.deploy={...railway.deploy,startCommand:'npm start',preDeployCommand:['npm run db:migrate'],healthcheckPath:'/readyz',healthcheckTimeout:120};
buffers.set('railway.json',Buffer.from(JSON.stringify(railway,null,2)+'\n'));
const migrations=await migrationManifest();
const pins=JSON.parse(await readFile(resolve(root,'tests/fixtures/migration-checksums.json'),'utf8'));
for(const pin of pins)if(migrations.find(item=>'server/db/migrations/'+item.name===pin.file)?.checksum!==pin.sha256)throw new Error('Historical migration checksum mismatch.');
if(migrations.length!==11||pins.length!==10)throw new Error('Review migration inventory before preparing another release.');
const requiredServiceSettings={installCommand:'npm ci --no-audit --no-fund',buildCommand:'npm run build',startCommand:'npm start',preDeployCommand:['npm run db:migrate'],healthcheckPath:'/readyz',healthcheckTimeout:120};
const content={baseCommit:git('rev-parse','HEAD').trim(),runtimeChanges:dirty.filter(runtime).sort(),requiredServiceSettings,migrations,files:paths.map(path=>({path,sha256:digest(buffers.get(path))}))};
const releaseId='phase11-'+digest(JSON.stringify(content)).slice(0,20);
const directory=resolve(root,'.verification/staging-releases',releaseId),app=resolve(directory,'app');
await mkdir(app,{recursive:true});
for(const [path,data] of buffers){const target=resolve(app,path);await mkdir(dirname(target),{recursive:true});try{await writeFile(target,data,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||!(await readFile(target)).equals(data))throw new Error('Existing candidate differs; refuse overwrite.');}}
const manifest={releaseId,...content,stagingTarget:null,deploymentStatus:'NOT_DEPLOYED',configurationOverride:'Candidate railway.json explicitly declares build, start, pre-deploy and readiness for compatible existing services only. New Railway services must use explicit service settings or approved IaC. Required settings are recorded above, not applied. Remote effective configuration still requires verification.'};
const serialized=JSON.stringify(manifest,null,2)+'\n';
try{await writeFile(resolve(directory,'manifest.json'),serialized,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||await readFile(resolve(directory,'manifest.json'),'utf8')!==serialized)throw new Error('Existing manifest differs; refuse overwrite.');}
console.log(JSON.stringify({releaseId,files:paths.length,migrations:migrations.length,directory,stagingTarget:null,deploymentStatus:'NOT_DEPLOYED'},null,2));

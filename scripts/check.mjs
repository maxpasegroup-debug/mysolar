import { readdir,readFile,stat } from 'node:fs/promises';
import { resolve,relative,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
let passed=0,failed=0;
function check(name,ok){if(ok){passed++;process.stdout.write('PASS '+name+'\n');}else{failed++;process.stderr.write('FAIL '+name+'\n');}}
async function files(dir){const items=[];for(const d of await readdir(dir,{withFileTypes:true})){if(['node_modules','.npm-cache','.git','.verification'].includes(d.name)||d.name.startsWith('.env'))continue;const p=resolve(dir,d.name);if(d.isDirectory())items.push(...await files(p));else items.push(p);}return items;}
const inventory=await files(root);
for(const file of inventory.filter(p=>/\.(?:js|mjs)$/.test(p))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});check('syntax '+relative(root,file),result.status===0);if(result.status!==0)process.stderr.write(result.stderr||'Unable to execute Node syntax check.\n');
 const source=await readFile(file,'utf8');const imports=[...source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?(['"])([^'"\n]+)\1/g),...source.matchAll(/\bimport\s*\(\s*(['"])([^'"\n]+)\1/g)];for(const match of imports){const name=match[2];let found=false;try{if(name.startsWith('.'))found=(await stat(resolve(dirname(file),name))).isFile();else{require.resolve(name);found=true;}}catch{}check('import '+relative(root,file)+' → '+name,found);}}
const html=await readFile(resolve(root,'index.html'),'utf8'),server=await readFile(resolve(root,'server/index.js'),'utf8');
for(const match of html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)){const asset=match[1];let exists=false;try{exists=(await stat(resolve(root,asset))).isFile();}catch{}check('HTML asset '+asset,exists);check('server asset allowlist '+asset,server.includes("'"+asset+"'"));}
const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));check('manifest root scope',manifest.scope==='/'&&manifest.start_url==='/#/');
for(const icon of manifest.icons){const name=icon.src.replace(/^\//,'');let data;try{data=await readFile(resolve(root,name));}catch{}check('manifest icon '+name,!!data);if(data&&name.endsWith('.png')){const [w,h]=icon.sizes.split('x').map(Number);check('PNG dimensions '+name,data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.readUInt32BE(16)===w&&data.readUInt32BE(20)===h);}}
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')),lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
check('lockfile root dependencies',JSON.stringify(pkg.dependencies)===JSON.stringify(lock.packages[''].dependencies));
for(const [name,version] of Object.entries(pkg.dependencies)){let installed;try{installed=JSON.parse(await readFile(resolve(root,'node_modules',name,'package.json'),'utf8'));}catch{}check('installed dependency '+name,installed?.version===version);}
const migrations=inventory.filter(f=>/server[\\/]db[\\/]migrations[\\/]\d+.*\.sql$/.test(f)).map(f=>relative(root,f));check('migration 001 present',migrations.some(f=>f.includes('001_identity.sql')));check('migration 008 present',migrations.some(f=>f.includes('008_commercial.sql')));
process.stdout.write(`Static results: ${passed} passed, ${failed} failed.\n`);process.exitCode=failed?1:0;

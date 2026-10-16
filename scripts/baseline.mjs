import { readdir,readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve,relative } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),target=resolve(root,'.verification/baseline.json');
try{await access(target);throw new Error('A baseline already exists; refusing to overwrite it.');}catch(error){if(error.code!=='ENOENT')throw error;}
const items=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules','.npm-cache','.verification'].includes(entry.name)||entry.name.startsWith('.env'))continue;const p=resolve(dir,entry.name);if(entry.isDirectory())await walk(p);else items.push({file:relative(root,p).replaceAll('\\','/'),sha256:createHash('sha256').update(await readFile(p)).digest('hex')});}}
await walk(root);await mkdir(resolve(root,'.verification'),{recursive:true});await writeFile(target,JSON.stringify({createdAt:new Date().toISOString(),files:items},null,2));process.stdout.write(`Recorded ${items.length} non-secret source/document hashes.\n`);

import { readdir,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { roleDefinitions } from '../permissions.js';
const directory=new URL('./migrations/',import.meta.url),digest=value=>createHash('sha256').update(value).digest('hex');
const catalogue={name:'002_role_catalogue_v1',checksum:digest(JSON.stringify(roleDefinitions))};
export async function migrationManifest(){const records=[];for(const name of (await readdir(directory)).filter(n=>/^\d+.*\.sql$/.test(n)).sort()){records.push({name,checksum:digest(await readFile(new URL(name,directory),'utf8'))});if(name==='001_identity.sql')records.push(catalogue);}return records;}
export async function applyMigrations(db,{through=null,onApplied=()=>{}}={}){
 const manifest=await migrationManifest();if(through&&!manifest.some(x=>x.name===through))throw new Error('Unknown migration boundary');
 await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const item of manifest){const found=await db.query('SELECT checksum FROM schema_migrations WHERE name=$1',[item.name]);if(found.rowCount){if(found.rows[0].checksum!==item.checksum)throw new Error('Applied migration checksum mismatch');}else{await db.query('BEGIN');try{if(item.name===catalogue.name){for(const [id,role] of Object.entries(roleDefinitions)){await db.query('INSERT INTO roles(id,scope,label) VALUES($1,$2,$3)',[id,role.scope,role.label]);for(const permission of role.permissions){await db.query('INSERT INTO permissions(id,scope) VALUES($1,$2) ON CONFLICT DO NOTHING',[permission,role.scope]);await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)',[id,permission]);}}}else await db.query(await readFile(new URL(item.name,directory),'utf8'));await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[item.name,item.checksum]);await db.query('COMMIT');onApplied(item.name);}catch(error){await db.query('ROLLBACK');throw error;}}if(item.name===through)break;}
}

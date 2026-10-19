import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool} from '../db/pool.js';
import {migrationManifest} from '../db/migrations.js';
import {tick} from './engine.js';

export async function ready(){const expected=await migrationManifest(),rows=(await pool.query('SELECT name,checksum FROM schema_migrations')).rows;return expected.every(item=>rows.some(row=>row.name===item.name&&row.checksum===item.checksum));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let stopping=false;const controller=new AbortController();for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;controller.abort();});
 try{
  if(!await ready())throw new Error('Automation migrations are unavailable');
  do{try{const result=await tick();console.log(JSON.stringify({event:'reminder_worker_tick',...result}));}catch{console.error(JSON.stringify({event:'reminder_worker_failed'}));if(process.argv.includes('--once')){process.exitCode=1;break;}}
   if(process.argv.includes('--once')||stopping)break;try{await delay(30000,undefined,{signal:controller.signal});}catch{}
  }while(!stopping);
 }catch{console.error(JSON.stringify({event:'reminder_worker_start_blocked'}));process.exitCode=1;}
 finally{await pool.end();}
}

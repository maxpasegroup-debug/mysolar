import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool} from './db/pool.js';
import {monitorTick} from './operations-health.js';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let stopped=false;const controller=new AbortController();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});try{do{try{console.log(JSON.stringify({event:'monitor_checked',...await monitorTick()}));}catch{console.error(JSON.stringify({event:'monitor_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}if(stopped||process.argv.includes('--once'))break;try{await delay(60000,undefined,{signal:controller.signal});}catch{}}while(!stopped);}finally{await pool.end();}}

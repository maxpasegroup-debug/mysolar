import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool} from './db/pool.js';
import {mailTick} from './mail-queue.js';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let stopped=false;const controller=new AbortController();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});try{do{try{const result=await mailTick();console.log(JSON.stringify({event:'mail_worker',...result}));}catch{console.error(JSON.stringify({event:'mail_worker_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}if(stopped||process.argv.includes('--once'))break;try{await delay(5000,undefined,{signal:controller.signal});}catch{}}while(!stopped);}finally{await pool.end();}}

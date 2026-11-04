import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool} from './db/pool.js';
import {mailTick} from './mail-queue.js';
import {maintainAuthChallenges} from './auth/maintenance.js';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let stopped=false,lastCleanupAttempt=0;const controller=new AbortController();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});try{do{if(Date.now()-lastCleanupAttempt>=300000){lastCleanupAttempt=Date.now();try{console.log(JSON.stringify({event:'auth_cleanup',...await maintainAuthChallenges()}));}catch{console.error(JSON.stringify({event:'auth_cleanup_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}}try{const result=await mailTick();console.log(JSON.stringify({event:'mail_worker',...result}));}catch{console.error(JSON.stringify({event:'mail_worker_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}if(stopped||process.argv.includes('--once'))break;try{await delay(5000,undefined,{signal:controller.signal});}catch{}}while(!stopped);}finally{await pool.end();}}

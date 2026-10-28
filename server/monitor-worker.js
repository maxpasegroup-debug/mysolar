import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {pool} from './db/pool.js';
import {monitorTick} from './operations-health.js';
import {config} from './config.js';
import {mailTransport} from './mail.js';
import {probeAvailability,fallbackNotifier} from './monitor-probes.js';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let stopped=false;const controller=new AbortController();
 const fallback=fallbackNotifier({send:async()=>{
  if(!config.opsAlertsEnabled||!mailTransport||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.opsAlertRecipient))throw Error('Alerting unavailable');
  await mailTransport.sendMail({from:config.mailFrom,to:config.opsAlertRecipient,subject:'MY Solar operations alert: MONITOR_CHECK_FAILED',text:'The monitoring worker could not complete its database checks. Inspect database connectivity and safe service logs. This alert bypasses the database queue; it does not identify the cause or include customer records.'});
 }});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});
 try{do{
  try{const availability=await probeAvailability(config.origin);console.log(JSON.stringify({event:'monitor_checked',availability,...await monitorTick({availability})}));}
  catch{console.error(JSON.stringify({event:'monitor_failed',fallback:await fallback()}));if(process.argv.includes('--once'))process.exitCode=1;}
  if(stopped||process.argv.includes('--once'))break;
  try{await delay(60000,undefined,{signal:controller.signal});}catch{}
 }while(!stopped);}finally{await pool.end();}
}

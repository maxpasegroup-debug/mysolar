import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,access,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {unitEnvironment} from '../tests/helpers/env.mjs';
import {publicCatalogue} from '../server/legal/catalogue.js';
unitEnvironment();
const {app}=await import('../server/index.js'),{pool}=await import('../server/db/pool.js');
const dir=resolve('.verification/legal-browser');await mkdir(dir,{recursive:true});let executable;for(const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'])try{await access(candidate);executable=candidate;break;}catch{}if(!executable)throw Error('Local Chromium unavailable');
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+resolve(dir,'profile-'+process.pid),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let diagnostics='';browser.stderr.on('data',chunk=>diagnostics+=chunk);let ws,counter=0,checks=[],exceptions=[],marketingPayload=null,admin=false;const pending=new Map(),user='00000000-0000-4000-8000-000000000001',caseId='00000000-0000-4000-8000-000000000002';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok)=>{checks.push({name,passed:Boolean(ok)});console.log((ok?'PASS ':'FAIL ')+name);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value;};
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(50);}throw Error('Legal page condition timed out');}
try{
 for(let n=0;n<200&&!/DevTools listening on (ws:\/\/[^\s]+)/.test(diagnostics);n++)await delay(50);const match=diagnostics.match(/DevTools listening on ws:\/\/127.0.0.1:(\d+)/);if(!match)throw Error('Browser debugger unavailable');
 const targets=await(await fetch('http://127.0.0.1:'+match[1]+'/json/list')).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
 ws.addEventListener('message',async event=>{const data=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());if(data.id){const task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(Error('CDP request failed')):task.resolve(data.result);}return;}if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params.exceptionDetails.text);if(data.method==='Fetch.requestPaused'){
  const r=data.params.request,path=new URL(r.url).pathname;let body;
  if(path==='/api/auth/session')body={user:{id:user,accountType:'business'},csrfToken:'fictional-only',platformPermissions:admin?['platform.audit.read','platform.commercial.settings']:[]};
  else if(path==='/api/legal/documents')body=publicCatalogue();
  else if(path==='/api/legal/me')body={receipts:[],marketingEmail:false,accountType:'business',grievances:[{id:caseId,created_at:'2026-10-30T00:00:00Z',metadata:{category:'privacy',message:'[TEST] <img src=x onerror=alert(1)>',reference:'fictional',acknowledgedBy:'2026-11-01',resolvedBy:'2026-11-30'},progress:{state:'submitted'}}]};
  else if(path==='/api/legal/marketing'){marketingPayload=JSON.parse(r.postData);body={enabled:marketingPayload.enabled,changed:true};}
  else if(path==='/api/platform/legal/grievances')body={items:[{id:caseId,metadata:{category:'privacy',message:'[TEST] Officer queue',reference:'fictional'},progress:{state:'submitted'}}]};
  else body={error:{message:'Unsupported fictional browser request'}};
  await send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
 }});
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*'}]});
 for(const width of [360,390,768,1024,1280,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768}).catch(()=>send('Emulation.setDeviceMetricsOverride',{}));
  await send('Page.navigate',{url:base+'/legal'});await wait('!!document.querySelector("#legal-marketing")');
  check('legal centre has no horizontal overflow '+width,await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  check('marketing unchecked and draft acceptance unavailable '+width,await evaluate('!document.querySelector("#legal-marketing input").checked && !document.querySelector("#legal-accept")'));
  check('saved grievance is escaped and offers real copy route '+width,await evaluate(`!document.querySelector('#legal-centre img') && !!document.querySelector('a[href$="/receipt"]')`));
 }
 await evaluate('(()=>{const f=document.querySelector("#legal-marketing");f.elements.enabled.checked=true;f.requestSubmit();})()');await wait('document.querySelector("#legal-feedback").textContent.includes("saved")');check('explicit marketing action sends only enabled boolean',marketingPayload?.enabled===true&&Object.keys(marketingPayload).length===1);
 admin=true;await send('Page.navigate',{url:base+'/legal'});await wait('!!document.querySelector("[data-legal-case]")');check('authorised platform queue exposes controlled officer workflow',await evaluate('document.querySelector("[data-legal-case] select").options.length===1 && document.querySelector("[data-legal-case] select").value==="acknowledged"'));
 check('no uncaught legal page browser exceptions',exceptions.length===0);
}catch(error){check('focused legal browser execution',false);console.log(error.message);}
finally{await writeFile(resolve(dir,'results.json'),JSON.stringify({checks,exceptions,scope:'Fictional intercepted APIs only; no database or external delivery'},null,2));ws?.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
console.log('Focused legal browser results: '+checks.filter(c=>c.passed).length+' passed, '+checks.filter(c=>!c.passed).length+' failed.');process.exitCode=checks.some(c=>!c.passed)?1:0;

import {setupCatalogue} from '../server/setup/sia-plan.js';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,access,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {unitEnvironment} from '../tests/helpers/env.mjs';
import {publicCatalogue} from '../server/legal/catalogue.js';
unitEnvironment();
const {app}=await import('../server/index.js'),{pool}=await import('../server/db/pool.js');
const dir=resolve('.verification/onboarding-browser');await mkdir(dir,{recursive:true});let executable;for(const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'])try{await access(candidate);executable=candidate;break;}catch{}if(!executable)throw Error('Local Chromium unavailable');
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+resolve(dir,'profile-'+process.pid),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let diagnostics='';browser.stderr.on('data',chunk=>diagnostics+=chunk);let ws,counter=0,checks=[],exceptions=[],signedIn=false,signup={},lastRequest=null,draft=null,revision=null;const pending=new Map(),user='00000000-0000-4000-8000-000000000001',caseId='00000000-0000-4000-8000-000000000002';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok)=>{checks.push({name,passed:Boolean(ok)});console.log((ok?'PASS ':'FAIL ')+name);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value;};
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(50);}throw Error('Onboarding page condition timed out');}
try{
 for(let n=0;n<200&&!/DevTools listening on (ws:\/\/[^\s]+)/.test(diagnostics);n++)await delay(50);const match=diagnostics.match(/DevTools listening on ws:\/\/127.0.0.1:(\d+)/);if(!match)throw Error('Browser debugger unavailable');
 const targets=await(await fetch('http://127.0.0.1:'+match[1]+'/json/list')).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
 ws.addEventListener('message',async event=>{const data=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());if(data.id){const task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(Error('CDP request failed')):task.resolve(data.result);}return;}if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params.exceptionDetails.text);if(data.method==='Fetch.requestPaused'){
  const r=data.params.request,path=new URL(r.url).pathname;let body,status=200;

  if(r.method==='POST'||r.method==='PUT')lastRequest={path,body:JSON.parse(r.postData||'{}')};
  const permissions=['profile.read','enquiries.own','quotations.own','orders.own','service.own'];
  if(path==='/api/auth/session')body={user:signedIn?{id:user,name:signup.name,email:signup.email,accountType:signup.accountType,emailVerified:true}:null,companies:[],activeCompany:null,permissions:[],customerPermissions:permissions,platformPermissions:[],csrfToken:'fixture-only',recoveryAvailable:true,legal:publicCatalogue()};
  else if(path==='/api/auth/register'&&r.method==='POST'){signup=JSON.parse(r.postData);body={challenge:caseId,message:'[FIXTURE] Queued; delivery unconfirmed.'};status=202;}
  else if(path==='/api/auth/register/confirm'){if(JSON.parse(r.postData).otp!=='12345678'){status=400;body={error:{code:'INVALID_SIGNUP_CODE',message:'[FIXTURE] Code is invalid.'}};}else{signedIn=true;body={message:'[FIXTURE] Verified and signed in.'};status=201;}}
  else if(path==='/api/auth/register/status')body={state:'retry',message:'[FIXTURE] Email is retrying; inbox delivery is not confirmed.'};
  else if(path==='/api/auth/setup-draft'&&r.method==='PUT'){draft=JSON.parse(r.postData).draft;revision='1';body={revision};}
  else if(path==='/api/auth/setup-draft')body={catalogue:setupCatalogue,revision,draft};
  else if(path==='/api/customer/experience/overview')body={permissions,support:{phone:'+918136906653',chatUrl:'https://wa.me/918136906653'},home:{state:'new',asOf:new Date().toISOString(),enquiry:null},companies:[],sections:[],notifications:[],activity:[],unreadCount:0};
  else if(path==='/api/public/products')body={items:[],categories:[],total:0,page:1,pageSize:20};
  else body={items:[],unread:0,unreadCount:0,categories:[],total:0};
  await send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
 }});
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*'}]});

 for(const audience of ['customer','distributor'])for(const width of [360,390,768,1024,1280,1440]){
  signedIn=false;signup={};draft=null;revision=null;
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await evaluate('window.__navigationPending=true');await send('Page.navigate',{url:base+'/'});await wait("window.__navigationPending!==true && typeof Onboarding!=='undefined' && !Account.session.loading");
  await evaluate('Onboarding.open('+JSON.stringify(audience)+')');await wait('!!document.querySelector("[data-onboarding-form] [name=password]")');
  check('shared SIA popup fits '+audience+' '+width,await evaluate('!!document.querySelector("#onboarding-dialog [data-sia-orb]") && document.documentElement.scrollWidth<=innerWidth+2 && document.querySelectorAll("dialog[open]").length===1'));
  await evaluate('(()=>{const f=document.querySelector("[data-onboarding-form]");f.elements.name.value="[FIXTURE] New user";f.elements.email.value="signup@example.invalid";f.elements.password.value="Fixture password 123!";f.requestSubmit();})()');await wait('!!document.querySelector("[data-onboarding-form] [name=otp]")');
  check('correct purpose and credentials precede OTP '+audience+' '+width,signup.accountType===(audience==='distributor'?'business':'customer')&&signup.password==='Fixture password 123!');
  check('OTP step clears password and has no false delivery claim '+audience+' '+width,await evaluate('!document.querySelector("[data-onboarding-form] [name=password]") && !Account.user && document.querySelector("[name=otp]").maxLength===8'));
  await evaluate('document.querySelector("[data-signup-delivery]").click()');await wait('document.querySelector("[data-signup-status]").textContent.includes("retrying")');
  await evaluate('(()=>{const f=document.querySelector("[data-onboarding-form]");f.elements.otp.value="00000000";f.requestSubmit();})()');await wait('document.querySelector("#ob-feedback").textContent.includes("invalid")');
  check('wrong OTP stays signed out with accessible error '+audience+' '+width,await evaluate('!Account.user && document.querySelector("#onboarding-dialog [data-sia-orb]").dataset.state==="error"'));
  await evaluate('(()=>{const f=document.querySelector("[data-onboarding-form]");f.elements.otp.value="12345678";f.requestSubmit();})()');await wait('location.hash==="#/'+audience+'/dashboard" && !!Account.user && !document.querySelector("dialog[open]")');
  if(audience==='distributor')await wait('!!document.querySelector(".welcome-workspace")');else await wait('!!document.querySelector(".cd-hero") || document.querySelector("main")?.textContent.includes("How can we help")');
  check('OTP opens real appropriate dashboard without company creation '+audience+' '+width,await evaluate('Account.session.companies.length===0 && !Account.activeCompany && !document.querySelector(".ob-success") && document.documentElement.scrollWidth<=innerWidth+2'));
  if(audience==='distributor'&&width===390){
   await evaluate('location.hash="#/distributor/onboarding"');await wait('!!document.querySelector("#account-company-create [data-save-setup-draft]")');
   await evaluate('document.querySelector("#account-company-create [name=name]").value="[FIXTURE] Resume company";document.querySelector("[data-save-setup-draft]").click()');await wait('document.querySelector(".scs-draft-status").textContent.includes("saved")');
   check('saving setup keeps credentials out of draft payload',!JSON.stringify(lastRequest.body).includes('Fixture password')&&lastRequest.path==='/api/auth/setup-draft');
   await evaluate('window.__navigationPending=true');await send('Page.reload');await wait("window.__navigationPending!==true && typeof Account!=='undefined' && !Account.session.loading");await wait('document.querySelector("#account-company-create [name=name]")?.value==="[FIXTURE] Resume company"');
   check('private setup resumes after a full page reload',await evaluate('document.querySelector("#account-company-create").dataset.draftRevision==="1" && !Account.activeCompany'));
  }
 }
 signedIn=false;await evaluate('window.__navigationPending=true');await send('Page.navigate',{url:base+'/'});await wait("window.__navigationPending!==true && typeof Onboarding!=='undefined' && !Account.session.loading");await evaluate('Onboarding.open("customer");document.querySelector("[data-ob-switch=distributor]").click();document.querySelector("[data-sia-motion]").click()');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait('!Onboarding.isOpen()');check('paused shared modal still closes with Escape',await evaluate('!document.body.classList.contains("ob-modal-open")'));
 await evaluate('Onboarding.open("customer")');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});check('reduced motion stops orb animation',await evaluate('getComputedStyle(document.querySelector(".sia-orb-core")).animationName==="none"'));
 check('no uncaught onboarding JavaScript exceptions',exceptions.length===0);
}catch(error){check('focused onboarding browser execution',false);console.log(error.message);try{console.log(await evaluate('JSON.stringify({hash:location.hash,user:Account.user,feedback:document.querySelector("#ob-feedback")?.textContent,open:Onboarding.isOpen(),main:document.querySelector("main")?.textContent.slice(0,150),exceptions:0})'));}catch{}}
finally{await writeFile(resolve(dir,'results.json'),JSON.stringify({checks,exceptions,scope:'Fictional intercepted APIs only; no database or external delivery'},null,2));ws?.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
console.log('Focused onboarding browser results: '+checks.filter(c=>c.passed).length+' passed, '+checks.filter(c=>!c.passed).length+' failed.');process.exitCode=checks.some(c=>!c.passed)?1:0;

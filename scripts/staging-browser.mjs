import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

export async function stagingBrowser({origin,authorization}){
 if(origin!=='https://mysolar-staging.up.railway.app'||!authorization)throw Error('Explicit staging target required');
 const output=resolve('.verification/staging-browser');await mkdir(output,{recursive:true});const profile=resolve(output,'profile-'+process.pid);
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws;const checks=[],errors=[];const check=(name,passed)=>{checks.push({name,passed:!!passed});console.log((passed?'PASS ':'FAIL ')+name);};
 try{
  let port;for(let i=0;i<150;i++){try{port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{}await delay(100);}if(!port)throw Error('Browser startup unavailable');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');let id=0;const pending=new Map();
  ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Runtime.exceptionThrown')errors.push('Uncaught browser exception');if(data.id&&pending.has(data.id)){const item=pending.get(data.id);pending.delete(data.id);clearTimeout(item.timer);data.error?item.reject(Error('Browser command failed')):item.resolve(data.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('Browser command timed out'));},25000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error('Browser evaluation failed');return result.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setExtraHTTPHeaders',{headers:{Authorization:authorization}});
  for(const width of [360,390,768,1024,1280,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
   for(const path of ['/#/','/#/products','/#/customer/login','/#/distributor/login']){
    await send('Page.navigate',{url:origin+path});await delay(700);
    for(let i=0;i<80;i++){if(await evaluate("document.readyState==='complete'&&document.querySelector('main')!==null"))break;await delay(100);}
    check(width+' '+path+' renders application',await evaluate("!!document.querySelector('main')&&document.body.innerText.length>100"));
    check(width+' '+path+' avoids horizontal overflow',await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
    if(path==='/#/'){
     const mobile=await evaluate("!!document.querySelector('[data-ph-mobile]')?.getClientRects().length");
     if(mobile){await evaluate("document.querySelector('[data-ph-mobile]').click()");check(width+' mobile menu opens',await evaluate("document.querySelector('[data-ph-mobile]').getAttribute('aria-expanded')==='true'"));await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});check(width+' Escape closes mobile menu',await evaluate("document.querySelector('[data-ph-mobile]').getAttribute('aria-expanded')==='false'"));}
     await writeFile(resolve(output,'landing-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
   }
  }
  check('no uncaught browser exceptions',errors.length===0);
  const report={checks,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,origin};await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');return report;
 }finally{ws?.close();browser.kill();}
}

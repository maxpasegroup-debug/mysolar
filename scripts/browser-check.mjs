import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { unitEnvironment } from '../tests/helpers/env.mjs';
unitEnvironment();
const {app}=await import('../server/index.js'),{pool}=await import('../server/db/pool.js');
const output=resolve('.verification/browser');await mkdir(output,{recursive:true});
const candidates=[process.env.BROWSER_EXECUTABLE,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);let executable;for(const p of candidates)try{await access(p);executable=p;break;}catch{}if(!executable)throw new Error('BLOCKED: Chromium/Edge executable is unavailable.');
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,profile=resolve(output,'profile-'+process.pid),checks=[],errors=[];
const diagnostics=[];
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});browser.stderr.on('data',data=>{if(diagnostics.length<30)diagnostics.push(data.toString().slice(0,500));});
let ws,growthFixture=null;
const fixtureUser='20000000-0000-4000-8000-000000000001',fixtureCompany='10000000-0000-4000-8000-000000000001',fixtureStaff='20000000-0000-4000-8000-000000000002';
function growthData(path){
 if(growthFixture==='automation'){
  const catalogue=[['followup','Lead follow-ups','leads'],['quotation','Quotation expiry','quotations'],['milestone','Installation milestones','projects'],['collection','Invoice follow-ups','invoices'],['service','Service follow-ups','service']].map(([kind,label,recordKind])=>({kind,label,recordKind,message:'[LOCAL FIXTURE] Review the saved date and source record.'}));
  const company={id:fixtureCompany,name:'[LOCAL FIXTURE] Solar company',role:'owner',role_label:'Owner',lifecycle:'active',status:'active',brand:{}};
  if(path==='/api/auth/session')return {user:{id:fixtureUser,name:'[LOCAL FIXTURE] Owner',email:'owner@example.invalid'},companies:[company],activeCompany:company,permissions:['workspace.read','automation.read','automation.manage','company.setup.read','crm.read','finance.read'],customerPermissions:['customer.profile'],platformPermissions:[],csrfToken:'fixture-only',recoveryAvailable:false};
  if(path==='/api/companies/current/automation')return {catalogue,rules:[],jobs:[{id:fixtureCompany,kind:'followup',record_id:fixtureCompany,audience:'staff',channel:'in_app',status:'dead',attempts:5,last_error:'DELIVERY_FAILED',created_at:new Date().toISOString(),available_at:new Date().toISOString()}],counts:[{status:'dead',count:1}],attempts:[{job_id:fixtureCompany,attempt:5,outcome:'dead',code:'DELIVERY_FAILED',created_at:new Date().toISOString()}],worker:null,page:1,pageSize:20,total:1,canManage:true,deliveryMeaning:'In-app only. Delivered does not mean read.'};
  if(path==='/api/reminders/preferences')return {enabled:true,kinds:catalogue.map(row=>row.kind),catalogue,channel:'in_app',description:'Optional automated in-app reminders.'};
  return null;
 }
 if(growthFixture==='customer-journey'){
  const id=fixtureCompany,product={id,name:'[LOCAL FIXTURE] Solar equipment',kind:'product',unit:'unit',attributes:{},attribute_schema:{},image_urls:[]},offer={id,product_id:id,company_id:id,vendor_name:'[LOCAL FIXTURE] Solar company',price_mode:'request_quote',availability:'unknown',tax_mode:'unknown',coverage_labels:['682001']};
  const quote={id,enquiry_id:id,reference:'[LOCAL FIXTURE] QUOTE',version:1,issuer_snapshot:{name:'[LOCAL FIXTURE] Solar company'},total_paise:'11800',totals:{tax:'1800'},tax_mode:'exclusive',valid_until:'2026-12-31',quote_date:'2026-10-19',installation_paise:'0',delivery_paise:'0',installation_scope:'Equipment only',effective_status:'sent'};
  if(path==='/api/auth/session')return {user:{id:fixtureUser,name:'[LOCAL FIXTURE] Customer',email:'customer@example.invalid'},companies:[],activeCompany:null,permissions:[],customerPermissions:['customer.profile','customer.enquiries.own','customer.quotations.own','customer.orders.own','customer.installation.own'],platformPermissions:[],csrfToken:'fixture-only',recoveryAvailable:false};
  if(path==='/api/customer/experience/journeys/'+id)return {enquiry:{id,title:'[LOCAL FIXTURE] Home solar request',status:'preferred'},quotations:[{id,label:quote.reference,status:'preferred',total_paise:'11800'}],orders:[{id,label:'[LOCAL FIXTURE] Order',status:'confirmed'}],projects:[{id,label:'[LOCAL FIXTURE] Installation',status:'active'}],invoices:[{id,label:'[LOCAL FIXTURE] Invoice',status:'issued'}],service:[{id,label:'[LOCAL FIXTURE] Service',status:'received'}],perSection:20};
  if(path==='/api/customer/experience/documents/orders/'+id)return {kind:'orders',id,title:'[LOCAL FIXTURE] Order',hasSnapshot:true,fileAvailable:false,exportFormats:['json','csv'],message:'Generated record exports are available. Uploaded files are not configured.'};
  if(path==='/api/public/products/'+id)return {product,offers:{items:[offer],total:1,page:1,pageSize:20}};
  if(path==='/api/public/products')return {items:[{...product,offer_count:1}],total:1,page:1,pageSize:20,categories:[]};
  if(path==='/api/customer/enquiry-options')return {product,vendor:null,categories:[],profile:{phone:''},submissionKey:id};
  if(path==='/api/customer/comparison')return {enquiry:{id,title:'[LOCAL FIXTURE] Home solar request'},quotations:[{quote,items:[],assistance:{questions:['Confirm installation scope'],notices:[]}}]};
  return null;
 }
 if(['owner-today','employee-today','setup'].includes(growthFixture)){
  const employee=growthFixture==='employee-today',setup=growthFixture==='setup',company={id:fixtureCompany,name:'[LOCAL FIXTURE] Solar company',role:employee?'field_engineer':'owner',role_label:employee?'Field engineer':'Owner',status:'active',lifecycle:setup?'onboarding':'active',brand:{}};
  const permissions=employee?['workspace.read','tasks.own','projects.assigned']:['workspace.read','company.read','company.setup.read','company.setup.manage','customers.read','customers.manage','crm.read','crm.manage','quotations.read','quotations.manage','members.read','invitations.manage','tasks.own','finance.read'];
  if(path==='/api/auth/session')return {user:{id:fixtureUser,name:'[LOCAL FIXTURE] User',email:'user@example.invalid'},companies:[company],activeCompany:company,permissions,customerPermissions:[],platformPermissions:[],csrfToken:'fixture-only',recoveryAvailable:false};
  if(path==='/api/companies/current/operations/dashboard')return {cards:[{kind:'tasks',label:'Assigned tasks',value:0}],events:[],priorities:[],outstanding:employee?null:'0',asOf:new Date().toISOString(),scope:'Fictional browser fixture; database behavior tested separately.',gettingStarted:employee?{}:{customers:0,leads:0,quotations:0,employees:0}};
  if(path==='/api/companies/current/setup')return {company:{...company,revision:1},profile:{business_type:'installer'},brand:{},business:{services:[],service_areas:[],rooftop_available:false,preferred_contact:'email',marketplace_requested:false},onboarding:{profile_saved_at:'2026-10-01',brand_saved_at:'2026-10-01'},history:[],members:[],activity:[],defaults:{},logoHosts:[]};
  return null;
 }
 const enabled=growthFixture==='pro',access={enabled,priceLabel:'₹5,999 + GST/month'},permissions=['workspace.read','company.read','company.setup.read','members.read','members.manage','invitations.manage','partners.read','partners.manage','tasks.own','tasks.manage'];
 if(path==='/api/auth/session')return {user:{id:fixtureUser,name:'[LOCAL BROWSER FIXTURE] Owner',email:'owner@example.invalid'},companies:[{id:fixtureCompany,name:'[LOCAL BROWSER FIXTURE] Company',role:'owner',role_label:'Owner',status:'active',lifecycle:'active',brand:{}}],activeCompany:{id:fixtureCompany,name:'[LOCAL BROWSER FIXTURE] Company',role:'owner',role_label:'Owner',status:'active',lifecycle:'active',brand:{}},permissions,customerPermissions:[],platformPermissions:[],csrfToken:'fixture-only',recoveryAvailable:false};
 if(path==='/api/companies/current/team')return {growth:access,members:[{id:'30000000-0000-4000-8000-000000000001',user_id:fixtureUser,name:'[LOCAL BROWSER FIXTURE] Owner',email:'owner@example.invalid',role:'owner',status:'active'},{id:'30000000-0000-4000-8000-000000000002',user_id:fixtureStaff,name:'[LOCAL BROWSER FIXTURE] Executive',email:'executive@example.invalid',role:'part_time_sales',status:'suspended',staff_details:{state:'Kerala',city:'Kochi',territory:'Ernakulam'},staff_revision:1}],invitations:[],events:[],assignableRoles:['sales','supervisor','field_engineer','inventory_manager','accounts','part_time_sales'],available:true,emailAvailable:false,readOnly:false};
 if(path==='/api/companies/current/partners')return {access,page:1,items:[],incoming:[],employees:[],events:[]};
 return null;
}
const check=(name,ok,detail='')=>{checks.push({name,passed:!!ok,detail});process.stdout.write((ok?'PASS ':'FAIL ')+name+(detail?' · '+detail:'')+'\n');};
try{
 let port;for(let i=0;i<400;i++){try{port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{}await delay(100);}if(!port)throw new Error('Browser debugging endpoint did not start.');
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=targets.find(x=>x.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);await once(ws,'open');let id=0;const pending=new Map();ws.addEventListener('error',()=>diagnostics.push('Browser WebSocket error'));ws.addEventListener('close',()=>diagnostics.push('Browser WebSocket closed'));ws.addEventListener('message',async event=>{const data=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);if(data.method==='Fetch.requestPaused'){try{const request=data.params.request,value=growthFixture&&request.method==='GET'?growthData(new URL(request.url).pathname):null;if(growthFixture){await send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:value?200:503,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(value||{error:{code:'LOCAL_FIXTURE_ONLY',message:'This browser fixture does not perform business actions.'}})).toString('base64')});}else await send('Fetch.continueRequest',{requestId:data.params.requestId});}catch(error){errors.push(error.message);}}if(data.id&&pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);clearTimeout(p.timer);data.error?p.reject(new Error(data.error.message)):p.resolve(data.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(new Error('Browser command timed out: '+method));},45000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Browser state timed out: '+expression);};
 const navigate=async hash=>{await send('Page.navigate',{url:base+'/#'+hash});await wait(`typeof currentPath!=='undefined' && currentPath===${JSON.stringify(hash.split('?')[0])} && document.querySelector('main')?.textContent.trim().length>0`);await delay(150);};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 for(const route of ['/distributor/dashboard?demo=1','/customer/dashboard?demo=1','/customer/compare?demo=1','/customer/installation?demo=1','/sia?demo=1','/states']){await navigate(route);check('desktop route '+route,await evaluate(`document.querySelector('h1').textContent.trim().length>0`));}
 await writeFile(resolve(output,'desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await navigate('/distributor/projects?demo=1');check('mobile workspace avoids page-level horizontal overflow',await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
 await evaluate(`document.querySelector('.mobile-toggle').click()`);check('workspace menu opens as modal and preserves main isolation',await evaluate(`document.querySelector('.sidebar.open')?.getAttribute('aria-modal')==='true' && document.getElementById('main').hasAttribute('inert')`));await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});check('Escape closes workspace menu',await evaluate(`!document.getElementById('main').hasAttribute('inert')`));
 await navigate('/customer/login');await wait(`document.getElementById('account-login')!==null`);await evaluate(`document.querySelector('#account-login [name=email]').value='verification@example.invalid'`);
 await evaluate(`document.querySelector('[data-ph-mobile]').click()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});check('public menu preserves typed login form',await evaluate(`document.querySelector('#account-login [name=email]').value==='verification@example.invalid'`));
 for(const language of ['ml','ta','en']){await evaluate(`document.getElementById('language').value='${language}';document.getElementById('language').dispatchEvent(new Event('change',{bubbles:true}))`);check('language '+language+' preserves form and sets document language',await evaluate(`document.documentElement.lang==='${language}' && document.querySelector('#account-login [name=email]').value==='verification@example.invalid'`));}
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await wait(`navigator.onLine===false && !document.querySelector('.offline-banner').hidden`);check('offline notification preserves typed form',await evaluate(`document.querySelector('#account-login [name=email]').value==='verification@example.invalid'`));await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await wait('navigator.onLine');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});check('keyboard Tab reaches an interactive element',await evaluate(`document.activeElement!==document.body`));
 await writeFile(resolve(output,'mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await navigate('/products');await wait(`document.querySelector('.account-state')!==null`);check('unavailable public catalogue does not display fictional vendors as real content',await evaluate(`!document.querySelector('main').textContent.includes('Sunfield') && document.querySelector('main').textContent.includes('open this view')`));
 await wait(`!!navigator.serviceWorker.controller`);const keys=await evaluate(`(async()=>{const names=await caches.keys(),out=[];for(const name of names){const c=await caches.open(name);for(const r of await c.keys())out.push(new URL(r.url).pathname);}return out;})()`);check('real browser worker cache excludes private APIs and app navigation',keys.every(x=>!x.startsWith('/api')&&x!=='/'&&x!=='/index.html'),keys.length+' public static entries');
 // Read-only fictional fixtures verify rendering/controls; real backend and
 // authorization behavior is covered by the isolated PostgreSQL integrations.
 await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*',requestStage:'Request'}]});
 for(const mode of ['pro','expired']){
  growthFixture=mode;await evaluate('Account.refresh()');
  for(const width of [360,390,768,1024,1280,1440])for(const route of ['/distributor/partners','/distributor/team']){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await evaluate('Account.invalidate()');await navigate(route);await wait(`document.querySelector('[data-growth="${route.endsWith('team')?'executive':'partner'}"]')!==null`);
   check(`${mode} ${route} at ${width}px avoids horizontal overflow`,await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
   check(`${mode} ${route} creation control matches eligibility at ${width}px`,await evaluate(`document.querySelector('[data-growth="${route.endsWith('team')?'executive':'partner'}"]').closest('fieldset').disabled===${mode!=='pro'}`));
  }
  await navigate('/distributor/team');await wait(`document.querySelector('.org-member-form')!==null`);
  check(mode+' executive activation control matches eligibility',await evaluate(`document.querySelector('.org-member-form select[name=status] option[value=active]').disabled===${mode!=='pro'}`));
  check(mode+' executive task assignment link matches eligibility',await evaluate(`!!document.querySelector('.growth-grid a[href="#/distributor/new?kind=tasks"]')===${mode==='pro'}`));
  await writeFile(resolve(output,mode+'-team.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 check('growth views do not introduce private API or navigation cache entries',await evaluate(`(async()=>{for(const name of await caches.keys()){for(const r of await (await caches.open(name)).keys()){const p=new URL(r.url).pathname;if(p.startsWith('/api')||p==='/'||p==='/index.html')return false;}}return true;})()`));
 for(const mode of ['owner-today','employee-today','setup']){
  growthFixture=mode;await evaluate('Account.refresh()');
  for(const width of [360,390,768,1024,1280,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});await evaluate('Account.invalidate()');await navigate(mode==='setup'?'/distributor/setup':'/distributor/dashboard');
   await wait(mode==='setup'?`!!document.getElementById('org-business')`:`document.querySelector('h1')?.textContent.includes(${JSON.stringify(mode==='owner-today'?'Today in your business.':'My work today.')})`);
   check(`${mode} at ${width}px avoids horizontal overflow`,await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
   if(mode==='setup')check(`installer preset at ${width}px suggests installations without saving`,await evaluate(`document.querySelector('#org-business [name=services][value=rooftop_installation]').checked && !document.querySelector('#org-business [name=services][value=solar_panels]').checked`));
   else if(mode==='owner-today')check(`owner first-lead and quotation guidance at ${width}px`,await evaluate(`!!document.querySelector('.workspace-start a[href="#/distributor/new?kind=leads"]') && !!document.querySelector('.workspace-start a[href="#/distributor/leads"]')`));
   else check(`employee has assigned work without management actions at ${width}px`,await evaluate(`!!document.querySelector('main a[href="#/distributor/tasks"]') && !document.querySelector('main a[href="#/distributor/new?kind=contacts"]') && !document.querySelector('.boss-balance')`));
  }
  await writeFile(resolve(output,mode+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 await navigate('/distributor/setup?step=profile');await wait(`!!document.querySelector('.workspace-presets')`);
 check('three business presets remain accessible radio choices',await evaluate(`document.querySelectorAll('.workspace-presets input[type=radio]').length===3 && document.querySelector('.workspace-presets input[value=installer]').checked`));
 growthFixture='customer-journey';await evaluate('Account.refresh()');
 for(const width of [360,390,768,1024,1280,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  for(const [route,ready] of [[`/customer/journey?id=${fixtureCompany}`,`document.querySelector('h1')?.textContent.includes('Home solar request')`],[`/customer/documents?kind=orders&id=${fixtureCompany}`,`!!document.querySelector('a[download]')`],[`/customer/compare?enquiryId=${fixtureCompany}`,`!!document.querySelector('.purchase-comparison')`],[`/products?pin=682001`,`!!document.getElementById('market-filter')`]]){
   await navigate(route);await wait(ready);check(`customer journey ${route.split('?')[0]} at ${width}px avoids overflow`,await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  }
  await navigate(`/product?id=${fixtureCompany}&pin=682001&state=Kerala&district=Ernakulam`);await wait(`!!document.querySelector('.offers-grid .offer-card')`);
  check(`product enquiry preserves selected PIN at ${width}px`,await evaluate(`Array.from(document.querySelectorAll('main a')).filter(a=>a.getAttribute('href').includes('/customer/enquiry/new')).every(a=>new URLSearchParams(a.hash.split('?')[1]).get('pin')==='682001')`));
 }
 await navigate(`/customer/enquiry/new?productId=${fixtureCompany}&pin=682001&state=Kerala&district=Ernakulam`);await wait(`!!document.getElementById('purchase-enquiry')`);
 check('new enquiry carries location without submitting automatically',await evaluate(`document.querySelector('#purchase-enquiry [name=pin]').value==='682001' && document.querySelector('#purchase-enquiry [name=state]').value==='Kerala' && document.querySelector('#purchase-enquiry [name=district]').value==='Ernakulam'`));
 await navigate(`/customer/documents?kind=orders&id=${fixtureCompany}`);await wait(`!!document.querySelector('a[download]')`);
 check('record downloads stay on authorized same-origin endpoints',await evaluate(`Array.from(document.querySelectorAll('a[download]')).length===2 && Array.from(document.querySelectorAll('a[download]')).every(a=>a.origin===location.origin && a.pathname.startsWith('/api/customer/experience/exports/orders/'))`));
 await writeFile(resolve(output,'customer-record-exports.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 growthFixture='automation';await evaluate('Account.refresh()');
 for(const width of [360,390,768,1024,1280,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<768});await navigate('/distributor/automation');await wait(`document.querySelectorAll('.automation-rule').length===5`);
  await evaluate(`document.querySelector('.automation-rule').open=true`);
  check(`automation controls at ${width}px avoid horizontal overflow`,await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  check(`automation starts paused and requires approval at ${width}px`,await evaluate(`!document.querySelector('[data-rule=followup] [name=enabled]').checked && !document.querySelector('[data-rule=followup] [name=confirm]').checked && !!document.querySelector('[data-retry]')`));
  if(width===360)await writeFile(resolve(output,'automation-mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await navigate('/customer/reminders');await wait(`!!document.querySelector('[data-preferences]')`);check(`personal reminder choices at ${width}px avoid overflow`,await evaluate(`document.documentElement.scrollWidth<=innerWidth+2 && document.querySelectorAll('[data-preferences] [name=kinds]').length===5`));
 }
 await navigate('/distributor/automation');await wait(`!!document.querySelector('[data-rule=followup]')`);await evaluate(`const form=document.querySelector('[data-rule=followup]');form.closest('details').open=true;form.elements.reason.value='[LOCAL FIXTURE] reviewed settings';form.requestSubmit();`);await wait(`document.querySelector('[data-rule=followup] .automation-feedback').textContent.includes('approval confirmation')`);
 check('unchecked automation confirmation blocks the save before API submission',await evaluate(`!document.querySelector('[data-rule=followup] [name=confirm]').checked`));
 await writeFile(resolve(output,'automation-desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 growthFixture=null;await send('Fetch.disable');
 // Page-level CDP network emulation does not disable the worker's own network target.
 // Stop this isolated test server as well, so the worker observes a real connection failure.
 server.closeAllConnections();await new Promise(r=>server.close(r));
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send('Page.navigate',{url:base+'/offline-probe'});await wait(`document.body && /offline|connection/i.test(document.body.textContent)`);check('real offline navigation serves useful public fallback',await evaluate(`/offline|connection/i.test(document.body.textContent) && !document.querySelector('#account-login')`));
 check('no uncaught browser JavaScript exceptions',errors.length===0,errors.join('\n'));
}catch(error){check('browser scenario completed',false,error.message);}
finally{await writeFile(resolve(output,'results.json'),JSON.stringify({checks,uncaughtExceptions:errors,scope:'No-database runtime; explicit fictional demos and read-only PRO/expired response fixtures, forms, static assets, service worker. Database authorization is verified separately by PostgreSQL integration tests.'},null,2));await writeFile(resolve(output,'diagnostics.log'),diagnostics.join('\n'));ws?.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
process.stdout.write(`Browser results: ${checks.filter(x=>x.passed).length} passed, ${checks.filter(x=>!x.passed).length} failed.\n`);process.exitCode=checks.some(x=>!x.passed)?1:0;

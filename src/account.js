/* Real Phase 2 accounts. Credentials and CSRF state stay in memory; sessions use HttpOnly cookies. */
window.Account = (() => {
  let state={loading:true,error:'',user:null,companies:[],activeCompany:null,permissions:[],customerPermissions:[],csrfToken:''};
  let resources=new Map();let generation=0;let pending=null;let flash='';let resetToken='';let submitting=false;
  const authPaths=['/customer/login','/distributor/login','/register','/recover','/reset-password','/distributor/onboarding','/companies','/invitation'];
  const path=()=> (location.hash.slice(1)||'/').split('?')[0];
  const isDemo=()=>new URLSearchParams(location.hash.split('?')[1]||'').get('demo')==='1';
  const isPrivate=p=>p==='/sia'||p.startsWith('/platform')||(p.startsWith('/customer/')&&!authPaths.includes(p))||(p.startsWith('/distributor/')&&!authPaths.includes(p));
  const e=value=>escapeHTML(value ?? '');
  const has=permission=>state.permissions.includes(permission);
  function captureReset() {
    if(path()!=='/reset-password')return;
    const params=new URLSearchParams(location.hash.split('?')[1]||'');
    if(params.has('token')) {resetToken=params.get('token');history.replaceState(null,'',`${location.pathname}${location.search}#/reset-password`);}
  }
  captureReset();
  async function api(endpoint,method='GET',payload) {
    if(location.protocol==='file:')throw new Error('Start the Node.js application to use real accounts. The Phase 1 demo still works locally.');
    let response;
    try {response=await fetch(`/api${endpoint}`,{method,credentials:'same-origin',cache:'no-store',headers:{...((endpoint.startsWith('/customer/sia')||endpoint.startsWith('/companies/current/sia')||endpoint.startsWith('/platform/commercial')||endpoint.startsWith('/companies/current/subscription'))&&state.user?.id?{'X-Account-ID':state.user.id}:{}),...(endpoint.startsWith('/companies/current')?{'X-Company-ID':state.activeCompany?.id||''}:{}),...(method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':state.csrfToken,...(state.user?.id?{'X-Account-ID':state.user.id}:{})})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});}
    catch {throw new Error('The server could not be reached. Check your connection and try again.');}
    let data;try{data=await response.json();}catch{throw new Error('The account service is unavailable. Start the Node.js application and configure PostgreSQL.');}
    if(!response.ok) {
      if(response.status===401){state={...state,user:null,activeCompany:null,permissions:[]};resources.clear();}
      if(['CSRF_REJECTED','ACCOUNT_CONTEXT_CHANGED'].includes(data.error?.code))void refresh({preserveForm:Boolean(document.querySelector('[data-onboarding-form]'))});
      const error=new Error(data.error?.message||'This request could not be completed.');error.code=data.error?.code;throw error;
    }
    return data;
  }
  let lastSessionAt=0;
  async function refresh(options={}) {
    if(pending)return pending;
    const preserve=options.preserveForm&&Boolean(document.querySelector('main form,[data-onboarding-form]')),previous=state;
    const epoch=preserve?generation:++generation;let retained=false;
    if(!preserve){resources.clear();state.loading=true;}
    pending=(async()=>{
      try {const data=await api('/auth/session');if(epoch===generation){retained=preserve&&previous.user?.id===data.user?.id&&previous.activeCompany?.id===data.activeCompany?.id&&previous.activeCompany?.lifecycle===data.activeCompany?.lifecycle&&JSON.stringify(previous.permissions||[])===JSON.stringify(data.permissions||[])&&JSON.stringify(previous.customerPermissions||[])===JSON.stringify(data.customerPermissions||[])&&JSON.stringify(previous.platformPermissions||[])===JSON.stringify(data.platformPermissions||[]);if(preserve&&!retained){++generation;resources.clear();}state={...data,loading:false,error:''};lastSessionAt=Date.now();if(window.Organization)Organization.sessionChanged(previous,state);if(window.Journey)Journey.sessionChanged(previous,state);}}
      catch(error){if(epoch===generation)state={loading:false,error:error.message,user:null,companies:[],activeCompany:null,permissions:[],customerPermissions:[],csrfToken:''};}
      finally{pending=null;if(!retained&&!options.deferRender&&typeof render==='function')render();}
    })();
    return pending;
  }
  function resource(key,endpoint,draw,options={}) {
    let record=resources.get(key);if(record&&record.endpoint!==endpoint){resources.delete(key);record=null;}
    if(record?.data&&Date.now()-record.loadedAt>20000){resources.delete(key);record=null;}
    if(record?.error)return options.error?options.error(record.error):problem(record.error);
    if(record?.data)return draw(record.data);
    if(!record) {
      const request={loading:true,endpoint};resources.set(key,request);const epoch=generation;
      void api(endpoint).then(data=>{if(epoch!==generation||resources.get(key)!==request)return;resources.set(key,{data,endpoint,loadedAt:Date.now()});if(path()===key)render();}).catch(error=>{if(epoch!==generation||resources.get(key)!==request)return;resources.set(key,{error:error.message,endpoint});if(path()===key)render();});
    }
    return loading();
  }
  function loading(){return `<section class="panel account-state" role="status"><span class="round-icon loading-ring">${icon('clock')}</span><h2>Getting things ready</h2><p class="muted">Loading this view. Please wait…</p></section>`;}
  function problem(message){return `<section class="panel account-state" role="alert"><span class="round-icon">${icon('help')}</span><h2>We couldn’t open this view.</h2><p class="muted">${e(message)}</p><button class="btn secondary" data-account-action="refresh">Try again</button>${link('/companies','Choose a company','text-link')}${link('/customer/login','Sign in','text-link')}</section>`;}
  function field(label,name,type='text',value='',extra=''){return `<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;}
  function feedback(){return `<p id="account-feedback" class="account-feedback" role="status" aria-live="polite">${e(flash)}</p>`;}
  function form(id,content,submit){return `<form id="${id}" class="account-form">${content}${feedback()}<button type="submit" class="btn primary">${submit}${icon('arrow')}</button></form>`;}
  function accountFrame(title,description,content){return `<div class="auth-layout"><div><p class="eyebrow">MY SOLAR · YOUR ACCOUNT</p><h1>${title}</h1><p class="muted">${description}</p><div class="auth-art">${icon('sun')}</div></div><section class="panel settings-panel">${content}</section></div>`;}
  function loginPage(distributor=false) {
    if(state.user)return accountFrame('You’re signed in.','Choose where you’d like to go next.',`<h2>${e(state.user.name)}</h2><p class="muted">${e(state.user.email)}</p><div class="account-actions">${link(distributor?'/companies':'/customer/dashboard','Open your workspace '+icon('arrow'),'btn primary')}${link('/distributor/onboarding','Register a company','btn secondary')}<button class="btn secondary" data-account-action="logout">Sign out</button></div>`);
    return accountFrame('Good to have<br>you here.',distributor?'Sign in, then choose an authorized company workspace.':'Your personal solar journey starts here.',`<h2>${distributor?'Distributor':'Customer'} sign in</h2>${state.error?`<p class="account-feedback" role="alert">${e(state.error)}</p>`:''}${form('account-login',field('Email address','email','email','','required autocomplete="username" maxlength="254"')+field('Password','password','password','','required autocomplete="current-password" minlength="12" maxlength="128"'),'Sign in')}<div class="account-links">${link(Journey.authPath('/recover'),'Forgot password?','text-link')}${link(Journey.authPath(`/register?journey=${distributor?'distributor':'customer'}`),'Create an account','text-link')}</div><div class="divider">FICTIONAL UI PREVIEW</div>${link(`${distributor?'/distributor':'/customer'}/dashboard?demo=1`,'Explore without an account','btn secondary')}<p class="fine-print">Demo mode does not sign you in or grant access to private data.</p>`);
  }
  function registerPage(){
    if(state.user)return loginPage();
    const distributor=new URLSearchParams(location.hash.split('?')[1]||'').get('journey')==='distributor';
    const title=distributor?'Build your solar<br>business with us.':'A brighter<br>beginning.';
    const description=distributor?'Your personal account is the first step. Company setup follows after you sign in.':'Start your solar journey with MY Solar Solutions. Create your account and discover the possibilities.';
    const label=distributor?'Create distributor account':'Create customer account';
    return accountFrame(title,description,`<h2>${label}</h2>${form('account-register',field('Your name','name','text','','required autocomplete="name" maxlength="100"')+field('Email address','email','email','','required autocomplete="email" maxlength="254"')+field('Password · 12–128 characters','password','password','','required autocomplete="new-password" minlength="12" maxlength="128"'),label)}${link(distributor?'/distributor/login?journey=distributor':Journey.authPath('/customer/login'),'Already registered? Log in','text-link')}<p class="fine-print">${distributor?'Registration creates a personal account. Company setup, ownership and approval remain separate.':'Registration creates a customer profile. It grants no company or platform administrator privileges.'}</p>`);
  }
  function recoveryPage(reset=false){return accountFrame(reset?'A fresh start.':'Let’s help you<br>find your way back.',reset?'Use the one-time link provided to your email address.':'Recovery availability depends on the platform’s email configuration.',`<h2>${reset?'Reset your password':'Password recovery'}</h2>${!reset&&!state.recoveryAvailable?'<p class="info-callout">Email recovery is not configured. No email will be sent.</p>':''}${reset&&!resetToken?'<p class="account-feedback">Open a valid reset link from your email. Tokens are not displayed here.</p>':form(reset?'account-reset':'account-recover',reset?field('New password · 12–128 characters','password','password','','required autocomplete="new-password" minlength="12" maxlength="128"'):field('Account email address','email','email','','required autocomplete="email" maxlength="254"'),reset?'Change password':'Request recovery')}${link(Journey.authPath('/customer/login'),'Back to sign in','text-link')}`);}
  function onboarding(){
    if(!state.user)return accountFrame('Your business.<br>A new chapter.','Sign in or create a personal account before registering your company.',`<h2>Set up your distributor company</h2><p class="muted">The server creates the company and its initial owner together. Selecting a role never grants ownership.</p>${link('/distributor/login','Sign in to continue '+icon('arrow'),'btn primary')}${link('/register?journey=distributor','Create an account','text-link')}`);
    return accountFrame('Make room<br>for your growth.','Register a company workspace. You’ll become the initial owner of this new company.',`<h2>Company details</h2>${form('account-company-create',field('Company name','name','text','','required maxlength="100" autocomplete="organization"')+field('City or district','city','text','','required maxlength="100"')+field('Business email','email','email',state.user.email,'required maxlength="254"')+field('Business phone','phone','tel','','maxlength="24"'),'Create company')}<p class="fine-print">Your company starts unpublished. Registration does not verify the business, publish a vendor listing or enable operational workflows.</p>`);
  }
  function companyPicker(){if(!state.user)return loginPage(true);return `${heading('YOUR AUTHORIZED WORKSPACES','Choose your company.','Only active company memberships appear here.')}${feedback()}<div class="company-grid">${state.companies.map(company=>`<article class="panel company-option"><span class="round-icon">${icon('sun')}</span><h2>${e(company.name)}</h2><p class="muted">${e(company.city)} · ${e(company.role_label)}</p><button class="btn ${company.id===state.activeCompany?.id?'secondary':'primary'}" data-account-action="select-company" data-company="${e(company.id)}">${company.id===state.activeCompany?.id?'Open workspace':'Use this company'} ${icon('arrow')}</button></article>`).join('')||`<section class="panel account-state"><h2>A fresh start for your business.</h2><p class="muted">You don’t have an active company membership. Register your company, or ask its owner to add your registered email.</p></section>`}</div><div class="center-cta">${link('/distributor/onboarding','Register another company '+icon('arrow'),'btn secondary')}</div>`;}
  const routePermission={
    '/distributor/partners':'partners.read','/distributor/subscription':'subscription.read','/distributor/field':'tasks.own','/distributor/crm':'crm.read','/distributor/customers':'customers.read','/distributor/orders':'orders.read','/distributor/procurement':'procurement.read','/distributor/suppliers':'procurement.read','/distributor/payables':'finance.read','/distributor/tasks':'tasks.own',
    '/distributor/enquiry':'leads.read','/distributor/quotation':'quotations.read','/distributor/quotation/new':'quotations.manage','/distributor/notifications':'workspace.read',
    '/distributor/catalogue':'offers.read','/distributor/offers':'offers.read','/distributor/offer':'offers.manage','/distributor/service-areas':'company.setup.read',
    '/distributor/setup':'company.setup.read','/distributor/branding':'company.brand.manage','/distributor/team':'members.read',
    '/distributor/automation':'automation.read','/distributor/dashboard':'workspace.read','/distributor/leads':'leads.read','/distributor/quotations':'quotations.read',
    '/distributor/projects':'projects.read','/distributor/inventory':'inventory.read','/distributor/accounts':'finance.read',
    '/distributor/service':'service.read','/distributor/settings':'company.manage','/sia':'sia.read'
  };
  function navAllowed(p){if(isDemo())return true;const setupPaths=['/distributor/dashboard','/distributor/setup','/distributor/branding','/distributor/team','/distributor/settings','/distributor/subscription'];if(state.activeCompany?.lifecycle!=='active'&&(p==='/sia'||p.startsWith('/distributor/')&&!setupPaths.includes(p)))return false;const permission=routePermission[p];return !permission||has(permission)||(p==='/distributor/projects'&&has('projects.assigned.read'))||(p==='/distributor/service'&&has('service.assigned'));}
  function dashboard(customer=false){const company=state.activeCompany;return `${heading(customer?'YOUR CUSTOMER WORKSPACE':'YOUR AUTHORIZED COMPANY',`Welcome, ${e(state.user.name)}.`,customer?'Your enquiries and quotations are connected. Orders and installation workflows follow in later phases.':`${e(company.name)} · ${e(company.role_label)}`,customer?link('/products','Explore solutions '+icon('arrow'),'btn primary'):link('/companies','Switch company '+icon('compare'),'btn secondary'))}${feedback()}<section class="panel account-welcome"><span class="round-icon">${icon('check')}</span><div><h2>${customer?'A personal space for your solar journey.':'Your company workspace is ready.'}</h2><p class="muted">Your ${customer?'profile is':'membership and company permissions are'} connected. Enquiries and quotations are connected. Other operational modules follow in later phases; no demonstration records are mixed into your account.</p></div></section><div class="feature-grid section">${(customer?customerNav.filter(([p])=>!p.endsWith('/dashboard')):distributorNav.filter(([p])=>!p.endsWith('/dashboard')&&navAllowed(p))).map(([p,i,label])=>`<a class="panel feature" href="#${p}">${icon(i)}<h3>${t(label)}</h3><p class="muted">${p.endsWith('/settings')?'Manage your account details.':['/distributor/leads','/distributor/quotations','/customer/enquiries','/customer/quotations','/customer/compare'].includes(p)?'Open your private enquiry and quotation workflow.':'Reserved for a later phase.'}</p></a>`).join('')}</div>`;}
  function futureModule(p){const customer=p.startsWith('/customer/');const module=p==='/sia'?'sia':p.split('/').at(-1);const target=module==='compare'?'quotations':module;
    return resource(p,customer?`/customer/modules/${target}`:`/companies/current/modules/${target}`,()=>`${heading(customer?'YOUR CUSTOMER WORKSPACE':'YOUR COMPANY WORKSPACE',t(routes[p][1]),'Your access is authorized. This workflow will be implemented in a later phase.')}${p==='/sia'?`<section class="panel account-state">${avatar('large')}<h2>SIA · Virtual CEO</h2><p class="muted">AIRA Labs’ signature AI Virtual CEO. Your replaceable avatar, summary and approvals layout remain available in the fictional preview. AI execution is not connected.</p>${link('/sia?demo=1','Explore the SIA layout','btn secondary')}</section>`:`<section class="panel account-state"><span class="round-icon">${icon('box')}</span><h2>No operational records yet.</h2><p class="muted">${customer?'Only your own records will appear here.':module==='projects'&&has('projects.assigned.read')?'Only installation work assigned to you will appear here.':'Records will belong to your active company.'} Creation, updates and business actions are reserved for future phases.</p>${link(`${p}?demo=1`,'View fictional layout examples','btn secondary')}</section>`}`);
  }
  function profilePage(){return resource('/customer/settings','/customer/profile',({profile})=>`${heading('YOUR PERSONAL ACCOUNT',t('Profile & settings'),'Profile changes are saved to your signed-in account.')}<section class="panel settings-panel"><h2>Your details</h2><p class="muted">${e(profile.email)} · Email changes are not available in this phase.</p>${form('account-profile',field('Display name','name','text',profile.name,'required maxlength="100" autocomplete="name"')+field('Phone','phone','tel',profile.phone,'maxlength="24"')+field('City or district','city','text',profile.city,'maxlength="100"')+`<label>Preferred language<select name="language">${[['en','English'],['ml','മലയാളം'],['ta','தமிழ்']].map(([code,name])=>`<option value="${code}" ${code===profile.preferred_language?'selected':''}>${name}</option>`).join('')}</select></label>`,'Save profile')}<div class="divider">ACCOUNT SECURITY</div><button class="btn secondary" data-account-action="logout-all">Sign out all sessions</button></section>`);}
  function membersView(data){return `<section class="panel account-members"><div class="panel-heading"><div><h2>Company memberships</h2><p class="muted">Add existing registered accounts. No invitation email is sent.</p></div></div><div class="member-list">${data.members.map(member=>`<div class="member-row"><div><strong>${e(member.name)}</strong><small>${e(member.email)}</small></div>${member.role==='owner'?status('Owner · Protected','gold'):`<form class="member-update" data-membership="${e(member.id)}"><label><span class="sr-only">Role for ${e(member.name)}</span><select name="role">${data.assignableRoles.map(role=>`<option value="${role}" ${role===member.role?'selected':''}>${e(roleLabel(role))}</option>`).join('')}</select></label><label><span class="sr-only">Membership status for ${e(member.name)}</span><select name="status">${['active','suspended','removed'].map(status=>`<option ${status===member.status?'selected':''}>${status}</option>`).join('')}</select></label><button class="btn small secondary">Save membership</button></form>`}</div>`).join('')}</div><div class="settings-panel"><h3>Add a registered team member</h3>${form('account-member-add',field('Registered account email','email','email','','required maxlength="254"')+`<label>Company role<select name="role">${data.assignableRoles.map(role=>`<option value="${role}">${e(roleLabel(role))}</option>`).join('')}</select></label>`,'Add membership')}</div></section>`;}
  function roleLabel(role){return {part_time_sales:'Part-Time Sales Executive',sales:'Sales',supervisor:'Supervisor',field_engineer:'Field Engineer',inventory_manager:'Inventory Manager',accounts:'Accounts'}[role]||role;}
  function companySettings(){return resource('/distributor/settings','/companies/current',({company})=>{
    const members=resources.get('members');const events=resources.get('audit');
    if(!members){resources.set('members',{loading:true});const epoch=generation;void api('/companies/current/members').then(data=>{if(epoch===generation){resources.set('members',{data});if(path()==='/distributor/settings')render();}}).catch(error=>{if(epoch===generation){resources.set('members',{error:error.message});if(path()==='/distributor/settings')render();}});}
    if(!events){resources.set('audit',{loading:true});const epoch=generation;void api('/companies/current/audit').then(data=>{if(epoch===generation){resources.set('audit',{data});if(path()==='/distributor/settings')render();}}).catch(error=>{if(epoch===generation){resources.set('audit',{error:error.message});if(path()==='/distributor/settings')render();}});}
    return `${heading('YOUR COMPANY',t('Team & settings'),'Company settings and memberships are saved on the server.')}<div class="settings-grid"><section class="panel settings-panel"><h2>Company profile</h2>${form('account-company-profile',field('Company name','name','text',company.name,'required maxlength="100"')+field('City or district','city','text',company.city,'required maxlength="100"')+field('Business email','email','email',company.business_email,'required maxlength="254"')+field('Business phone','phone','tel',company.phone,'maxlength="24"')+`<label>Public storefront description<textarea name="description" maxlength="500" rows="4">${e(company.storefront_description)}</textarea></label><label class="checkbox-label"><input type="checkbox" name="published" ${company.storefront_published?'checked':''}> Publish company name, city and description</label><p class="fine-print">Business email and phone stay private. Publishing does not create product offers or verify this business.</p>`,'Save company profile')}</section><section class="panel settings-panel"><p class="eyebrow">ONE PLATFORM. YOUR IDENTITY.</p><h2>Brand preview</h2><p class="muted">Explore company colours, a replaceable logo and a sample storefront. These preview settings are session-only.</p>${link('/distributor/settings?demo=1','Open brand preview '+icon('arrow'),'btn secondary')}<h3 class="account-space">Active company</h3><p class="muted">${e(company.name)}<br>${e(state.activeCompany.role_label)}</p>${link('/companies','Switch authorized company','text-link')}</section></div><div class="account-space">${members?.data?membersView(members.data):members?.error?problem(members.error):loading()}</div><section class="panel account-space"><div class="panel-heading"><h2>Recent company security events</h2></div>${events?.data?`<ul class="audit-list">${events.data.events.map(event=>`<li><strong>${e(event.action.replaceAll('.',' · '))}</strong><span>${e(new Date(event.created_at).toLocaleString(locale==='ml'?'ml-IN':locale==='ta'?'ta-IN':'en-IN',{timeZone:'Asia/Kolkata'}))}</span></li>`).join('')||'<li>No company events yet.</li>'}</ul>`:`<p class="muted account-pad">${events?.error?e(events.error):'Loading security events…'}</p>`}</section>`;
  });}
  function page(p){
    if(!routes[p])return null;
    if(window.Experience&&Experience.isStorefront(p)&&!isDemo())return Experience.storefront(p);
    if(p==='/app-info')return Experience.appInfo();
    if(window.Marketplace&&Marketplace.isPublic(p)&&!isDemo())return Marketplace.page(p);
    if(p==='/storefront')return Organization.page(p);
    if(!authPaths.includes(p)&&(!isPrivate(p)||isDemo()))return null;
    if(state.loading)return loading();
    if(p==='/invitation')return Organization.page(p);
    if(p==='/customer/login'||p==='/distributor/login')return loginPage(p.startsWith('/distributor'));
    if(p==='/register')return registerPage();if(p==='/recover')return recoveryPage();if(p==='/reset-password')return recoveryPage(true);
    if(p==='/distributor/onboarding')return state.error?problem(state.error):onboarding();if(p==='/companies')return state.error?problem(state.error):companyPicker();
    if(state.error)return problem(state.error);if(!state.user)return loginPage(!p.startsWith('/customer/'));
    if(p.startsWith('/platform')){const commercialPage=Commercial.page(p);if(commercialPage!==null)return commercialPage;const marketplacePage=Marketplace.page(p);return marketplacePage===null?Organization.page(p):marketplacePage;}
    if(!p.startsWith('/customer/')&&!state.activeCompany)return companyPicker();
    if(!navAllowed(p))return problem('Your company role does not grant access to this screen.');
    if(window.Commercial){const commercialPage=Commercial.page(p);if(commercialPage!==null)return commercialPage;}
    if(window.SIA){const siaPage=SIA.page(p);if(siaPage!==null)return siaPage;}
    const automationPage=window.Automation?.page(p);if(automationPage!==null&&automationPage!==undefined)return automationPage;
    if(window.Experience){const experiencePage=Experience.page(p);if(experiencePage!==null)return experiencePage;}
    if(p==='/distributor/dashboard'&&state.activeCompany?.lifecycle!=='active'&&has('company.setup.read'))return Organization.page(p);
    if(window.Operations){const operationsPage=Operations.page(p);if(operationsPage!==null)return operationsPage;}
    if(window.Purchase){const purchasePage=Purchase.page(p);if(purchasePage!==null)return purchasePage;}
    const marketplacePage=Marketplace.page(p);if(marketplacePage!==null)return marketplacePage;
    const organizationPage=Organization.page(p);if(organizationPage!==null)return organizationPage;
    if(p==='/customer/dashboard')return dashboard(true);if(p==='/distributor/dashboard')return dashboard();if(p==='/customer/settings')return profilePage();if(p==='/distributor/settings')return companySettings();
    return futureModule(p);
  }
  function channel(p,original){return p.startsWith('/platform')?'public':isPrivate(p)&&!isDemo()&&(state.loading||state.error||!state.user||(!p.startsWith('/customer/')&&!state.activeCompany))?'public':original;}
  function person(){return {name:isDemo()?'Demo workspace':state.user?.name||'Your account',role:isDemo()?'Fictional preview':state.activeCompany?.role_label||'Customer'};}
  function navigate(target){if(location.hash===`#${target}`)render();else location.hash=target;}
  async function createPersonalAccount(data,audience,options={}) {
    if(!['customer','distributor'].includes(audience))throw new Error('Choose a supported onboarding journey.');
    if(pending)await pending;
    const destination=Journey.destination();
    if(state.user)return {created:false,signedIn:true,next:audience==='distributor'?'/distributor/onboarding':destination||'/customer/dashboard'};
    if(!state.csrfToken)throw new Error(state.error||'Your security session is unavailable. Refresh the page before continuing.');
    await api('/auth/register','POST',{name:data.name,email:data.email,password:data.password});
    await refresh({...options,deferRender:options.deferRender&&Boolean(document.querySelector('[data-onboarding-form]'))});
    const signedIn=Boolean(state.user)&&!state.error;
    const next=signedIn?(Organization.hasInvitation()?'/invitation':audience==='distributor'?'/distributor/onboarding':destination||'/customer/dashboard'):
      audience==='distributor'?'/distributor/login?journey=distributor':Journey.authPath('/customer/login');
    return {created:true,signedIn,next};
  }
  async function registerFromModal(data,audience) {
    if(submitting)throw new Error('Another account request is already in progress. Please wait.');
    submitting=true;
    try{return await createPersonalAccount(data,audience,{deferRender:true});}
    finally{submitting=false;}
  }
  async function run(action,formElement){
    if(submitting)return;submitting=true;flash='';const submit=formElement?.querySelector('button[type="submit"],button:not([type])');if(submit)submit.disabled=true;
    try{await action();}
    catch(error){flash=error.message;const feedbackElement=formElement?.querySelector('#account-feedback')||document.getElementById('account-feedback');if(feedbackElement)feedbackElement.textContent=flash;else announce(flash);if(!state.user&&isPrivate(path()))render();}
    finally{submitting=false;if(submit?.isConnected)submit.disabled=false;}
  }
  document.addEventListener('submit',event=>{
    const f=event.target;if(!f.matches('.account-form,.member-update'))return;event.preventDefault();
    const data=Object.fromEntries(new FormData(f));
    void run(async()=>{
      if(pending)await pending;
      if(!state.csrfToken)throw new Error(state.error||'Refresh your security session before continuing.');
      if(f.id==='account-login'){const onboarding=path()==='/distributor/login'&&new URLSearchParams(location.hash.split('?')[1]||'').get('journey')==='distributor';const destination=onboarding?'/distributor/onboarding':isPrivate(path())?location.hash.slice(1):path().startsWith('/distributor')?null:Journey.destination();await api('/auth/login','POST',data);await refresh();navigate(Organization.hasInvitation()?'/invitation':destination||(path().startsWith('/distributor')?'/companies':'/customer/dashboard'));}
      else if(f.id==='account-register'){const journey=new URLSearchParams(location.hash.split('?')[1]||'').get('journey');const result=await createPersonalAccount(data,journey==='distributor'?'distributor':'customer');navigate(result.next);}
      else if(f.id==='account-recover'){const result=await api('/auth/recover','POST',data);flash=result.message;render();}
      else if(f.id==='account-reset'){const result=await api('/auth/reset-password','POST',{...data,token:resetToken});resetToken='';await refresh();flash=result.message;navigate('/customer/login');}
      else if(f.id==='account-company-create'){await api('/companies','POST',data);await refresh();navigate('/distributor/setup?step=profile');}
      else if(f.id==='account-profile'){const result=await api('/customer/profile','PATCH',data);await refresh();flash=result.message;locale=data.language;render();}
      else if(f.id==='account-company-profile'){data.published=f.elements.published.checked;const result=await api('/companies/current','PATCH',data);await refresh();flash=result.message;render();}
      else if(f.id==='account-member-add'){const result=await api('/companies/current/members','POST',data);await refresh();flash=result.message;render();}
      else if(f.matches('.member-update')){const result=await api(`/companies/current/members/${encodeURIComponent(f.dataset.membership)}`,'PATCH',data);await refresh();flash=result.message;render();}
    },f);
  });
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href^="#/"]');
    if(anchor&&isDemo()){
      const targetPath=anchor.getAttribute('href').slice(1);const base=targetPath.split('?')[0];
      if(isPrivate(base)&&!targetPath.includes('demo=')){event.preventDefault();navigate(`${targetPath}${targetPath.includes('?')?'&':'?'}demo=1`);return;}
    }
    const target=event.target.closest('[data-account-action]');if(!target)return;
    void run(async()=>{switch(target.dataset.accountAction){
      case 'refresh':await refresh();break;
      case 'logout':case 'logout-all':await api(target.dataset.accountAction==='logout'?'/auth/logout':'/auth/logout-all','POST',{});resources.clear();await refresh();flash='You have been signed out.';navigate('/customer/login');break;
      case 'select-company':await api('/companies/select','POST',{companyId:target.dataset.company});await refresh();navigate(Organization.hasInvitation()?'/invitation':'/distributor/dashboard');break;
    }});
  });
  window.addEventListener('hashchange',()=>{captureReset();if(window.Marketplace&&Marketplace.isPublic(path())||window.Experience&&Experience.isStorefront(path()))resources.clear();if(!isDemo()&&(authPaths.includes(path())||isPrivate(path()))&&Date.now()-lastSessionAt>30000)void refresh();});
  window.addEventListener('focus',()=>{if(!isDemo()&&(isPrivate(path())||authPaths.includes(path()))&&Date.now()-lastSessionAt>15000)void refresh({preserveForm:true});});
  return {init:refresh,page,channel,isDemo,navAllowed,person,api,refresh,resource,run,navigate,feedback,form,field,roleLabel,invalidate(){resources.clear();},
    registerCustomer:data=>registerFromModal(data,'customer'),registerDistributor:data=>registerFromModal(data,'distributor'),
    setMessage(message){flash=message;},get session(){return state;},get user(){return state.user;},get activeCompany(){return state.activeCompany;}};
})();

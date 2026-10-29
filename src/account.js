/* Real Phase 2 accounts. Credentials and CSRF state stay in memory; sessions use HttpOnly cookies. */
window.Account = (() => {
  let state={loading:true,error:'',user:null,companies:[],activeCompany:null,permissions:[],customerPermissions:[],csrfToken:''};
  let resources=new Map();let generation=0;let pending=null;let flash='';let resetToken='';let submitting=false;let passwordChallenge=null;let recoveryPurpose='customer';
  const authPaths=['/account/reminders','/account-security','/customer/login','/distributor/login','/register','/recover','/reset-password','/distributor/onboarding','/companies','/invitation'];
  const path=()=> (location.hash.slice(1)||'/').split('?')[0];
  const isDemo=()=>new URLSearchParams(location.hash.split('?')[1]||'').get('demo')==='1';
  const isPrivate=p=>p==='/sia'||p.startsWith('/platform')||(p.startsWith('/customer/')&&!authPaths.includes(p))||(p.startsWith('/distributor/')&&!authPaths.includes(p));
  const e=value=>escapeHTML(value ?? '');
  const businessAccount=()=>state.user?.accountType==='business'||!state.user?.accountType&&Boolean(state.companies?.length);
  const home=()=>businessAccount()?(state.activeCompany?'/distributor/dashboard':state.companies?.length?'/companies':'/distributor/onboarding'):'/customer/dashboard';
  const accountBoundary=()=>'<section class="panel settings-panel"><h1>Use your separate '+(businessAccount()?'customer':'business')+' account</h1><p>Customer and business workspaces use separate accounts. Use a different email for each account; an email registered for a customer cannot be reused for business. Sign out before registering or signing in to the other account.</p>'+link(home(),'Back to my workspace','btn secondary')+'<button class="btn primary" data-account-action="logout">Sign out</button></section>';
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
      try {const data=await api('/auth/session');if(epoch===generation){retained=preserve&&previous.user?.id===data.user?.id&&previous.activeCompany?.id===data.activeCompany?.id&&previous.activeCompany?.lifecycle===data.activeCompany?.lifecycle&&JSON.stringify(previous.activeCompany?.osAccess&&[previous.activeCompany.osAccess.unlocked,previous.activeCompany.osAccess.status,previous.activeCompany.osAccess.trialDay,previous.activeCompany.osAccess.renewalReminder,previous.activeCompany.osAccess.trialEnd])===JSON.stringify(data.activeCompany?.osAccess&&[data.activeCompany.osAccess.unlocked,data.activeCompany.osAccess.status,data.activeCompany.osAccess.trialDay,data.activeCompany.osAccess.renewalReminder,data.activeCompany.osAccess.trialEnd])&&JSON.stringify(previous.permissions||[])===JSON.stringify(data.permissions||[])&&JSON.stringify(previous.customerPermissions||[])===JSON.stringify(data.customerPermissions||[])&&JSON.stringify(previous.platformPermissions||[])===JSON.stringify(data.platformPermissions||[]);if(preserve&&!retained){++generation;resources.clear();}state={...data,loading:false,error:''};lastSessionAt=Date.now();if(window.Organization)Organization.sessionChanged(previous,state);if(window.BusinessOnboarding)BusinessOnboarding.sessionChanged(previous,state);if(window.Journey)Journey.sessionChanged(previous,state);}}
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
      void api(endpoint).then(data=>{if(epoch!==generation||resources.get(key)!==request)return;resources.set(key,{data,endpoint,loadedAt:Date.now()});if(options.mountId&&options.viewHash===location.hash){const host=document.getElementById(options.mountId);if(host)host.innerHTML=draw(data);}else if(path()===key)render();}).catch(error=>{if(epoch!==generation||resources.get(key)!==request)return;resources.set(key,{error:error.message,endpoint});if(options.mountId&&options.viewHash===location.hash){const host=document.getElementById(options.mountId);if(host)host.innerHTML=options.error?options.error(error.message):problem(error.message);}else if(path()===key)render();});
    }
    return options.mountId?`<div id="${e(options.mountId)}">${loading()}</div>`:loading();
  }
  function loading(){return `<section class="panel account-state" role="status"><span class="round-icon loading-ring">${icon('clock')}</span><h2>Getting things ready</h2><p class="muted">Loading this view. Please wait…</p></section>`;}
  function problem(message){return `<section class="panel account-state" role="alert"><span class="round-icon">${icon('help')}</span><h2>We couldn’t open this view.</h2><p class="muted">${e(message)}</p><button class="btn secondary" data-account-action="refresh">Try again</button>${link('/companies','Choose a company','text-link')}${link('/customer/login','Sign in','text-link')}</section>`;}
  function field(label,name,type='text',value='',extra=''){return `<label>${t(label)}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;}
  function feedback(message=flash){return `<p id="account-feedback" class="account-feedback" role="status" aria-live="polite">${e(message)}</p>`;}
  function form(id,content,submit,message=flash){return `<form id="${id}" class="account-form">${content}${feedback(message)}<button type="submit" class="btn primary">${submit}${icon('arrow')}</button></form>`;}
  function accountFrame(title,description,content){return `<div class="auth-layout"><div><p class="eyebrow">MY SOLAR · YOUR ACCOUNT</p><h1>${title}</h1><p class="muted">${description}</p><div class="auth-art">${icon('sun')}</div></div><section class="panel settings-panel">${content}</section></div>`;}
  function loginPage(distributor=false) {
    if(state.user)return accountFrame('You’re signed in.','Choose where you’d like to go next.',`<h2>${e(state.user.name)}</h2><p class="muted">${e(state.user.email)}</p><div class="account-actions">${link(home(),'Open your workspace '+icon('arrow'),'btn primary')}${businessAccount()?link('/distributor/onboarding','Register a company','btn secondary'):''}<button class="btn secondary" data-account-action="logout">Sign out</button></div>`);
    if(window.MobileAuth&&!MobileAuth.emailMode())return MobileAuth.login();
    return '<div class="auth-login"><section class="panel settings-panel" aria-labelledby="signin-title"><h1 id="signin-title">Sign in</h1>'+form('account-login',field('Email address','email','email','','required autocomplete="username" maxlength="254"')+field('Password','password','password','','required autocomplete="current-password" minlength="12" maxlength="128"')+'<label>Account type<select name="accountType"><option value="customer" '+(!distributor?'selected':'')+'>Customer</option><option value="business" '+(distributor?'selected':'')+'>Business</option></select></label>','Sign in',state.error||flash)+'<div class="account-links">'+link(Journey.authPath('/recover'),'Forgot password?','text-link')+(window.MobileAuth?MobileAuth.switchButton():'')+'</div></section></div>';
  }
  function requestLoginCode(f){
    if(!f.elements.code){const group=document.createElement('div');group.dataset.loginVerification='';group.innerHTML=field('Authenticator or recovery code','code','text','','required autocomplete="one-time-code" maxlength="32"')+'<button class="btn secondary" type="button" data-login-back>Back to sign in</button>';f.querySelector('#account-feedback').before(group);}
    f.querySelectorAll('label').forEach(label=>{if(label.querySelector('[name=email],[name=password],[name=mobile],[name=pin]'))label.hidden=true;});f.querySelector('button[type=submit]').firstChild.textContent='Verify and sign in';f.elements.code.focus();
  }
  function registerPage(){
    if(state.user)return loginPage();
    const distributor=new URLSearchParams(location.hash.split('?')[1]||'').get('journey')==='distributor';
    if(distributor&&window.BusinessOnboarding)return '<section class="panel settings-panel"><h1>Your Solar Business. One AI-Powered OS.</h1><p>SIA will guide your email verification and private company setup.</p><button type="button" class="btn primary" data-business-start>Start with SIA</button></section>';
    const title=distributor?'Build your solar<br>business with us.':'A brighter<br>beginning.';
    const description=distributor?'Your personal account is the first step. Company setup follows after you sign in.':'Start your solar journey with MY Solar Solutions. Create your account and discover the possibilities.';
    const label=distributor?'Create business account':'Create customer account';
    return accountFrame(title,description,`${distributor?Workspace.journey(1):''}<h2>${label}</h2>${form('account-register',(field('Your name','name','text','','required autocomplete="name" maxlength="100"')+field('Email address','email','email','','required autocomplete="email" maxlength="254"')+field('Password · 12–128 characters','password','password','','required autocomplete="new-password" minlength="12" maxlength="128"')),label)}${link(distributor?'/distributor/login?journey=distributor':Journey.authPath('/customer/login'),'Already registered? Log in','text-link')}<p class="fine-print">${distributor?'Registration creates a personal account. Company setup, ownership and approval remain separate.':'Registration creates a customer profile. It grants no company or platform administrator privileges.'}</p>`);
  }
  function legacyRecoveryPage(reset=false){if(!reset&&window.MobileAuth&&!MobileAuth.emailMode())return MobileAuth.recovery();return accountFrame(reset?'A fresh start.':'Let’s help you<br>find your way back.',reset?'Use the one-time link provided to your email address.':'Recovery availability depends on the platform’s email configuration.',`<h2>${reset?'Reset your password':'Password recovery'}</h2>${!reset&&!state.recoveryAvailable?'<p class="info-callout">Email recovery is not configured. No email will be sent.</p>':''}${reset&&!resetToken?'<p class="account-feedback">Open a valid reset link from your email. Tokens are not displayed here.</p>':form(reset?'account-reset':'account-recover',reset?field('New password · 12–128 characters','password','password','','required autocomplete="new-password" minlength="12" maxlength="128"'):field('Account email address','email','email','','required autocomplete="email" maxlength="254"')+'<label>Account type<select name="accountType"><option value="customer">Customer</option><option value="business">Business</option></select></label>',reset?'Change password':'Request recovery')}${link(Journey.authPath('/customer/login'),'Back to sign in','text-link')}${!reset&&window.MobileAuth?MobileAuth.switchButton():''}`);}
  function recoveryPage(reset=false){
    if(reset)return legacyRecoveryPage(true);
    if(window.MobileAuth&&!MobileAuth.emailMode())return MobileAuth.recovery();
    const confirm=Boolean(passwordChallenge);
    const fields=confirm?field('Eight-digit code from your email','otp','text','','required inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="one-time-code"')+field('New password','password','password','','required autocomplete="new-password" minlength="12" maxlength="128"')+field('Confirm new password','confirmPassword','password','','required autocomplete="new-password" minlength="12" maxlength="128"'):field('Email address','email','email','','required autocomplete="email" maxlength="254"')+'<label>Account type<select name="accountType"><option value="customer" '+(recoveryPurpose==='customer'?'selected':'')+'>Customer</option><option value="business" '+(recoveryPurpose==='business'?'selected':'')+'>Business</option></select></label>';
    return accountFrame('Reset your password.',confirm?'Enter the code in this browser and choose a new password.':'We will email a single-use code for your selected account.', '<h2>'+(confirm?'Check your email':'Forgot password?')+'</h2>'+(!state.recoveryAvailable?'<p class="info-callout">Recovery email is unavailable. No code will be sent.</p>':'')+(confirm?'<p>The code expires after 15 minutes. Check Spam too. Opening this screen does not confirm email delivery.</p>':'<p>Customer and business accounts use different email addresses. Choose the type of account you want to reset.</p>')+form(confirm?'account-password-code-confirm':'account-password-code-request',fields,confirm?'Set new password':'Send reset code')+(confirm?'<button type="button" class="text-link" data-password-code-restart>Change details or request a new code</button>':'')+link(Journey.authPath(recoveryPurpose==='business'?'/distributor/login':'/customer/login'),'Back to sign in','text-link'));
  }
  function onboarding(){
    if(!state.user)return accountFrame('Grow your solar business.','One account for distributors and installers.',Workspace.journey(1)+link('/register?journey=distributor','Create your account '+icon('arrow'),'btn primary')+link('/distributor/login?journey=distributor','Already registered? Log in','text-link'));
    if(state.activeCompany&&new URLSearchParams(location.hash.split('?')[1]||'').get('new')!=='1')return accountFrame('Welcome back.','Resume your existing company to avoid a duplicate workspace.',Workspace.journey(3)+'<h2>'+e(state.activeCompany.name)+'</h2>'+link('/distributor/dashboard','Continue to workspace '+icon('arrow'),'btn primary')+link('/companies','Choose another company','text-link')+link('/distributor/onboarding?new=1','Create a separate company','text-link'));
    if(state.companies.length&&new URLSearchParams(location.hash.split('?')[1]||'').get('new')!=='1')return companyPicker();
    return '<section class="panel settings-panel"><h1>Set up your company with SIA.</h1><p>Prepare an unpublished company workspace. Complete your remaining profile and publication review later.</p><button type="button" class="btn primary" data-business-start>Continue with SIA</button></section>';
  }
  function companyPicker(){if(!state.user)return loginPage(true);return `${heading('YOUR AUTHORIZED WORKSPACES','Choose your company.','Only active company memberships appear here.')}${feedback()}<div class="company-grid">${state.companies.map(company=>`<article class="panel company-option"><span class="round-icon">${icon('sun')}</span><h2>${e(company.name)}</h2><p class="muted">${e(company.city)} · ${e(company.role_label)}</p><button class="btn ${company.id===state.activeCompany?.id?'secondary':'primary'}" data-account-action="select-company" data-company="${e(company.id)}">${company.id===state.activeCompany?.id?'Open workspace':'Use this company'} ${icon('arrow')}</button></article>`).join('')||`<section class="panel account-state"><h2>A fresh start for your business.</h2><p class="muted">You don’t have an active company membership. Register your company, or ask its owner to add your registered email.</p></section>`}</div><div class="center-cta">${link('/distributor/onboarding?new=1','Register another company '+icon('arrow'),'btn secondary')}</div>`;}
  const routePermission={
    '/distributor/marketplace-leads':'company.setup.read','/distributor/activate':'subscription.read','/distributor/website':'company.brand.read','/distributor/service-contracts':'service.read','/distributor/equipment':'orders.read','/distributor/import':'customers.manage','/distributor/templates':'quotations.read','/distributor/public-profile':'company.setup.read','/distributor/white-label':'company.setup.read','/distributor/partners':'partners.read','/distributor/subscription':'subscription.read','/distributor/reports':'workspace.read','/distributor/field':'tasks.own','/distributor/crm':'crm.read','/distributor/customers':'customers.read','/distributor/orders':'orders.read','/distributor/procurement':'procurement.read','/distributor/suppliers':'procurement.read','/distributor/payables':'finance.read','/distributor/tasks':'tasks.own',
    '/distributor/enquiry':'leads.read','/distributor/quotation':'quotations.read','/distributor/quotation/new':'quotations.manage','/distributor/notifications':'workspace.read',
    '/distributor/catalogue':'offers.read','/distributor/offers':'offers.read','/distributor/offer':'offers.manage','/distributor/service-areas':'company.setup.read',
    '/distributor/setup':'company.setup.read','/distributor/branding':'company.brand.manage','/distributor/team':'members.read','/distributor/audit':'audit.read',
    '/distributor/automation':'automation.read','/distributor/dashboard':'workspace.read','/distributor/leads':'leads.read','/distributor/quotations':'quotations.read',
    '/distributor/projects':'projects.read','/distributor/inventory':'inventory.read','/distributor/funding':'funding.read','/distributor/accounts':'finance.read',
    '/distributor/service':'service.read','/distributor/settings':'company.manage','/sia':'sia.read'
  };
  function navAllowed(p){if(isDemo())return true;const setupPaths=['/distributor/marketplace-leads','/distributor/activate','/distributor/public-profile','/distributor/white-label','/distributor/dashboard','/distributor/setup','/distributor/branding','/distributor/team','/distributor/settings','/distributor/subscription'];if(state.activeCompany?.lifecycle!=='active'&&(p==='/sia'||p.startsWith('/distributor/')&&!setupPaths.includes(p)))return false;if(p==='/distributor/reports'&&!['crm.read','quotations.read','orders.read','tasks.own','projects.read','projects.assigned.read','finance.read','procurement.read','service.read','service.assigned'].some(has))return false;const permission=routePermission[p];return !permission||has(permission)||(p==='/distributor/funding'&&has('funding.assigned.read'))||(p==='/distributor/projects'&&has('projects.assigned.read'))||(p==='/distributor/service'&&has('service.assigned'));}
  function dashboard(customer=false){const company=state.activeCompany;return `${heading(customer?'YOUR CUSTOMER WORKSPACE':'YOUR AUTHORIZED COMPANY',`Welcome, ${e(state.user.name)}.`,customer?'Your enquiries and quotations are connected. Orders and installation workflows follow in later phases.':`${e(company.name)} · ${e(company.role_label)}`,customer?link('/products','Explore solutions '+icon('arrow'),'btn primary'):link('/companies','Switch company '+icon('compare'),'btn secondary'))}${feedback()}<section class="panel account-welcome"><span class="round-icon">${icon('check')}</span><div><h2>${customer?'A personal space for your solar journey.':'Your company workspace is ready.'}</h2><p class="muted">Your ${customer?'profile is':'membership and company permissions are'} connected. Enquiries and quotations are connected. Other operational modules follow in later phases; no demonstration records are mixed into your account.</p></div></section><div class="feature-grid section">${(customer?customerNav.filter(([p])=>!p.endsWith('/dashboard')):distributorNav.filter(([p])=>!p.endsWith('/dashboard')&&navAllowed(p))).map(([p,i,label])=>`<a class="panel feature" href="#${p}">${icon(i)}<h3>${t(label)}</h3><p class="muted">${p.endsWith('/settings')?'Manage your account details.':['/distributor/leads','/distributor/quotations','/customer/enquiries','/customer/quotations','/customer/compare'].includes(p)?'Open your private enquiry and quotation workflow.':'Reserved for a later phase.'}</p></a>`).join('')}</div>`;}
  function futureModule(p){const customer=p.startsWith('/customer/');const module=p==='/sia'?'sia':p.split('/').at(-1);const target=module==='compare'?'quotations':module;
    return resource(p,customer?`/customer/modules/${target}`:`/companies/current/modules/${target}`,()=>`${heading(customer?'YOUR CUSTOMER WORKSPACE':'YOUR COMPANY WORKSPACE',t(routes[p][1]),'Your access is authorized. This workflow will be implemented in a later phase.')}${p==='/sia'?`<section class="panel account-state">${avatar('large')}<h2>SIA · Virtual CEO</h2><p class="muted">AIRA Labs’ signature AI Virtual CEO. Your replaceable avatar, summary and approvals layout remain available in the fictional preview. AI execution is not connected.</p>${link('/sia?demo=1','Explore the SIA layout','btn secondary')}</section>`:`<section class="panel account-state"><span class="round-icon">${icon('box')}</span><h2>No operational records yet.</h2><p class="muted">${customer?'Only your own records will appear here.':module==='projects'&&has('projects.assigned.read')?'Only installation work assigned to you will appear here.':'Records will belong to your active company.'} Creation, updates and business actions are reserved for future phases.</p>${link(`${p}?demo=1`,'View fictional layout examples','btn secondary')}</section>`}`);
  }
  function profilePage(){return resource('/customer/settings','/customer/profile',({profile})=>`${heading('YOUR PERSONAL ACCOUNT',t('Profile & settings'),'Profile changes are saved to your signed-in account.')}<section class="panel settings-panel"><h2>Your details</h2><p class="muted">${e(profile.email)} · Email changes are not available in this phase.</p>${form('account-profile',field('Display name','name','text',profile.name,'required maxlength="100" autocomplete="name"')+field('Phone','phone','tel',profile.phone,'maxlength="24"')+field('City or district','city','text',profile.city,'maxlength="100"')+`<label>Preferred language<select name="language">${[['en','English'],['ml','മലയാളം'],['ta','தமிழ்']].map(([code,name])=>`<option value="${code}" ${code===profile.preferred_language?'selected':''}>${name}</option>`).join('')}</select></label>`,'Save profile')}<div class="divider">ACCOUNT SECURITY</div><button class="btn secondary" data-account-action="logout-all">Sign out all sessions</button></section>`);}
  function membersView(data){return `<section class="panel account-members"><div class="panel-heading"><div><h2>Company memberships</h2><p class="muted">Add existing registered accounts. No invitation email is sent.</p></div></div><div class="member-list">${data.members.map(member=>`<div class="member-row"><div><strong>${e(member.name)}</strong><small>${e(member.email)}</small></div>${member.role==='owner'?status('Owner · Protected','gold'):`<form class="member-update" data-membership="${e(member.id)}"><label><span class="sr-only">Role for ${e(member.name)}</span><select name="role">${data.assignableRoles.map(role=>`<option value="${role}" ${role===member.role?'selected':''}>${e(roleLabel(role))}</option>`).join('')}</select></label><label><span class="sr-only">Membership status for ${e(member.name)}</span><select name="status">${['active','suspended','removed'].map(status=>`<option ${status===member.status?'selected':''}>${status}</option>`).join('')}</select></label><button class="btn small secondary">Save membership</button></form>`}</div>`).join('')}</div><div class="settings-panel"><h3>Add a registered team member</h3>${form('account-member-add',field('Registered account email','email','email','','required maxlength="254"')+`<label>Company role<select name="role">${data.assignableRoles.map(role=>`<option value="${role}">${e(roleLabel(role))}</option>`).join('')}</select></label>`,'Add membership')}</div></section>`;}
  function roleLabel(role){return {auditor:'Read-only Auditor',part_time_sales:'Part-Time Sales Executive',sales:'Sales',supervisor:'Supervisor',field_engineer:'Field Engineer',inventory_manager:'Inventory Manager',accounts:'Accounts'}[role]||role;}
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
    if(p==='/account/reminders')return state.user?Automation.page(p):loginPage(false);
    if(p==='/account-security')return state.user?AccountSecurity.page():loginPage(false);
    if(p==='/invitation')return Organization.page(p);
    if(p==='/customer/login'||p==='/distributor/login')return loginPage(p.startsWith('/distributor'));
    if(p==='/register')return registerPage();if(p==='/recover')return recoveryPage();if(p==='/reset-password')return recoveryPage(true);
    if(state.user&&state.user.accountType&&((p.startsWith('/customer/')&&!authPaths.includes(p)&&businessAccount())||((p.startsWith('/distributor/')&&!['/distributor/login'].includes(p)||p==='/companies')&&!businessAccount())))return accountBoundary();
    if(p==='/distributor/onboarding')return state.error?problem(state.error):onboarding();if(p==='/companies')return state.error?problem(state.error):companyPicker();
    if(state.error)return problem(state.error);if(!state.user)return loginPage(!p.startsWith('/customer/'));
    if(['/platform/locations','/platform/mail','/platform/operations','/platform/white-label-requests','/platform/costs'].includes(p))return ReleaseTools.page(p);
    if(p==='/platform/razorpay')return (state.platformPermissions||[]).includes('platform.commercial.read')?BusinessAccess.page(p):problem('Platform commercial access required.');
    if(p.startsWith('/platform')){const commercialPage=Commercial.page(p);if(commercialPage!==null)return commercialPage;const marketplacePage=Marketplace.page(p);return marketplacePage===null?Organization.page(p):marketplacePage;}
    if(!p.startsWith('/customer/')&&!state.activeCompany)return companyPicker();
    if(!navAllowed(p))return problem('Your company role does not grant access to this screen.');
    if(window.BusinessAccess){const accessPage=BusinessAccess.page(p);if(accessPage!==null)return accessPage;}
    if(window.ReleaseTools){const toolsPage=ReleaseTools.page(p);if(toolsPage!==null)return toolsPage;}
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
    if(!state.csrfToken)await refresh({preserveForm:true,deferRender:true});
      if(!state.csrfToken)throw new Error(state.error||'Your security session is unavailable. Refresh the page before continuing.');
    const accountType=Organization.hasInvitation()&&Organization.registrationAccountType?Organization.registrationAccountType():audience==='distributor'?'business':'customer';
    if(data.mobile&&!data.challenge){const result=await api('/auth/pin/register/request','POST',{name:data.name,email:data.email,mobile:data.mobile,accountType,...(Organization.registrationToken?.()?{invitationToken:Organization.registrationToken()}: {})});return {...result,pending:true};}
    if(data.challenge){if(data.pin){await api('/auth/pin/register/confirm','POST',{challenge:data.challenge,otp:data.otp,pin:data.pin});MobileAuth.useMobile();}else {await api('/auth/register/confirm','POST',{challenge:data.challenge,otp:data.otp});MobileAuth.useEmail();}}
    else {const result=await api('/auth/register','POST',{name:data.name,email:data.email,password:data.password,accountType,...(Organization.registrationToken?.()?{invitationToken:Organization.registrationToken()}: {})});return {...result,pending:true,emailSignup:true};}
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
    catch(error){flash=error.message;const feedbackElement=formElement?.querySelector('#account-feedback')||document.getElementById('account-feedback');if(feedbackElement)feedbackElement.textContent=flash;else announce(flash);if(!state.user&&isPrivate(path())&&!(formElement?.id==='account-login'&&formElement.isConnected))render();}
    finally{submitting=false;if(submit?.isConnected)submit.disabled=false;}
  }
  document.addEventListener('submit',event=>{
    const f=event.target;if(!f.matches('.account-form,.member-update'))return;event.preventDefault();
    const data=Object.fromEntries(new FormData(f));
    void run(async()=>{
      if(pending)await pending;
      if(!state.csrfToken)throw new Error(state.error||'Refresh your security session before continuing.');
      if(f.id==='account-login'){if(!data.mobile&&!data.accountType)data.accountType=path().startsWith('/distributor')?'business':'customer';const onboarding=path()==='/distributor/login'&&new URLSearchParams(location.hash.split('?')[1]||'').get('journey')==='distributor';const destination=onboarding?'/distributor/onboarding':isPrivate(path())?location.hash.slice(1):path().startsWith('/distributor')?null:Journey.destination();try{await api(data.mobile?'/auth/pin/login':'/auth/login','POST',data);}catch(error){if(error.code==='MFA_REQUIRED')requestLoginCode(f);throw error;}await refresh();if(!state.user)throw new Error(state.error||'Could not load your account. Please try again.');const safeDestination=destination&&(businessAccount()?!destination.startsWith('/customer/'):!destination.startsWith('/distributor/')&&destination!=='/companies')?destination:null;navigate(Organization.hasInvitation()?'/invitation':safeDestination||home());}
      else if(f.id==='account-register'){const journey=new URLSearchParams(location.hash.split('?')[1]||'').get('journey');const result=await createPersonalAccount(data,journey==='distributor'?'distributor':'customer');if(result.pending)(result.emailSignup?MobileAuth.requestEmailConfirmation:MobileAuth.requestConfirmation)(f,result);else navigate(result.next);}
      else if(f.id==='account-password-code-request'){recoveryPurpose=data.accountType;const result=await api('/auth/password-reset/request','POST',data);passwordChallenge=result.challenge;flash=result.message;render();document.querySelector('[name=otp]')?.focus();}
      else if(f.id==='account-password-code-confirm'){if(data.password!==data.confirmPassword)throw new Error('The passwords do not match.');const result=await api('/auth/password-reset/confirm','POST',{challenge:passwordChallenge,otp:data.otp,password:data.password});passwordChallenge=null;f.reset();await refresh();flash=result.message;navigate(recoveryPurpose==='business'?'/distributor/login':'/customer/login');}
      else if(f.id==='account-recover'){data.accountType=data.accountType||'customer';const result=await api('/auth/recover','POST',data);flash=result.message;render();}
      else if(f.id==='account-reset'){const result=await api('/auth/reset-password','POST',{...data,token:resetToken});resetToken='';await refresh();flash=result.message;navigate('/customer/login');}
      else if(f.id==='account-company-create'){const location=CompanyLocation.values(f),workspacePlan=SiaCompanySetup.values(f);const payload={operationKey:data.operationKey,name:data.name,email:data.email,phone:workspacePlan.emergencyContact,...location,city:data.city?.trim()||location.district,businessPreset:Workspace.selectedPreset(f),businessType:Workspace.selectedBusinessType(f),workspacePlan};await api('/companies','POST',payload);await refresh();navigate('/distributor/dashboard');}
      else if(f.id==='account-profile'){const result=await api('/customer/profile','PATCH',data);await refresh();flash=result.message;locale=data.language;render();}
      else if(f.id==='account-company-profile'){data.published=f.elements.published.checked;const result=await api('/companies/current','PATCH',data);await refresh();flash=result.message;render();}
      else if(f.id==='account-member-add'){const result=await api('/companies/current/members','POST',data);await refresh();flash=result.message;render();}
      else if(f.matches('.member-update')){const result=await api(`/companies/current/members/${encodeURIComponent(f.dataset.membership)}`,'PATCH',data);await refresh();flash=result.message;render();}
    },f);
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-password-code-restart]')){passwordChallenge=null;flash='';render();return;}
    const recoveryLink=event.target.closest('a[href^="#/recover"]');if(recoveryLink){recoveryPurpose=document.querySelector('#account-login [name=accountType]')?.value||(path().startsWith('/distributor')?'business':'customer');}
    const back=event.target.closest('[data-login-back]');if(back){flash='';const f=back.closest('form');f.querySelector('[data-login-verification]')?.remove();f.querySelectorAll('label').forEach(label=>label.hidden=false);f.querySelector('button[type=submit]').firstChild.textContent='Sign in';f.querySelector('#account-feedback').textContent='';const credential=f.elements.pin||f.elements.password;credential.value='';credential.focus();return;}
    const anchor=event.target.closest('a[href^="#/"]');
    if(anchor&&isDemo()){
      const targetPath=anchor.getAttribute('href').slice(1);const base=targetPath.split('?')[0];
      if(isPrivate(base)&&!targetPath.includes('demo=')){event.preventDefault();navigate(`${targetPath}${targetPath.includes('?')?'&':'?'}demo=1`);return;}
    }
    const target=event.target.closest('[data-account-action]');if(!target)return;
    void run(async()=>{switch(target.dataset.accountAction){
      case 'refresh':await refresh();break;
      case 'logout':case 'logout-all':await api(target.dataset.accountAction==='logout'?'/auth/logout':'/auth/logout-all','POST',{});resources.clear();MobileAuth.useEmail();passwordChallenge=null;await refresh();flash='You have been signed out.';navigate('/customer/login');break;
      case 'select-company':await api('/companies/select','POST',{companyId:target.dataset.company});await refresh();navigate(Organization.hasInvitation()?'/invitation':'/distributor/dashboard');break;
    }});
  });
  window.addEventListener('hashchange',()=>{captureReset();if(path()!=='/recover')passwordChallenge=null;if(window.Marketplace&&Marketplace.isPublic(path())||window.Experience&&Experience.isStorefront(path()))resources.clear();if(!isDemo()&&(authPaths.includes(path())||isPrivate(path()))&&Date.now()-lastSessionAt>30000)void refresh();});
  window.addEventListener('focus',()=>{if(!isDemo()&&(isPrivate(path())||authPaths.includes(path()))&&Date.now()-lastSessionAt>15000)void refresh({preserveForm:true});});
  return {init:refresh,page,channel,isDemo,navAllowed,person,api,refresh,resource,run,navigate,feedback,form,field,roleLabel,invalidate(){resources.clear();},
    get home(){return home();},get businessAccount(){return businessAccount();},registerCustomer:data=>registerFromModal(data,'customer'),registerDistributor:data=>registerFromModal(data,'distributor'),
    setMessage(message){flash=message;},get session(){return state;},get user(){return state.user;},get activeCompany(){return state.activeCompany;}};
})();

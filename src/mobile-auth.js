/* PINs and OTPs stay in form fields only. No browser storage or URL secrets. */
window.MobileAuth=(()=>{
 let mode=null;
 const e=value=>escapeHTML(value??'');
 const emailMode=()=>mode===null?!Account.session.pinAvailable:mode!=='mobile';
 const switchButton=()=>`<button type="button" class="text-link auth-mode-switch" data-auth-mode="${emailMode()?'mobile':'email'}">${emailMode()?'Use existing mobile number and PIN':'Use email and password'}</button>`;
 const mobileField=()=>`<label class="auth-number-label">Country calling code and mobile number<span class="auth-phone-control"><input class="auth-country-input" name="countryCode" type="tel" value="+91" required inputmode="tel" pattern="\\+[1-9][0-9]{0,2}" maxlength="4" aria-label="Country calling code"><input name="mobile" type="tel" required autocomplete="username" inputmode="tel" maxlength="18" placeholder="Mobile number" aria-label="Mobile number" aria-describedby="auth-mobile-hint"></span><small id="auth-mobile-hint" class="auth-number-hint">Use the same number and calling code you registered.</small></label>`;
 const pinField=(name='pin',label='Six-digit PIN',fresh=false)=>`<label class="auth-number-label">${e(label)}<span class="auth-pin-control"><span class="auth-pin-cells" aria-hidden="true">${'<span></span>'.repeat(6)}</span><input name="${e(name)}" type="password" required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="${fresh?'new-password':'current-password'}" aria-describedby="auth-pin-hint"></span><small id="auth-pin-hint" class="auth-number-hint">Enter all six digits. Keep your PIN private.</small></label>`;
 const otpField=()=>Account.field('Code from your email','otp','text','','required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code"');
 let signinDialog=null,signinController=null,signinFocus=null;
 function paintPIN(input){
  const cells=input.closest('.auth-pin-control')?.querySelectorAll('.auth-pin-cells>span');
  cells?.forEach((cell,index)=>{cell.classList.toggle('is-filled',index<input.value.length);cell.classList.toggle('is-current',index===Math.min(input.value.length,5));});
 }
 document.addEventListener('input',event=>{if(event.target.matches('.auth-pin-control input'))paintPIN(event.target);});
 document.addEventListener('change',event=>{if(event.target.matches('.auth-pin-control input'))paintPIN(event.target);});
 document.addEventListener('click',event=>{if(event.target.closest('[data-login-back]'))queueMicrotask(()=>document.querySelectorAll('.auth-pin-control input').forEach(paintPIN));});
 function cleanupLogin(){
  signinFocus=signinDialog?.contains(document.activeElement)?document.activeElement.name:null;
  signinController?.abort();signinController=null;
  if(signinDialog?.open)signinDialog.close();
  signinDialog=null;document.body.classList.remove('auth-modal-open');
 }
 function mountLogin(){
  const login=document.querySelector('.auth-login:has(#account-login),.auth-login:has(.pin-form)');
  if(!login)return false;
  signinController=new AbortController();const {signal}=signinController;
  const dialog=document.createElement('dialog');signinDialog=dialog;
  const recovery=!login.querySelector('#account-login');
  dialog.id=recovery?'recovery-dialog':'signin-dialog';dialog.className='auth-signin-dialog';dialog.setAttribute('aria-labelledby','signin-title');dialog.setAttribute('aria-describedby','signin-intro');
  const background=document.createElement('div');background.className='auth-signin-background';background.innerHTML=Landing.page();
  login.before(background,dialog);dialog.append(login);
  login.insertAdjacentHTML('afterbegin',`<div class="auth-dialog-top"><span class="auth-dialog-brand">MY SOLAR SOLUTIONS</span><button type="button" class="ob-close" data-signin-close aria-label="Close">${icon('close')}</button></div>`);
  login.querySelector('h1').id='signin-title';
  login.querySelector('h1').insertAdjacentHTML('afterend',`<p id="signin-intro" class="auth-signin-intro">${recovery?'We’ll send a one-time code to the verified email for this account.':'Welcome back. Your solar journey continues here.'}</p>`);
  function dismiss(){
   if([...dialog.querySelectorAll('button[type=submit]')].some(button=>button.disabled))return;
   Account.navigate('/');
   requestAnimationFrame(()=>document.querySelector('.ph-login')?.focus());
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();},{signal});
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-signin-close]'))dismiss();},{signal});
  document.body.classList.add('auth-modal-open','lp-active');document.getElementById('main')?.classList.add('lp-main');
  dialog.showModal();
  const focus=[...dialog.querySelectorAll('input')].find(input=>input.name===signinFocus)||dialog.querySelector('input');
  focus?.focus({preventScroll:true});signinFocus=null;
  dialog.querySelectorAll('.auth-pin-control input').forEach(paintPIN);
  return true;
 }
 function login(){if(mode===null)mode=Account.session.pinAvailable?'mobile':'email';return '<div class="auth-login"><section class="panel settings-panel" aria-labelledby="signin-title"><h1 id="signin-title">Sign in</h1>'+(!Account.session.pinAvailable?'<p class="info-callout">Mobile/PIN access is not configured yet. Existing accounts can use email and password.</p>':'')+(emailMode()?Account.form('account-login',Account.field('Email address','email','email','','required autocomplete="username" maxlength="254"')+Account.field('Password','password','password','','required autocomplete="current-password" minlength="12" maxlength="128"')+'<label>Account type<select name="accountType"><option value="customer">Customer</option><option value="business">Business</option></select></label>','Sign in',Account.session.error||undefined):Account.form('account-login',mobileField()+pinField(),'Sign in',Account.session.error||undefined))+'<div class="account-links">'+link(Journey.authPath('/recover'),'Forgot PIN?','text-link')+switchButton()+'</div></section></div>';}
 function signupFields(prefix){
  const input=(label,name,type,extra)=>`<label for="${prefix}-${name}">${label}<input id="${prefix}-${name}" name="${name}" type="${type}" required ${extra} aria-describedby="${prefix}-${name}-error"><small class="ob-field-error" id="${prefix}-${name}-error"></small></label>`;
  const referralCode=new URLSearchParams(location.hash.split('?')[1]||location.search.slice(1)).get('ref')||'';
  return input('Your name','name','text','autocomplete="name" maxlength="100"')+`<label for="${prefix}-country-code">Mobile number<span class="auth-phone-control"><input id="${prefix}-country-code" class="auth-country-input" name="countryCode" type="tel" value="+91" required inputmode="tel" pattern="\\+[1-9][0-9]{0,2}" maxlength="4" aria-label="Country calling code"><input id="${prefix}-mobile" name="mobile" type="tel" required autocomplete="tel-national" inputmode="tel" maxlength="18" placeholder="Your mobile number" aria-label="Mobile number"></span><small class="ob-hint">Country code starts at +91. Change it if you use another country code.</small></label>`+input('Email address','email','email','autocomplete="email" maxlength="254"')+`${referralCode?`<input type="hidden" name="referralCode" value="${e(referralCode)}">`:''}<p class="fine-print">We send your verification code by email. No SMS code is sent.</p>`;
 }
 function confirmFields(prefix,challenge){
  const input=(label,name,type,autocomplete)=>`<label for="${prefix}-${name}">${label}<input id="${prefix}-${name}" name="${name}" type="${type}" required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="${autocomplete}" aria-describedby="${prefix}-${name}-error"><small class="ob-field-error" id="${prefix}-${name}-error"></small></label>`;
  return `<input type="hidden" name="challenge" value="${e(challenge)}">`+input('Code from your email','otp','text','one-time-code')+input('Choose a six-digit PIN','pin','password','new-password')+'<p class="fine-print">The email code expires in 10 minutes. Choose a PIN without repeated or consecutive digits. Never share your PIN or email code.</p>';
 }
 function requestConfirmation(f,result){
  const modal=f.matches('[data-onboarding-form]');if(modal){f.dataset.signupStep='email-code';f.innerHTML='<input type="hidden" name="challenge" value="'+e(result.challenge)+'"><p class="ob-step-count">Step 2 of 3</p><p class="ob-code-copy">Enter the six-digit code we sent to <strong>'+e((typeof Onboarding!=='undefined'?Onboarding.email():'')||'your email')+'</strong>.</p><label for="ob-otp">Email code<input id="ob-otp" name="otp" type="text" required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code"></label><div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1">'+e(result.message||'')+'</div><button type="submit" class="ob-submit">Verify email and continue</button><p class="ob-progress" role="status" aria-live="polite"></p><button type="button" class="text-link" data-pin-restart>Change my email</button><button type="button" class="text-link" data-pin-delivery>Check email delivery</button><p data-pin-status role="status" aria-live="polite"></p>';f.querySelector('[name=otp]').focus();return;}
  f.innerHTML=confirmFields('signup',result.challenge)+LegalConsent.fields(result.accountType||'customer')+Account.feedback(result.message)+'<button type="submit" class="btn primary">Verify email and create account</button><button type="button" class="text-link" data-pin-delivery>Check email delivery</button><p data-pin-status role="status" aria-live="polite"></p><button type="button" class="text-link" data-pin-restart>Change details or request another code</button><p class="fine-print">If you still cannot access your email, <a href="/support">contact support</a>.</p>';
  if(modal)f.querySelector('#ob-feedback').textContent=result.message;
  f.querySelector('[name=otp]').focus();
 }
 function pinSetup(f,result){f.dataset.signupStep='pin';f.innerHTML='<input type="hidden" name="challenge" value="'+e(result.challenge)+'"><p class="ob-step-count">Step 3 of 3</p><p class="ob-code-copy">Email confirmed. Choose a six-digit PIN you can remember.</p>'+pinField('pin','Choose your six-digit PIN',true)+pinField('pinConfirm','Enter the PIN again',true)+LegalConsent.fields(result.accountType||'customer')+'<div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1"></div><button type="submit" class="ob-submit">Create my account</button><p class="ob-progress" role="status" aria-live="polite"></p><button type="button" class="text-link" data-pin-restart>Change my email</button>';f.querySelector('[name=pin]')?.focus();}
 function requestEmailConfirmation(f,result){
  const modal=f.matches('[data-onboarding-form]'),prefix=modal?'ob':'signup';
  f.innerHTML='<input type="hidden" name="challenge" value="'+e(result.challenge)+'"><label for="'+prefix+'-otp">Six-digit code from your email<input id="'+prefix+'-otp" name="otp" required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" aria-describedby="'+prefix+'-otp-error"><small class="ob-field-error" id="'+prefix+'-otp-error"></small></label><p class="fine-print">Code requested for '+e(result.email||'your email address')+'. It expires in 15 minutes. Your account is created only after verification. Never share this code.</p>'+LegalConsent.fields(result.accountType||'customer')+(modal?'<div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1"></div><button type="submit" class="ob-submit">Verify email and create account</button><p class="ob-progress" role="status" aria-live="polite"></p>':Account.feedback(result.message)+'<button type="submit" class="btn primary">Verify email and create account</button>')+'<button type="button" class="text-link" data-signup-delivery>Check email delivery status</button><p data-signup-status role="status"></p><button type="button" class="text-link" data-signup-restart>Change details or request another code</button>';
  if(modal)f.querySelector('#ob-feedback').textContent=result.message;f.elements.otp.focus();
 }
 function recovery(){return `<div class="auth-login"><section class="panel settings-panel"><h1>Reset your PIN</h1><p>Enter the mobile number for the account. If it can be recovered, we’ll email a code to its verified email address.</p>${!Account.session.pinEmailAvailable?'<p class="info-callout">PIN recovery email is not configured. No code will be sent.</p>':''}<form class="pin-form" data-pin-action="reset/request">${mobileField()}${Account.feedback()}<button type="submit" class="btn primary">Send email code</button></form><div class="account-links">${link(Journey.authPath('/customer/login'),'Back to sign in','text-link')}${switchButton()}</div></section></div>`;}
 function security(d){return `<section class="panel settings-panel"><h2>Mobile number and PIN</h2><p>${d.mobile?'Sign-in mobile: '+e(d.mobile):'Add mobile/PIN to this existing account. Your contact phone is not automatically a sign-in identity.'}</p><p class="fine-print">Mobile ownership is not verified by SMS. Use your own number and keep your verified recovery email secure. Your existing password and authenticator remain valid.</p>${!d.pinEmailAvailable?'<p>Mobile/PIN setup requires server configuration and email delivery.</p>':!d.emailVerified?'<p>Verify your account email above before enabling mobile/PIN.</p>':`<form class="pin-form" data-pin-action="enrol/request">${mobileField()}${Account.field('Current password or PIN','credential','password','','required autocomplete="current-password" maxlength="128"')}${Account.field('Authenticator or recovery code, if enabled','code','text','','autocomplete="one-time-code" maxlength="32"')}<p class="account-feedback" role="status" data-pin-feedback></p><button type="submit" class="btn primary">Verify and set up mobile/PIN</button></form>`}</section>`;}
 document.addEventListener('click',event=>{
  const pinDelivery=event.target.closest('[data-pin-delivery]');if(pinDelivery){const f=pinDelivery.closest('form');pinDelivery.disabled=true;void Account.api('/auth/pin/status?challenge='+encodeURIComponent(f.elements.challenge.value)).then(r=>{if(f.isConnected)f.querySelector('[data-pin-status]').textContent=r.message;}).catch(error=>{if(f.isConnected)f.querySelector('[data-pin-status]').textContent=error.message;}).finally(()=>{if(pinDelivery.isConnected)pinDelivery.disabled=false;});return;}
  const delivery=event.target.closest('[data-signup-delivery]');if(delivery){const f=delivery.closest('form');delivery.disabled=true;void Account.api('/auth/register/status?challenge='+encodeURIComponent(f.elements.challenge.value)).then(r=>{if(f.isConnected)f.querySelector('[data-signup-status]').textContent=r.message;}).catch(error=>{if(f.isConnected)f.querySelector('[data-signup-status]').textContent=error.message;}).finally(()=>{delivery.disabled=false;});return;}
  const toggle=event.target.closest('[data-auth-mode]');if(toggle){mode=toggle.dataset.authMode;Account.setMessage('');render();return;}
  const restart=event.target.closest('[data-pin-restart],[data-signup-restart]');if(!restart||restart.disabled)return;
  const f=restart.closest('form');if(f?.matches('[data-onboarding-form]')){Onboarding.restart();return;}
  if(f?.matches('.pin-form'))Account.invalidate();render();
 });
 document.addEventListener('submit',event=>{
  const f=event.target;if(!f.matches('.pin-form'))return;event.preventDefault();
  void Account.run(async()=>{
   try{
   const action=f.dataset.pinAction,body=Object.fromEntries(new FormData(f));
   if(!Account.session.csrfToken)await Account.refresh({preserveForm:true,deferRender:true});
   const result=await Account.api('/auth/pin/'+action,'POST',body);
   if(action.endsWith('/request')){
    f.dataset.pinAction=action.replace('/request','/confirm');f.innerHTML=`<p>${e(result.message)}</p><input type="hidden" name="challenge" value="${e(result.challenge)}">${otpField()}${pinField('pin','Choose a new six-digit PIN',true)}<p class="fine-print">Code expires in 10 minutes. Avoid repeated or consecutive PIN digits.</p><p class="account-feedback" role="status" data-pin-feedback></p><button type="submit" class="btn primary">${action.startsWith('enrol')?'Enable mobile/PIN':'Reset PIN'}</button><button type="button" class="text-link" data-pin-delivery>Check email delivery</button><p data-pin-status role="status" aria-live="polite"></p><button class="text-link" type="button" data-pin-restart>Start again or request another code</button><p class="fine-print">If you cannot access your email, <a href="/support">contact support</a>.</p>`;f.elements.otp.focus();
   }else{mode='mobile';f.reset();await Account.refresh();Account.setMessage(result.message);Account.invalidate();Account.navigate(Journey.authPath('/customer/login'));}
   }catch(error){const local=f.querySelector('[data-pin-feedback]');if(local)local.textContent=error.message;throw error;}
  },f);
 });
 return {useEmail(){mode='email';},useMobile(){mode='mobile';},requestEmailConfirmation,cleanupLogin,mountLogin,emailMode,switchButton,login,signupFields,confirmFields,requestConfirmation,pinSetup,recovery,security};
})();

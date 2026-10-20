/* PINs and OTPs stay in form fields only. No browser storage or URL secrets. */
window.MobileAuth=(()=>{
 let mode=null;
 const e=value=>escapeHTML(value??'');
 const emailMode=()=>mode==='email'||(mode===null&&!Account.session.pinAvailable);
 const switchButton=()=>`<button type="button" class="text-link auth-mode-switch" data-auth-mode="${emailMode()?'mobile':'email'}">${emailMode()?'Use mobile number and PIN':'Use existing email and password'}</button>`;
 const mobileField=()=>Account.field('Mobile number','mobile','tel','','required autocomplete="username" inputmode="tel" maxlength="24" placeholder="10-digit Indian mobile number"');
 const pinField=(name='pin',label='Six-digit PIN',fresh=false)=>Account.field(label,name,'password','',`required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="${fresh?'new-password':'current-password'}"`);
 const otpField=()=>Account.field('Code from your email','otp','text','','required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code"');
 function login(){return '<div class="auth-login"><section class="panel settings-panel" aria-labelledby="signin-title"><h1 id="signin-title">Sign in</h1>'+(!Account.session.pinAvailable?'<p class="info-callout">Mobile/PIN access is not configured yet. Existing accounts can use email and password.</p>':'')+Account.form('account-login',mobileField()+pinField(),'Sign in',Account.session.error||undefined)+'<div class="account-links">'+link(Journey.authPath('/recover'),'Forgot PIN?','text-link')+switchButton()+'</div></section></div>';}
 function signupFields(prefix){
  const input=(label,name,type,extra)=>`<label for="${prefix}-${name}">${label}<input id="${prefix}-${name}" name="${name}" type="${type}" required ${extra} aria-describedby="${prefix}-${name}-error"><small class="ob-field-error" id="${prefix}-${name}-error"></small></label>`;
  return input('Your name','name','text','autocomplete="name" maxlength="100"')+input('Recovery email address','email','email','autocomplete="email" maxlength="254"')+input('Mobile number','mobile','tel','autocomplete="tel" inputmode="tel" maxlength="24" placeholder="10-digit Indian mobile number"')+'<p class="fine-print">We will verify your email before creating your account. Choose your six-digit PIN in the next step. Mobile ownership is not verified by SMS.</p>';
 }
 function confirmFields(prefix,challenge){
  const input=(label,name,type,autocomplete)=>`<label for="${prefix}-${name}">${label}<input id="${prefix}-${name}" name="${name}" type="${type}" required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="${autocomplete}" aria-describedby="${prefix}-${name}-error"><small class="ob-field-error" id="${prefix}-${name}-error"></small></label>`;
  return `<input type="hidden" name="challenge" value="${e(challenge)}">`+input('Code from your email','otp','text','one-time-code')+input('Choose a six-digit PIN','pin','password','new-password')+'<p class="fine-print">The email code expires in 10 minutes. Choose a PIN without repeated or consecutive digits. Never share your PIN or email code.</p>';
 }
 function requestConfirmation(f,result){
  const modal=f.matches('[data-onboarding-form]');f.innerHTML=confirmFields(modal?'ob':'signup',result.challenge)+(modal?'<div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1"></div><button type="submit" class="ob-submit">Verify email and create account</button><p class="ob-progress" role="status" aria-live="polite"></p>':Account.feedback(result.message)+'<button type="submit" class="btn primary">Verify email and create account</button>')+'<button type="button" class="text-link" data-pin-restart>Change details or request another code</button>';
  if(modal)f.querySelector('#ob-feedback').textContent=result.message;
  f.querySelector('[name=otp]').focus();
 }
 function recovery(){return `<div class="auth-login"><section class="panel settings-panel"><h1>Reset your PIN</h1><p>Enter your sign-in mobile number. We will send a code to its verified recovery email, if eligible.</p>${!Account.session.pinEmailAvailable?'<p class="info-callout">PIN recovery email is not configured. No code will be sent.</p>':''}<form class="pin-form" data-pin-action="reset/request">${mobileField()}${Account.feedback()}<button type="submit" class="btn primary">Send email code</button></form><div class="account-links">${link(Journey.authPath('/customer/login'),'Back to sign in','text-link')}${switchButton()}</div></section></div>`;}
 function security(d){return `<section class="panel settings-panel"><h2>Mobile number and PIN</h2><p>${d.mobile?'Sign-in mobile: '+e(d.mobile):'Add mobile/PIN to this existing account. Your contact phone is not automatically a sign-in identity.'}</p><p class="fine-print">Mobile ownership is not verified by SMS. Use your own number and keep your verified recovery email secure. Your existing password and authenticator remain valid.</p>${!d.pinEmailAvailable?'<p>Mobile/PIN setup requires server configuration and email delivery.</p>':!d.emailVerified?'<p>Verify your account email above before enabling mobile/PIN.</p>':`<form class="pin-form" data-pin-action="enrol/request">${mobileField()}${Account.field('Current password or PIN','credential','password','','required autocomplete="current-password" maxlength="128"')}${Account.field('Authenticator or recovery code, if enabled','code','text','','autocomplete="one-time-code" maxlength="32"')}<p class="account-feedback" role="status" data-pin-feedback></p><button type="submit" class="btn primary">Verify and set up mobile/PIN</button></form>`}</section>`;}
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-auth-mode]');if(toggle){mode=toggle.dataset.authMode;Account.setMessage('');render();return;}
  const restart=event.target.closest('[data-pin-restart]');if(!restart||restart.disabled)return;
  const f=restart.closest('form');if(f?.matches('[data-onboarding-form]')){Onboarding.open(f.dataset.onboardingForm);return;}
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
    f.dataset.pinAction=action.replace('/request','/confirm');f.innerHTML=`<p>${e(result.message)}</p><input type="hidden" name="challenge" value="${e(result.challenge)}">${otpField()}${pinField('pin','Choose a new six-digit PIN',true)}<p class="fine-print">Code expires in 10 minutes. Avoid repeated or consecutive PIN digits.</p><p class="account-feedback" role="status" data-pin-feedback></p><button type="submit" class="btn primary">${action.startsWith('enrol')?'Enable mobile/PIN':'Reset PIN'}</button><button class="text-link" type="button" data-pin-restart>Start again or request another code</button>`;f.elements.otp.focus();
   }else{mode='mobile';f.reset();await Account.refresh();Account.setMessage(result.message);Account.invalidate();Account.navigate(Journey.authPath('/customer/login'));}
   }catch(error){const local=f.querySelector('[data-pin-feedback]');if(local)local.textContent=error.message;throw error;}
  },f);
 });
 return {useMobile(){mode='mobile';},emailMode,switchButton,login,signupFields,confirmFields,requestConfirmation,recovery,security};
})();

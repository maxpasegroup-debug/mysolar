/* Audience-specific presentation over the existing personal-account API. No credentials are persisted. */
const Onboarding = (() => {
  const content = {
    customer: { badge:'YOUR SOLAR JOURNEY', heading:'A brighter beginning.', introduction:'I’m SIA, your solar guide. Create your account, verify your email, and I’ll open your dashboard. You can complete your profile later.', submit:'Create customer account', login:()=>Journey.authPath('/customer/login'), register:data=>Account.registerCustomer(data), symbol:'sun' },
    distributor: { badge:'YOUR SOLAR BUSINESS', heading:'Build your solar business with us.', introduction:'I’m SIA, your business setup guide. Create your account and verify your email. Your welcome dashboard comes next; company setup can wait.', submit:'Create business account', login:()=>'/distributor/login?journey=distributor', register:data=>Account.registerDistributor(data), symbol:'box' }
  };
  let dialog, controller, audience, busy=false, success=false, closing=false, returnFocus, chooseAudience, version=0, expectedEmail='', profile=null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const submitLabel = form => form?.elements.challenge?'Verify email and create account':content[audience].submit;
  const markup = () => '<dialog id="onboarding-dialog" class="ob-dialog" aria-labelledby="ob-title" aria-describedby="ob-intro"></dialog>';
  function fields() {
    return `<label for="ob-name">Your name<input id="ob-name" name="name" autocomplete="name" maxlength="100" required aria-describedby="ob-name-error"><small id="ob-name-error" class="ob-field-error"></small></label><label for="ob-email">Email address<input id="ob-email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="ob-email-error"><small id="ob-email-error" class="ob-field-error"></small></label><label for="ob-mobile">Country calling code and mobile number<span class="ob-phone-control"><input id="ob-country-code" name="countryCode" type="tel" value="+91" inputmode="tel" pattern="\\+[1-9][0-9]{0,2}" maxlength="4" aria-label="Country calling code" required><input id="ob-mobile" name="mobile" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="18" placeholder="Mobile number" required aria-label="Mobile number"></span><small class="ob-hint">Email verification is used for account checks. No SMS code will be sent. Each account needs its own email and mobile number.</small><small id="ob-mobile-error" class="ob-field-error"></small></label>`;
  }
  function formMarkup(mode) {
    const c=content[mode];
    return `<div class="ob-shell"><div class="ob-decoration" aria-hidden="true"><span class="ob-sun"></span><span class="ob-grid"></span></div><div class="ob-top"><button type="button" class="ob-back" data-ob-back>← Choose your journey</button><button type="button" class="ob-close" data-ob-close aria-label="Close onboarding">${icon('close')}</button></div><div class="ob-heading"><div class="ob-sia-guide">${SiaOrb.markup({size:'small'})}<p>SIA · ${mode==='distributor'?'Your business setup guide':'Your solar guide'}</p></div>${SiaOrb.control()}<span class="ob-badge">${icon(c.symbol)}${c.badge}</span><h2 id="ob-title" tabindex="-1">${c.heading}</h2><p id="ob-intro">${c.introduction}</p></div>${mode==='distributor'?Workspace.journey(1)+'<p class="ob-separation">One account, one company, your workspace. Choose equipment distributor, dealer / retailer, installer / EPC, or a combined business in the next step.</p>':''}<form data-onboarding-form="${mode}" novalidate>${fields()}${LegalConsent.fields(mode==='distributor'?'business':'customer')}<div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1"></div><button type="submit" class="ob-submit">${submitLabel()}${icon('arrow')}</button><p class="ob-progress" role="status" aria-live="polite"></p></form><div class="ob-links">${link(c.login(),'Already registered? Log in')}${link('/products','Explore solar first')}</div><p class="ob-boundary">${mode==='distributor'?'This creates your personal account. It does not create or approve a company or grant distributor permissions.':'Customer signup creates your personal customer profile. It grants no company or platform administration privileges.'}</p><div class="ob-switch"><span>${mode==='customer'?'Here for your solar business?':'Looking for solar for your property?'}</span><button type="button" data-ob-switch="${mode==='customer'?'distributor':'customer'}">${mode==='customer'?'Choose distributor onboarding':'Choose customer onboarding'}</button></div></div>`;
  }
  function animateIn() {
    if(reduced()||!dialog.animate)return;
    dialog.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function open(mode,focusTarget) {
    if(!content[mode]||busy||!dialog)return;
    if(Account.user){Account.navigate(Account.home);return;}
    version++;
    audience=mode;expectedEmail='';profile=null;success=false;closing=false;returnFocus=focusTarget||returnFocus;
    dialog.className='ob-dialog ob-'+mode;
    dialog.innerHTML=formMarkup(mode);
    document.body.classList.add('ob-modal-open');
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    dialog.querySelector('#ob-title').focus({preventScroll:true});
    animateIn();
  }
  async function close(after) {
    if(busy||closing||!dialog?.open)return;
    closing=true;
    const current=dialog, epoch=version;
    current.classList.add('ob-closing');
    // Close promptly even when animations are paused or browser frames are throttled.
    if(epoch!==version||!current.isConnected)return;
    current.getAnimations?.().forEach(animation=>animation.cancel());
    current.close();current.innerHTML='';
    document.body.classList.remove('ob-modal-open');
    closing=false;
    if(after){after();return;}
    const focus=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:document.querySelector('.ph-start:not(.ph-compact-start)')?.getClientRects().length?document.querySelector('.ph-start:not(.ph-compact-start)'):document.querySelector('[data-ph-mobile]');
    if(success){render();(document.querySelector('.ph-start:not(.ph-compact-start)')?.getClientRects().length?document.querySelector('.ph-start:not(.ph-compact-start)'):document.querySelector('[data-ph-mobile]'))?.focus({preventScroll:true});}
    else focus?.focus({preventScroll:true});
  }
  function validate(form) {
    let first;
    for(const input of form.querySelectorAll('input:not([type=hidden])')) {
      const valid=input.checkValidity()&&(input.name!=='name'||Boolean(input.value.trim()));
      input.setAttribute('aria-invalid',String(!valid));
      const message=form.querySelector('#'+input.id+'-error');if(message)message.textContent=valid?'':input.validity.valid?'Enter your name.':input.validationMessage;
      if(!valid&&!first)first=input;
    }
    first?.focus();return !first;
  }
  function setBusy(form,value) {
    busy=value;form.setAttribute('aria-busy',String(value));
    form.querySelectorAll('input').forEach(input=>input.readOnly=value);
    dialog.querySelectorAll('button').forEach(button=>button.disabled=value);
    dialog.querySelectorAll('a').forEach(anchor=>{anchor.inert=value;});
    const confirming=Boolean(form.elements.challenge);
    const pendingLabel=confirming?'Verifying your email...':'Requesting your email code...';
    form.querySelector('.ob-submit').innerHTML=value?'<span class="ob-spinner" aria-hidden="true"></span>'+pendingLabel:submitLabel(form)+icon('arrow');
    form.querySelector('.ob-progress').textContent=value?(confirming?'Verifying your code and creating your account securely.':'Requesting email verification. Your account is not created yet.'):'';
  }
  async function submit(form) {
    if(busy||closing||success||!validate(form))return;
    const epoch=version, mode=audience;
    form.querySelector('#ob-feedback').textContent='';
    setBusy(form,true);SiaOrb.setState(dialog,'working');
    const values=Object.fromEntries(new FormData(form));if(values.email){expectedEmail=values.email.trim().toLowerCase();profile={name:values.name,email:values.email,countryCode:values.countryCode,mobile:values.mobile};}
    try {
      const result=await content[mode].register(values);
      if(result.pending){if(epoch!==version||!dialog?.isConnected)return;setBusy(form,false);SiaOrb.setState(dialog,'guiding');(result.emailSignup?MobileAuth.requestEmailConfirmation:MobileAuth.requestConfirmation)(form,result);return;}
      if(epoch!==version||!dialog?.isConnected)return;
      setBusy(form,false);
      if(result.signedIn&&Account.user?.email?.toLowerCase()!==expectedEmail)throw new Error('Your signed-in account changed. Close this form and continue with the correct account.');
      if(result.signedIn){success=true;form.reset();dialog.close();dialog.innerHTML='';document.body.classList.remove('ob-modal-open');busy=false;Account.navigate(result.next);return;}
      form.reset();
      success=true;
      const title=result.created?'Your account is ready.':'You’re already signed in.';
      const description=result.signedIn?(mode==='distributor'?'Your personal account is signed in. Continue to the separate company setup step.':'Your personal customer account is signed in. Continue to your solar journey.'):'Your account was created, but a signed-in session could not be confirmed. Log in to continue; you do not need to register again.';
      dialog.innerHTML=`<div class="ob-shell ob-success"><button type="button" class="ob-close" data-ob-close aria-label="Close onboarding">${icon('close')}</button><span class="ob-success-icon">${icon('check')}</span><p class="ob-badge">${result.created?'REGISTRATION CONFIRMED':'EXISTING ACCOUNT'}</p><h2 id="ob-title" tabindex="-1">${title}</h2><p id="ob-intro">${description}</p>${link(result.next,result.signedIn?(result.next==='/invitation'?'Continue to invitation':mode==='distributor'?'Continue to company setup':'Continue your solar journey'):'Log in to continue','ob-submit')}<p class="ob-boundary">${mode==='distributor'?'Company details, ownership and approval are handled by the existing company onboarding flow.':'Your existing account permissions remain in force.'}</p></div>`;
      dialog.querySelector('#ob-title').focus();
      animateIn();
    } catch(error) {
      if(epoch!==version||!dialog?.isConnected)return;
      setBusy(form,false);SiaOrb.setState(dialog,'error');
      const feedback=form.querySelector('#ob-feedback');feedback.textContent=error.message||'Account creation could not be confirmed. Please try again.';feedback.focus();
    } finally {values.password='';values.pin='';values.otp='';}
  }
  function cleanup() {
    version++;controller?.abort();controller=null;
    (dialog?.getAnimations?.({subtree:true})||[]).forEach(animation=>animation.cancel());
    if(dialog?.open)dialog.close();
    if(dialog)dialog.innerHTML='';
    dialog=null;busy=false;success=false;closing=false;returnFocus=null;
    profile=null;expectedEmail='';
    document.body.classList.remove('ob-modal-open');
  }
  function mount(options={}) {
    cleanup();dialog=document.getElementById('onboarding-dialog');if(!dialog)return;
    chooseAudience=options.chooseAudience;
    controller=new AbortController();const {signal}=controller;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change',()=>{if(motion.matches)(dialog?.getAnimations?.({subtree:true})||[]).forEach(animation=>animation.cancel());},{signal});
    dialog.addEventListener('submit',event=>{const form=event.target.closest('[data-onboarding-form]');if(!form)return;event.preventDefault();void submit(form);},{signal});
    dialog.addEventListener('input',event=>{const input=event.target;if(!input.matches('input'))return;input.removeAttribute('aria-invalid');const error=dialog.querySelector('#'+input.id+'-error');if(error)error.textContent='';},{signal});
    dialog.addEventListener('click',event=>{
      if(busy){event.preventDefault();return;}
      if(event.target.closest('[data-ob-close]')){void close();return;}
      if(event.target.closest('[data-ob-back]')){void close(chooseAudience);return;}
      const change=event.target.closest('[data-ob-switch]');if(change){open(change.dataset.obSwitch);return;}
      const anchor=event.target.closest('a');if(anchor?.getAttribute('href')?.startsWith('#/')){event.preventDefault();const target=anchor.getAttribute('href').slice(1);void close(()=>Account.navigate(target));return;}
      if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)void close();}
    },{signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy)void close();},{signal});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&dialog?.open&&!busy){event.preventDefault();void close();}},{signal});
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)void close();}
      if(event.key==='Tab'){
        const nodes=[...dialog.querySelectorAll('button,input,a[href]')].filter(node=>!node.disabled&&!node.inert&&node.getClientRects().length);
        if(event.shiftKey&&event.target===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}
        else if(!event.shiftKey&&event.target===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}
      }
    },{signal});
  }
  function sessionChanged(previous,next){if(!dialog?.open||previous.user?.id===next.user?.id)return;if(busy&&next.user?.email?.toLowerCase()===expectedEmail&&next.user.accountType===(Organization.hasInvitation()&&Organization.registrationAccountType?Organization.registrationAccountType():audience==='distributor'?'business':'customer'))return;cleanup();}
  function restart(){const saved=profile;open(audience);if(saved&&dialog){for(const [key,value] of Object.entries(saved))if(dialog.querySelector(`[name="${key}"]`))dialog.querySelector(`[name="${key}"]`).value=value;dialog.querySelector('[name=mobile]')?.focus();}}
  function isOpen(){if(dialog&&!dialog.isConnected){cleanup();return false;}return Boolean(dialog?.open);}
  return {markup,mount,open,cleanup,sessionChanged,restart,isOpen};
})();

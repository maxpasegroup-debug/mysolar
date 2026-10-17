/* Audience-specific presentation over the existing personal-account API. No credentials are persisted. */
const Onboarding = (() => {
  const content = {
    customer: { badge:'YOUR SOLAR JOURNEY', heading:'A brighter beginning.', introduction:'Start your solar journey with MY Solar Solutions. Create your account and discover the possibilities.', submit:'Create customer account', login:()=>Journey.authPath('/customer/login'), register:data=>Account.registerCustomer(data), symbol:'sun' },
    distributor: { badge:'DISTRIBUTOR ONBOARDING', heading:'Build your solar business with us.', introduction:'Create your account to begin setting up your distributor business on MY Solar Solutions.', submit:'Create distributor account', login:()=>'/distributor/login?journey=distributor', register:data=>Account.registerDistributor(data), symbol:'box' }
  };
  let dialog, controller, audience, busy=false, success=false, closing=false, returnFocus, chooseAudience, version=0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const markup = () => '<dialog id="onboarding-dialog" class="ob-dialog" aria-labelledby="ob-title" aria-describedby="ob-intro"></dialog>';
  function fields() {
    return `<label for="ob-name">Your name<input id="ob-name" name="name" autocomplete="name" maxlength="100" required aria-describedby="ob-name-error"><small id="ob-name-error" class="ob-field-error"></small></label><label for="ob-email">Email address<input id="ob-email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="ob-email-error"><small id="ob-email-error" class="ob-field-error"></small></label><label for="ob-password">Password<input id="ob-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required aria-describedby="ob-password-hint ob-password-error"><small id="ob-password-hint" class="ob-hint">Use 12–128 characters, as required by your account.</small><small id="ob-password-error" class="ob-field-error"></small></label>`;
  }
  function formMarkup(mode) {
    const c=content[mode];
    return `<div class="ob-shell"><div class="ob-decoration" aria-hidden="true"><span class="ob-sun"></span><span class="ob-grid"></span></div><div class="ob-top"><button type="button" class="ob-back" data-ob-back>← Choose your journey</button><button type="button" class="ob-close" data-ob-close aria-label="Close onboarding">${icon('close')}</button></div><div class="ob-heading"><span class="ob-badge">${icon(c.symbol)}${c.badge}</span><h2 id="ob-title" tabindex="-1">${c.heading}</h2><p id="ob-intro">${c.introduction}</p></div>${mode==='distributor'?'<div class="ob-business-steps"><span><b>01</b> Personal account</span><i aria-hidden="true"></i><span><b>02</b> Company setup</span></div><p class="ob-separation">Your personal account is the first step. Company setup follows after you sign in.</p>':''}<form data-onboarding-form="${mode}" novalidate>${fields()}<div id="ob-feedback" class="ob-feedback" role="alert" tabindex="-1"></div><button type="submit" class="ob-submit">${c.submit}${icon('arrow')}</button><p class="ob-progress" role="status" aria-live="polite"></p></form><div class="ob-links">${link(c.login(),'Already registered? Log in')}${link('/products','Explore solar first')}</div><p class="ob-boundary">${mode==='distributor'?'This creates your personal account. It does not create or approve a company or grant distributor permissions.':'Customer signup creates your personal customer profile. It grants no company or platform administration privileges.'}</p><div class="ob-switch"><span>${mode==='customer'?'Here for your solar business?':'Looking for solar for your property?'}</span><button type="button" data-ob-switch="${mode==='customer'?'distributor':'customer'}">${mode==='customer'?'Choose distributor onboarding':'Choose customer onboarding'}</button></div></div>`;
  }
  function animateIn() {
    if(reduced()||!dialog.animate)return;
    dialog.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function open(mode,focusTarget) {
    if(!content[mode]||busy||!dialog)return;
    if(Account.user){Account.navigate(mode==='distributor'?'/distributor/onboarding':Journey.destination()||'/customer/dashboard');return;}
    version++;
    audience=mode;success=false;closing=false;returnFocus=focusTarget||returnFocus;
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
    if(!reduced()&&current.animate)try{await current.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(5px) scale(.985)'}],{duration:140,easing:'ease-in',fill:'forwards'}).finished;}catch{}
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
    for(const input of form.querySelectorAll('input')) {
      const valid=input.checkValidity()&&(input.name!=='name'||Boolean(input.value.trim()));
      input.setAttribute('aria-invalid',String(!valid));
      form.querySelector('#'+input.id+'-error').textContent=valid?'':input.validity.valid?'Enter your name.':input.validationMessage;
      if(!valid&&!first)first=input;
    }
    first?.focus();return !first;
  }
  function setBusy(form,value) {
    busy=value;form.setAttribute('aria-busy',String(value));
    form.querySelectorAll('input').forEach(input=>input.readOnly=value);
    dialog.querySelectorAll('button').forEach(button=>button.disabled=value);
    dialog.querySelectorAll('a').forEach(anchor=>{anchor.inert=value;});
    form.querySelector('.ob-submit').innerHTML=value?'<span class="ob-spinner" aria-hidden="true"></span>Creating your account…':content[audience].submit+icon('arrow');
    form.querySelector('.ob-progress').textContent=value?'Creating your account securely. Please wait before closing.':'';
  }
  async function submit(form) {
    if(busy||closing||success||!validate(form))return;
    const epoch=version, mode=audience;
    form.querySelector('#ob-feedback').textContent='';
    setBusy(form,true);
    const values=Object.fromEntries(new FormData(form));
    try {
      const result=await content[mode].register(values);
      if(epoch!==version||!dialog?.isConnected)return;
      setBusy(form,false);
      form.reset();
      success=true;
      const title=result.created?'Your account is ready.':'You’re already signed in.';
      const description=result.signedIn?(mode==='distributor'?'Your personal account is signed in. Continue to the separate company setup step.':'Your personal customer account is signed in. Continue to your solar journey.'):'Your account was created, but a signed-in session could not be confirmed. Log in to continue; you do not need to register again.';
      dialog.innerHTML=`<div class="ob-shell ob-success"><button type="button" class="ob-close" data-ob-close aria-label="Close onboarding">${icon('close')}</button><span class="ob-success-icon">${icon('check')}</span><p class="ob-badge">${result.created?'REGISTRATION CONFIRMED':'EXISTING ACCOUNT'}</p><h2 id="ob-title" tabindex="-1">${title}</h2><p id="ob-intro">${description}</p>${link(result.next,result.signedIn?(result.next==='/invitation'?'Continue to invitation':mode==='distributor'?'Continue to company setup':'Continue your solar journey'):'Log in to continue','ob-submit')}<p class="ob-boundary">${mode==='distributor'?'Company details, ownership and approval are handled by the existing company onboarding flow.':'Your existing account permissions remain in force.'}</p></div>`;
      dialog.querySelector('#ob-title').focus();
      animateIn();
    } catch(error) {
      if(epoch!==version||!dialog?.isConnected)return;
      setBusy(form,false);
      const feedback=form.querySelector('#ob-feedback');feedback.textContent=error.message||'Account creation could not be confirmed. Please try again.';feedback.focus();
    } finally {values.password='';}
  }
  function cleanup() {
    version++;controller?.abort();controller=null;
    (dialog?.getAnimations?.({subtree:true})||[]).forEach(animation=>animation.cancel());
    if(dialog?.open)dialog.close();
    if(dialog)dialog.innerHTML='';
    dialog=null;busy=false;success=false;closing=false;returnFocus=null;
    document.body.classList.remove('ob-modal-open');
  }
  function mount(options={}) {
    cleanup();dialog=document.getElementById('onboarding-dialog');if(!dialog)return;
    chooseAudience=options.chooseAudience;
    controller=new AbortController();const {signal}=controller;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change',()=>{if(motion.matches)(dialog?.getAnimations?.({subtree:true})||[]).forEach(animation=>animation.cancel());},{signal});
    dialog.addEventListener('submit',event=>{const form=event.target.closest('[data-onboarding-form]');if(!form)return;event.preventDefault();void submit(form);},{signal});
    dialog.addEventListener('input',event=>{const input=event.target;if(!input.matches('input'))return;input.removeAttribute('aria-invalid');dialog.querySelector('#'+input.id+'-error').textContent='';},{signal});
    dialog.addEventListener('click',event=>{
      if(busy){event.preventDefault();return;}
      if(event.target.closest('[data-ob-close]')){void close();return;}
      if(event.target.closest('[data-ob-back]')){void close(chooseAudience);return;}
      const change=event.target.closest('[data-ob-switch]');if(change){open(change.dataset.obSwitch);return;}
      const anchor=event.target.closest('a');if(anchor){event.preventDefault();const target=anchor.getAttribute('href').slice(1);void close(()=>Account.navigate(target));return;}
      if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)void close();}
    },{signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy)void close();},{signal});
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)void close();}
      if(event.key==='Tab'){
        const nodes=[...dialog.querySelectorAll('button,input,a[href]')].filter(node=>!node.disabled&&!node.inert&&node.getClientRects().length);
        if(event.shiftKey&&event.target===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}
        else if(!event.shiftKey&&event.target===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}
      }
    },{signal});
  }
  return {markup,mount,open,cleanup,isOpen:()=>Boolean(dialog?.open)};
})();

/* Private company setup draft flow. Drafts contain no authentication credentials. */
window.SiaWelcome=(()=>{
 const e=x=>escapeHTML(x??'');let pending=null,dismissedInMemory=false;
 const resumeUrl='/distributor/dashboard?setup=1',dismissKey=()=>`mysolar-company-setup-dismissed:${Account.user?.id||'user'}`;
 function setupDismissed(){if(dismissedInMemory)return true;try{return localStorage.getItem(dismissKey())==='1';}catch{return false;}}
 function rememberLater(){dismissedInMemory=true;try{localStorage.setItem(dismissKey(),'1');}catch{}}
 function business(){
  const user=Account.user,companies=Account.session.companies||[];
  return `<section class="precompany-dashboard"><header class="precompany-welcome"><p class="eyebrow">MY SOLAR BUSINESS WORKSPACE</p><h1>Welcome, ${e(user.name)}.</h1><p>Your company workspace starts with a few simple details.</p></header>${companies.length?`<section class="panel precompany-next"><p class="eyebrow">YOUR NEXT STEP</p><h2>Choose a company</h2><p>You already have a company workspace. Open it to continue.</p>${link('/companies','Choose my company','btn primary')}</section>`:`<section class="panel precompany-next"><div class="precompany-sia">${SiaOrb.markup({size:'small',label:'SIA setup guide'})}<span><strong>SIA setup guide</strong><small>One step at a time. You can save and return later.</small></span></div><p class="eyebrow">YOUR NEXT STEP</p><h2>${pending?.draft?'Continue company setup':'Set up your company'}</h2><p>Add your company details, customer listing, products and planned team. You can invite employees before choosing a subscription.</p>${link(resumeUrl,pending?.draft?'Resume setup':'Start company setup','btn primary')}</section><p class="precompany-note">Company setup and planned team invitations are available first. Choose a subscription when you are ready to start Solar OS work.</p>`}</section>`;
 }
 function setup(){
  const showDashboard=new URLSearchParams(location.hash.split('?')[1]||'').get('setup')==='1',resourceKey=showDashboard?'/distributor/dashboard':'/distributor/onboarding';
  return Account.resource(resourceKey,'/auth/setup-draft',data=>{
   pending={...data,owner:Account.user.id};
   const modal='<dialog class="scs-dialog" aria-labelledby="scs-dialog-title"><header><div><strong id="scs-dialog-title">Company setup</strong><small>Save your progress and come back later.</small></div><button type="button" class="btn secondary" data-save-setup-draft data-finish-later>Save and finish later</button></header><div class="scs-dialog-content">'+SiaCompanySetup.page({catalogue:data.catalogue},Account.user)+'</div></dialog>';
   return showDashboard?business()+modal:modal;
  });
 }
 function restore(form){
  if(!form||!pending||pending.owner!==Account.user?.id||form.dataset.draftRestored)return;
  form.dataset.draftRestored='true';form.dataset.draftRevision=pending.revision||'';
  if(!pending.draft)return;
  const d=pending.draft;
  for(const [name,value] of Object.entries(d.fields||{})){
   const control=form.elements.namedItem(name);
   if(control?.length&&control[0]?.type==='radio'){for(const radio of control)radio.checked=radio.value===value;}
   else if(control){control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  form.querySelectorAll('[name=planProducts]').forEach(x=>x.checked=(d.products||[]).includes(x.value));
  form.querySelectorAll('[name=listingServices]').forEach(x=>x.checked=(d.listingServices||[]).includes(x.value));
  if(form.elements.marketplaceRequested&&d.marketplaceRequested!==undefined)form.elements.marketplaceRequested.checked=d.marketplaceRequested;
  for(const item of d.team||[]){const role=form.querySelector('[data-scs-role="'+item.role+'"]'),count=form.querySelector('[data-scs-count="'+item.role+'"]');if(role)role.checked=true;if(count){count.value=item.count;count.disabled=false;}}
  const sameEmail=form.querySelector('[data-scs-email]');if(sameEmail){sameEmail.checked=form.elements.email.value===Account.user.email;form.elements.email.readOnly=sameEmail.checked;}
  const samePhone=form.querySelector('[data-scs-whatsapp]');if(samePhone){samePhone.checked=form.elements.whatsapp.value===form.elements.emergencyContact.value;form.elements.whatsapp.readOnly=samePhone.checked;}
  const step=d.flowVersion===2?Number(d.step||0):(Number(d.step||0)>0?Number(d.step)+1:0);
  SiaCompanySetup.resume(form,step);
 }
 function decorate(){
  const modal=document.querySelector('.scs-dialog');
  if(modal&&!modal.open){try{modal.showModal();}catch{modal.setAttribute('open','');}modal.querySelector('#account-company-create [name=name]')?.focus({preventScroll:true});}
  const form=document.querySelector('#account-company-create');restore(form);
  if(form&&!form.querySelector('.scs-draft-status'))form.querySelector('.scs-actions')?.insertAdjacentHTML('beforeend','<p class="scs-draft-status" role="status" tabindex="-1"></p>');
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-save-setup-draft]');if(!button)return;
  const form=button.closest('form')||document.querySelector('#account-company-create');if(!form)return;
  const feedback=form.querySelector('.scs-draft-status');if(!feedback)return;
  button.disabled=true;
  try{
   const fields={};for(const name of ['operationKey','name','email','website','emergencyContact','whatsapp','countryCode','state','district','districtOther','city','pin','businessPreset','otherProducts','listingDescription','logoUrl','serviceAreas']){const value=new FormData(form).get(name);if(typeof value==='string')fields[name]=value;}
   const draft={flowVersion:2,fields,step:Number(form.dataset.step||0),products:[...form.querySelectorAll('[name=planProducts]:checked')].map(x=>x.value),listingServices:[...form.querySelectorAll('[name=listingServices]:checked')].map(x=>x.value),marketplaceRequested:form.elements.marketplaceRequested?.checked,team:[...form.querySelectorAll('[data-scs-role]:checked')].map(r=>({role:r.dataset.scsRole,count:Number(form.querySelector('[data-scs-count="'+r.dataset.scsRole+'"]').value||0)}))};
   const result=await Account.api('/auth/setup-draft','PUT',{revision:form.dataset.draftRevision||null,draft});form.dataset.draftRevision=result.revision;
   if(pending?.owner===Account.user?.id){pending.draft=draft;pending.revision=result.revision;}
   if(button.hasAttribute('data-finish-later')){rememberLater();Account.navigate('/distributor/dashboard');return;}
   feedback.textContent='Draft saved. You can reopen Company setup from your workspace menu.';feedback.focus();
  }catch(error){feedback.textContent=error.message;feedback.focus();}
  finally{button.disabled=false;}
 });
 document.addEventListener('cancel',event=>{if(!event.target.matches?.('.scs-dialog'))return;event.preventDefault();event.target.querySelector('[data-save-setup-draft]')?.click();},true);
 return {business,setup,setupDismissed};
})();

/* Shared India location controls for company setup and customer enquiries. */
window.CompanyLocation=(()=>{
 const other='__other__',e=value=>escapeHTML(value??'');
 const find=(items,value)=>items.find(item=>item.toLowerCase()===String(value||'').toLowerCase())||'';
 function options(items,current,prompt){return `<option value="">${e(prompt)}</option>`+items.map(item=>`<option value="${e(item)}" ${item===current?'selected':''}>${e(item)}</option>`).join('');}
 function districts(state,current=''){
  const items=IndiaGeography[state]||[],saved=find(items,current),custom=Boolean(current&&!saved);
  return `<label>${t('District')}<select name="district" required ${state?'':'disabled'} autocomplete="address-level2">${options(items,saved,t(state?'Choose district':'Choose state first'))}<option value="${other}" ${custom?'selected':''}>${t('Other / district not listed')}</option></select></label><label data-district-other ${custom?'':'hidden'}>${t('District name')}<input name="districtOther" value="${custom?e(current):''}" maxlength="100" ${custom?'required':''} ${custom?'':'disabled'} autocomplete="address-level2"></label>`;
 }
 function fields(profile={}){
  const saved=find(Object.keys(IndiaGeography),profile.state);
  return `<div data-company-location><label>${t('Country')}<select name="countryCode" required autocomplete="country"><option value="IN" selected>${t('India')}</option></select></label><p class="fine-print">${t('Company onboarding currently supports India.')}</p><label>${t('State / Union territory')}<select name="state" required autocomplete="address-level1">${options(Object.keys(IndiaGeography),saved,t('Choose state / Union territory'))}</select></label><div data-district-fields>${districts(saved,profile.district)}</div><p class="fine-print">${t('District renamed or missing? Choose Other / district not listed and enter its name.')}</p>${profile.state&&!saved?`<p class="fine-print" role="status">${t('Previously saved state')}: ${e(profile.state)}. ${t('Please choose a state to update this address.')}</p>`:''}</div>`;
 }
 function values(form){
  if(!form.querySelector('[data-company-location]'))return {};
  const district=form.elements.district.value===other?form.elements.districtOther.value.trim():form.elements.district.value;
  return {countryCode:form.elements.countryCode.value,state:form.elements.state.value,district};
 }
 function searchable(label,name,current='',disabled=false){
  const id='enquiry-location-'+name;
  return `<div data-location-choice="${name}"><input type="hidden" name="${name}" value="${e(current)}" ${disabled?'disabled':''}><label for="${id}">${label} *</label><div class="location-combobox"><input id="${id}" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" required autocomplete="off" autocapitalize="none" spellcheck="false" value="${e(current)}" placeholder="${disabled?'Choose state first':'Select or type to search'}" ${disabled?'disabled':''}><span aria-hidden="true">▾</span><div id="${id}-list" role="listbox" aria-label="${label}" hidden></div></div><small data-location-results role="status" aria-live="polite"></small></div>`;
 }
 function enquiryFields(profile={}){
  const state=find(Object.keys(IndiaGeography),profile.state),district=find(IndiaGeography[state]||[],profile.district);
  return `<div data-enquiry-location>${searchable('State / Union territory','state',state)}<div data-enquiry-district>${searchable('District','district',district,!state)}</div></div>`;
 }
 const choiceFor=target=>target.closest('[data-enquiry-location]')&&target.closest('[data-location-choice]');
 function close(choice){const input=choice.querySelector('[role="combobox"]');input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');choice.querySelector('[role="listbox"]').hidden=true;}
 function resetDistrict(host){host.querySelector('[data-enquiry-district]').innerHTML=searchable('District','district','',!host.querySelector('[name="state"]').value);}
 function open(choice,filter=false){
  const input=choice.querySelector('[role="combobox"]');if(input.disabled)return;
  const host=choice.closest('[data-enquiry-location]'),name=choice.dataset.locationChoice,all=name==='state'?Object.keys(IndiaGeography):(IndiaGeography[host.querySelector('[name="state"]').value]||[]);
  const matches=all.filter(item=>!filter||item.toLowerCase().includes(input.value.trim().toLowerCase())),list=choice.querySelector('[role="listbox"]'),saved=choice.querySelector('[type="hidden"]').value;
  list.innerHTML=matches.map((item,index)=>`<div role="option" id="${input.id}-option-${index}" data-location-option="${e(item)}" aria-selected="${item===saved?'true':'false'}">${e(item)}</div>`).join('')||'<div class="location-no-results">No matches. Try another search.</div>';
  list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
  choice.querySelector('[data-location-results]').textContent=matches.length?`${matches.length} options available.`:'No matches. Choose a listed location.';
 }
 function choose(choice,value){
  const input=choice.querySelector('[role="combobox"]'),saved=choice.querySelector('[type="hidden"]'),changed=saved.value!==value;
  saved.value=value;input.value=value;input.setCustomValidity('');close(choice);
  if(changed&&saved.name==='state')resetDistrict(choice.closest('[data-enquiry-location]'));
  input.focus();close(choice);saved.dispatchEvent(new Event('input',{bubbles:true}));
 }
 document.addEventListener('focusin',event=>{const choice=choiceFor(event.target);if(choice&&event.target.matches('[role="combobox"]'))open(choice);});
 document.addEventListener('input',event=>{
  const input=event.target,choice=choiceFor(input);if(!choice||!input.matches('[role="combobox"]'))return;
  const saved=choice.querySelector('[type="hidden"]');saved.value='';input.setCustomValidity('Choose a location from the dropdown.');
  if(saved.name==='state')resetDistrict(choice.closest('[data-enquiry-location]'));open(choice,true);
 });
 document.addEventListener('mousedown',event=>{if(event.target.closest('[data-location-option]'))event.preventDefault();});
 document.addEventListener('click',event=>{
  const choice=choiceFor(event.target),option=event.target.closest('[data-location-option]');
  document.querySelectorAll('[data-enquiry-location] [data-location-choice]').forEach(item=>{if(item!==choice)close(item);});
  if(option&&choice)choose(choice,option.dataset.locationOption);else if(choice&&event.target.matches('[role="combobox"]'))open(choice,!choice.querySelector('[type="hidden"]').value);
 });
 document.addEventListener('keydown',event=>{
  const input=event.target,choice=choiceFor(input);if(!choice||!input.matches('[role="combobox"]')||input.disabled)return;
  if(event.key==='Escape'){event.preventDefault();close(choice);return;}if(event.key==='Tab'){close(choice);return;}
  if(!['ArrowDown','ArrowUp','Enter','Home','End'].includes(event.key))return;
  const expanded=input.getAttribute('aria-expanded')==='true';if(!expanded&&['Home','End','Enter'].includes(event.key))return;
  event.preventDefault();if(!expanded)open(choice,!choice.querySelector('[type="hidden"]').value);
  const options=[...choice.querySelectorAll('[role="option"]')];if(!options.length)return;
  const active=options.findIndex(item=>item.id===input.getAttribute('aria-activedescendant'));
  if(event.key==='Enter'){if(active>=0)choose(choice,options[active].dataset.locationOption);return;}
  const index=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?Math.min(active+1,options.length-1):active<0?options.length-1:Math.max(active-1,0);
  options.forEach((item,i)=>item.classList.toggle('location-active',i===index));input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});
 });
 document.addEventListener('focusout',event=>{const choice=choiceFor(event.target);if(choice&&!choice.contains(event.relatedTarget))close(choice);});
 document.addEventListener('change',event=>{
  const host=event.target.closest('[data-company-location]');if(!host)return;
  if(event.target.name==='state')host.querySelector('[data-district-fields]').innerHTML=districts(event.target.value);
  if(event.target.name==='district'){
   const label=host.querySelector('[data-district-other]'),input=label.querySelector('input'),custom=event.target.value===other;
   label.hidden=!custom;input.disabled=!custom;input.required=custom;if(custom)input.focus();
  }
 });
 return {fields,values,enquiryFields};
})();

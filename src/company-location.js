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
 function searchable(label,name,items,current='',disabled=false){
  return `<div data-location-choice="${name}"><label>Search ${label.toLowerCase()}<input type="search" data-location-search="${name}" aria-label="Search ${label.toLowerCase()}" autocomplete="off" autocapitalize="none" spellcheck="false" ${disabled?'disabled':''}></label><label>${label} *<select name="${name}" required autocomplete="off" ${disabled?'disabled':''}>${options(items,current,disabled?'Choose state first':'Choose '+label.toLowerCase())}</select></label><small data-location-results role="status" aria-live="polite"></small></div>`;
 }
 function enquiryFields(profile={}){
  const state=find(Object.keys(IndiaGeography),profile.state),district=find(IndiaGeography[state]||[],profile.district);
  return `<div data-enquiry-location>${searchable('State / Union territory','state',Object.keys(IndiaGeography),state)}<div data-enquiry-district>${searchable('District','district',IndiaGeography[state]||[],district,!state)}</div></div>`;
 }
 document.addEventListener('input',event=>{
  const input=event.target,host=input.closest('[data-enquiry-location]');if(!host||!input.dataset.locationSearch)return;
  const name=input.dataset.locationSearch,choice=input.closest('[data-location-choice]'),select=choice.querySelector('select'),current=select.value;
  const all=name==='state'?Object.keys(IndiaGeography):(IndiaGeography[host.querySelector('[name="state"]').value]||[]),matches=all.filter(item=>item.toLowerCase().includes(input.value.trim().toLowerCase()));
  // Keep the saved selection while searching; only selecting another state changes the district.
  select.innerHTML=options(current&&!matches.includes(current)?[current,...matches]:matches,current,'Choose '+(name==='state'?'state / Union territory':'district'));
  choice.querySelector('[data-location-results]').textContent=matches.length?`${matches.length} matching ${name==='state'?'states / Union territories':'districts'}.`:'No matches. Try another search.';
 });
 document.addEventListener('change',event=>{
  const enquiry=event.target.closest('[data-enquiry-location]');
  if(enquiry&&event.target.name==='state')enquiry.querySelector('[data-enquiry-district]').innerHTML=searchable('District','district',IndiaGeography[event.target.value]||[],'',!event.target.value);
  const host=event.target.closest('[data-company-location]');if(!host)return;
  if(event.target.name==='state')host.querySelector('[data-district-fields]').innerHTML=districts(event.target.value);
  if(event.target.name==='district'){
   const label=host.querySelector('[data-district-other]'),input=label.querySelector('input'),custom=event.target.value===other;
   label.hidden=!custom;input.disabled=!custom;input.required=custom;if(custom)input.focus();
  }
 });
 return {fields,values,enquiryFields};
})();

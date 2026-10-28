/* Shared by company creation and resumable setup; no customer dashboard changes. */
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
 document.addEventListener('change',event=>{
  const host=event.target.closest('[data-company-location]');if(!host)return;
  if(event.target.name==='state')host.querySelector('[data-district-fields]').innerHTML=districts(event.target.value);
  if(event.target.name==='district'){
   const label=host.querySelector('[data-district-other]'),input=label.querySelector('input'),custom=event.target.value===other;
   label.hidden=!custom;input.disabled=!custom;input.required=custom;if(custom)input.focus();
  }
 });
 return {fields,values};
})();

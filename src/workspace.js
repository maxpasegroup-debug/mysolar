/* Shared presentation over existing company setup, permissions and business services. */
window.Workspace=(()=>{
 const presets={
  distributor:{label:'Dealer / distributor',description:'Sell products, manage stock, orders and collections.',services:['solar_panels','inverters','batteries'],rooftop:false},
  installer:{label:'Installer / EPC',description:'Survey sites, prepare quotations and manage installations.',services:['rooftop_installation','maintenance'],rooftop:true},
  both:{label:'Sales and installation',description:'Sell solar equipment and deliver installation work.',services:['solar_panels','inverters','batteries','rooftop_installation','maintenance'],rooftop:true}
 };
 const groups=[
  ['Customers','users',[['/distributor/crm','Follow-ups'],['/distributor/customers','Customers'],['/distributor/leads','Customer enquiries']]],
  ['Quotations','file',[['/distributor/quotations','Quotations']]],
  ['Work','tool',[['/distributor/tasks','My tasks'],['/distributor/field','My field work'],['/distributor/orders','Orders'],['/distributor/projects','Installations'],['/distributor/service','Service requests'],['/distributor/inventory','Inventory'],['/distributor/procurement','Purchases'],['/distributor/suppliers','Suppliers']]],
  ['Money','wallet',[['/distributor/accounts','Customer invoices'],['/distributor/payables','Supplier bills']]],
  ['Team','users',[['/distributor/team','Team'],['/distributor/partners','B2B partners']]],
  ['Company settings','settings',[['/distributor/automation','Reminders & automation'],['/distributor/setup','Company setup'],['/distributor/branding','Brand identity'],['/distributor/service-areas','Service areas'],['/distributor/offers','My offers'],['/distributor/catalogue','Energy catalogue'],['/distributor/subscription','Plan & access status']]]
 ];
 const setupPaths=new Set(['/distributor/setup','/distributor/branding','/distributor/team','/distributor/subscription','/distributor/settings']);
 function navigation(allowed,current,active=true){
  return groups.map(([title,symbol,items])=>({title,symbol,items:items.filter(([url])=>allowed(url)&&(active||setupPaths.has(url))),open:items.some(([url])=>url===current)})).filter(g=>g.items.length);
 }
 function navigationMarkup(current){
  const active=Account.isDemo()||Account.activeCompany?.lifecycle==='active';
  const item=(url,label,symbol)=>link(url,icon(symbol)+`<span>${t(label)}</span>`, `nav-item ${current===url?'active':''}`);
  return item('/distributor/dashboard','Today','grid')+navigation(url=>Account.navAllowed(url),current,active).map(g=>g.items.length===1?item(g.items[0][0],g.items[0][1],g.symbol):`<details class="workspace-nav-group" ${g.open?'open':''}><summary>${icon(g.symbol)}<span>${t(g.title)}</span></summary><div>${g.items.map(([url,label])=>item(url,label,g.symbol)).join('')}</div></details>`).join('')+item('/distributor/notifications','Notifications','bell');
 }
 function presetChoices(value){return `<fieldset class="workspace-presets"><legend>How does your company work?</legend><p class="fine-print">Choose a starting point. You can adjust the services before saving.</p>${Object.entries(presets).map(([key,p])=>`<label><input type="radio" name="businessType" value="${key}" ${key===value?'checked':''} required><span><strong>${escapeHTML(p.label)}</strong><small>${escapeHTML(p.description)}</small></span></label>`).join('')}</fieldset>`;}
 function businessDefaults(data){const preset=presets[data.profile.business_type]||presets.distributor;return data.onboarding.business_saved_at?data.business:{...data.business,services:data.business.services.length?data.business.services:[...preset.services],rooftop_available:data.business.services.length?data.business.rooftop_available:preset.rooftop};}
 function activation(data){
  const c=data.company;
  const messages={draft:'Start with your company profile. Your progress is saved one step at a time.',onboarding:'Finish the saved setup steps, then submit for activation review.',pending_review:'Your setup is awaiting an independent platform review. You can withdraw it to make changes.',active:'Your business workspace is active. Marketplace listing and website publication are separate.',suspended:'This company is suspended. Contact the platform operator; self-reactivation is unavailable.'};
  const next=c.lifecycle==='pending_review'||c.lifecycle==='suspended'?'review':!data.onboarding.profile_saved_at?'profile':!data.onboarding.brand_saved_at?'brand':!data.onboarding.business_saved_at?'business':'review';
  return `<section class="panel workspace-next"><div><p class="eyebrow">YOUR NEXT STEP</p><h2>${escapeHTML(c.lifecycle==='active'?'Start your working day':c.lifecycle==='pending_review'?'Waiting for activation review':c.lifecycle==='suspended'?'Contact the platform operator':'Continue company setup')}</h2><p>${escapeHTML(messages[c.lifecycle]||messages.draft)}</p></div>${link(c.lifecycle==='active'?'/distributor/dashboard':'/distributor/setup?step='+next,(c.lifecycle==='active'?'Open Today':c.lifecycle==='pending_review'||c.lifecycle==='suspended'?'View status':'Continue setup')+' '+icon('arrow'),'btn primary')}</section>`;
 }
 function firstSteps(data){
  const permission=p=>Account.session.permissions.includes(p),counts=data.gettingStarted||{};
  const steps=[
   ['customers.manage','customers','Add your first customer','/distributor/new?kind=contacts','Save a person or business you already work with.'],
   ['crm.manage','leads','Record your first lead','/distributor/new?kind=leads','Choose the customer, owner and next follow-up date.'],
   ['quotations.manage','quotations','Prepare your first quotation','/distributor/leads','Open a customer enquiry, then prepare a private quotation draft. A customer request is required.'],
   ['invitations.manage','employees','Invite your team','/distributor/team','Choose a role and share a private invitation. Each person chooses their own password.']
  ].filter(([p])=>permission(p));
  if(!steps.length)return `<section class="panel workspace-next"><div><h2>Your work, in one place.</h2><p>Open an assigned record below, or use My tasks to see your work. If nothing is assigned, ask your company owner.</p></div>${permission('tasks.own')?link('/distributor/tasks','Open my tasks '+icon('arrow'),'btn primary'):''}</section>`;
  const done=steps.filter(([,key])=>Number(counts[key])>0).length;
  return `<details class="workspace-start panel" ${done<steps.length?'open':''}><summary>Getting started · ${done} of ${steps.length} complete</summary><ol>${steps.map(([,key,title,url,description])=>`<li><span class="workspace-step-state">${Number(counts[key])>0?icon('check'):icon('arrow')}</span><div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(description)}</p>${Number(counts[key])>0?'<small>Saved in your authorised workspace.</small>':link(url,title+' '+icon('arrow'),'text-link')}</div></li>`).join('')}</ol></details>`;
 }
 return {presets,navigation,navigationMarkup,presetChoices,businessDefaults,activation,firstSteps};
})();

/* Shared visual guide. No microphone, speech, model call or external artwork. */
window.SiaOrb=(()=>{
 const states=new Set(['idle','guiding','working','success','error']);let paused=false;
 const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function markup({size='',state='guiding',label='SIA setup guide'}={}){return '<span class="sia-orb '+(['small','large'].includes(size)?'sia-orb-'+size:'')+'" data-sia-orb data-state="'+(states.has(state)?state:'idle')+'" role="img" aria-label="'+escape(label)+'"><span class="sia-orb-halo" aria-hidden="true"></span><span class="sia-orb-core" aria-hidden="true"></span></span>';}
 function setState(host,state){host?.querySelectorAll('[data-sia-orb]').forEach(orb=>{orb.dataset.state=states.has(state)?state:'idle';});}
 const control=()=>'<button type="button" class="text-link sia-motion-control" data-sia-motion aria-pressed="'+paused+'">'+(paused?'Resume SIA animation':'Pause SIA animation')+'</button>';
 document.addEventListener('click',event=>{if(!event.target.closest('button[data-sia-motion]'))return;paused=!paused;document.documentElement.dataset.siaMotion=paused?'paused':'on';document.querySelectorAll('button[data-sia-motion]').forEach(button=>{button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'Resume SIA animation':'Pause SIA animation';});});
 return {markup,setState,control};
})();

/* Shared visual guide. No microphone, speech, model call or external artwork. */
window.SiaOrb=(()=>{
 const states=new Set(['idle','guiding','working','success','error']);
 const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function markup({size='',state='guiding',label='SIA setup guide'}={}){return '<span class="sia-orb '+(['small','large'].includes(size)?'sia-orb-'+size:'')+'" data-sia-orb data-state="'+(states.has(state)?state:'idle')+'" role="img" aria-label="'+escape(label)+'"><span class="sia-orb-halo" aria-hidden="true"></span><span class="sia-orb-core" aria-hidden="true"></span></span>';}
 function setState(host,state){host?.querySelectorAll('[data-sia-orb]').forEach(orb=>{orb.dataset.state=states.has(state)?state:'idle';});}
 return {markup,setState};
})();

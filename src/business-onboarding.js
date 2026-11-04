/* Business entry shares secure customer-style signup; setup belongs in the workspace. */
window.BusinessOnboarding=(()=>{
 let autoHash='';
 function open(focus){if(Account.user){Account.navigate(Account.businessAccount?Account.home:'/customer/dashboard');return;}Onboarding.open('distributor',focus);}
 function mount(){if(Account.session.loading||Account.session.error||Account.user||Onboarding.isOpen())return;const p=location.hash.split('?')[0],q=new URLSearchParams(location.hash.split('?')[1]||'');if((p==='#/register'||p==='#/distributor/onboarding')&&autoHash!==location.hash){autoHash=location.hash;Onboarding.open(p==='#/distributor/onboarding'||q.get('journey')==='distributor'?'distributor':'customer');}}
 document.addEventListener('click',event=>{const trigger=event.target.closest('[data-business-start],[data-customer-start]');if(trigger){if(trigger.hasAttribute('data-customer-start'))Onboarding.open('customer',trigger);else open(trigger);}});
 window.addEventListener('hashchange',()=>{autoHash='';});
 return {open,mount,close:()=>{},sessionChanged:()=>{},isOpen:()=>false};
})();

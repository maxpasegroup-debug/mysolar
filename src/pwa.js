/* No background business operations. Installation is offered only when the browser provides it. */
window.MobileApp=(()=>{
 let prompt=null;
 if('serviceWorker' in navigator&&window.isSecureContext&&location.protocol!=='file:')window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{document.documentElement.dataset.pwa='unavailable';});});
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;document.querySelectorAll('[data-install-app]').forEach(button=>button.hidden=false);});
 window.addEventListener('appinstalled',()=>{prompt=null;document.querySelectorAll('[data-install-app]').forEach(button=>button.hidden=true);});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-install-app]');if(!button)return;void (async()=>{if(!prompt)return;const current=prompt;prompt=null;await current.prompt();await current.userChoice;document.querySelectorAll('[data-install-app]').forEach(node=>node.hidden=true);})();});
 return {installAvailable:()=>Boolean(prompt)};
})();

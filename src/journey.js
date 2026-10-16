/* Route intent only. No credentials, form contents or customer records are persisted. */
window.Journey=(()=>{
 let intent=null,store=null;
 const auth=['/customer/login','/register','/recover','/reset-password'];
 function safe(value){if(typeof value!=='string'||value.length>1800||/[#<>\u0000-\u001f]/u.test(value)||!value.startsWith('/')||value.startsWith('//'))return null;const [route,query='']=value.split('?');if(!(/^\/customer\/[a-z/-]+$/.test(route)&&!auth.includes(route)||['/product','/vendor','/storefront','/products','/vendors'].includes(route)||/^\/storefront\/[0-9a-f-]{36}$/i.test(route)))return null;const params=new URLSearchParams(query);for(const key of params.keys())if(/token|password|secret|csrf/i.test(key))return null;params.delete('next');params.delete('demo');return route+(params.size?'?'+params:'');}
 function capture(){const current=location.hash.slice(1)||'/',route=current.split('?')[0];if(route.startsWith('/customer/')&&!auth.includes(route))intent=safe(current)||intent;else if(auth.includes(route)){const supplied=new URLSearchParams(current.split('?')[1]||'').get('next');if(supplied)intent=safe(supplied)||intent;}}
 capture();window.addEventListener('hashchange',capture);
 return {destination:()=>intent,authPath(value){const [route,query='']=value.split('?'),params=new URLSearchParams(query);if(intent)params.set('next',intent);return route+(params.size?'?'+params:'');},consume(){const value=intent;intent=null;return value;},setStore(value){store={id:value.id,name:value.name};},get store(){return store;},sessionChanged(previous,next){if(previous.user&&previous.user.id!==next.user?.id)intent=null;},safe};
})();

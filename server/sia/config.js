// Optional operator configuration. Nothing in this object is returned to the browser.
const number=(key,fallback,min,max)=>{const n=Number(process.env[key]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Invalid '+key);return n;};
export const settings=Object.freeze({
 enabled:process.env.SIA_ENABLED!=='false',adapter:process.env.SIA_PROVIDER||'disabled',
 endpoint:process.env.SIA_PROVIDER_URL||'',key:process.env.SIA_API_KEY||'',model:process.env.SIA_MODEL||'',
 timeout:number('SIA_TIMEOUT_MS',12000,1000,30000),perMinute:number('SIA_REQUESTS_PER_MINUTE',8,1,30),
 userDaily:number('SIA_USER_DAILY_LIMIT',30,1,10000),companyDaily:number('SIA_COMPANY_DAILY_LIMIT',150,1,100000)
});
export function providerAvailable(){if(settings.adapter!=='json-selector-v1'||!settings.key||!settings.model)return false;try{const u=new URL(settings.endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}

// Fixed, public health paths only: no credentials, customer data or response body.
export async function probeAvailability(origin,{fetchImpl=fetch,timeoutMs=5000}={}){
 const target=new URL(origin);
 if(!['https:','http:'].includes(target.protocol)||target.username||target.password||target.search||target.hash||target.pathname!=='/')throw Error('Invalid monitoring origin');
 const check=async path=>{try{return (await fetchImpl(new URL(path,target),{redirect:'error',signal:AbortSignal.timeout(timeoutMs)})).status;}catch{return null;}};
 const [health,ready]=await Promise.all([check('/healthz'),check('/readyz')]);
 return {health,ready};
}

// Out-of-band fallback: does not require a working database/mail queue.
// Cooldown is process-local; a worker restart can send another alert.
export function fallbackNotifier({send,now=Date.now,cooldownMs=900000}){
 let lastAttempt=null;
 return async()=>{
  const current=now();
  if(lastAttempt!==null&&current-lastAttempt<cooldownMs)return {state:'cooldown'};
  lastAttempt=current;
  try{await send();return {state:'smtp_accepted'};}catch{return {state:'send_failed'};}
 };
}

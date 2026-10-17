import {normalizeHostname,requestHostname} from './hostname.js';

// No process-local cache: suspension/removal is effective on the next lookup, across replicas.
// A future cache must include assignment revision and have reliable cross-process invalidation.
export async function resolveHostname(db,value){
 const hostname=normalizeHostname(value);
 const row=(await db.query(`SELECT d.id,d.company_id,d.hostname,d.revision,d.kind,d.is_primary
   FROM company_domains d JOIN companies c ON c.id=d.company_id
   WHERE d.hostname=$1 AND d.status='active' AND d.verified_at IS NOT NULL AND d.ownership_checked_at IS NOT NULL
   AND d.provider<>'unconfigured' AND d.provider_hostname_id IS NOT NULL
   AND d.provider_hostname_status='active' AND d.certificate_status='active' AND d.provider_checked_at IS NOT NULL
   AND c.status='active' AND c.lifecycle='active'`,[hostname])).rows[0];
 return row?Object.freeze({...row,context:'public_website'}):null;
}

export function hostnameBoundary({db,origin,production}){
 const originHost=new URL(origin).hostname.toLowerCase();
 const platform=!production&&['localhost','127.0.0.1','[::1]'].includes(originHost)?originHost:normalizeHostname(originHost);
 return async(req,res,next)=>{
  // Exact operational paths and methods only; no tenant content or session access here.
  if(['GET','HEAD'].includes(req.method)&&['/healthz','/readyz'].includes(req.path))return next();
  let hostname;
  try{hostname=requestHostname(req,{production});}catch{return res.status(421).set('Cache-Control','no-store').type('text').send('This address is unavailable.');}
  // Forwarded, X-Forwarded-Host and tenant headers never select a website in this foundation.
  if(hostname===platform||!production&&['localhost','127.0.0.1','[::1]'].includes(hostname)){
   req.websiteContext=null;return next();
  }
  res.set('Cache-Control','no-store');
  let domain;
  try{domain=await resolveHostname(db,hostname);}catch{return res.status(503).type('text').send('This website is unavailable.');}
  if(!domain)return res.status(404).type('text').send('This website is unavailable.');
  req.websiteContext=domain;
  // Publishing, domain sessions and authenticated edge context are intentionally not enabled yet.
  // Never render the platform site or route a private API on a company hostname in the meantime.
  return res.status(503).type('text').send('This website is not available yet.');
 };
}

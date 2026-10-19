import {createHash,timingSafeEqual} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest();
export function stagingSettings(env=process.env){
 const enabled=env.STAGING_MODE==='true';
 if(!enabled)return Object.freeze({enabled:false,recipients:[]});
 const origin=new URL(env.APP_ORIGIN);
 if(env.NODE_ENV!=='production'||origin.protocol!=='https:'||!origin.hostname.endsWith('.up.railway.app'))throw new Error('Staging requires production security and a Railway staging HTTPS origin');
 if(!/^[a-zA-Z0-9_-]{3,64}$/.test(env.STAGING_ACCESS_USER||'')||(env.STAGING_ACCESS_PASSWORD||'').length<64)throw new Error('Staging requires independent access credentials');
 const recipients=(env.STAGING_EMAIL_RECIPIENTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(recipients.some(x=>! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(x)))throw new Error('Invalid staging recipient allowlist');
 return Object.freeze({enabled:true,user:env.STAGING_ACCESS_USER,password:env.STAGING_ACCESS_PASSWORD,recipients:Object.freeze(recipients)});
}
export function stagingBoundary(settings){
 const failures=new Map();
 return (req,res,next)=>{
  if(!settings.enabled)return next();
  res.set('X-Robots-Tag','noindex, nofollow, noarchive');
  res.set('Cache-Control','no-store');
  if(['GET','HEAD'].includes(req.method)&&['/healthz','/readyz'].includes(req.path))return next();
  const key=req.ip,now=Date.now();
  for(const [ip,value] of failures)if(value.until<=now)failures.delete(ip);
  const previous=failures.get(key);
  if(previous?.count>=10)return res.status(429).set('Retry-After','60').type('text').send('Too many access attempts. Try again shortly.');
  const header=req.get('authorization')||'';
  let supplied='';if(header.startsWith('Basic ')&&header.length<2048)supplied=Buffer.from(header.slice(6),'base64').toString('utf8');
  if(!timingSafeEqual(hash(supplied),hash(settings.user+':'+settings.password))){
   if(failures.size>=1024&&!failures.has(key))return res.status(429).type('text').send('Access temporarily limited.');
   failures.set(key,{count:(previous?.count||0)+1,until:previous?.until||now+60000});
   return res.status(401).set('WWW-Authenticate','Basic realm="MY Solar private staging", charset="UTF-8"').type('text').send('Private staging. Authorised fictional-data testing only.');
  }
  failures.delete(key);next();
 };
}
export function stagingMailGuard(settings,transport){
 if(!transport||!settings.enabled)return transport;
 return {async sendMail(message){
  // App workflows use one plain mailbox. Reject display names, extra recipients and envelopes.
  const target=typeof message.to==='string'?message.to.trim().toLowerCase():'';
  if(!settings.recipients.includes(target)||message.cc||message.bcc||message.envelope)throw new Error('Staging email recipient is not approved');
  return transport.sendMail({...message,to:target});
 }};
}

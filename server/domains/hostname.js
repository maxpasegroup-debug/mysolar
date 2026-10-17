import {domainToASCII} from 'node:url';
import {isIP} from 'node:net';
import {badInput} from '../errors.js';

const invalid=()=>badInput('Enter a public hostname without a scheme, path, credentials or port.');
const reservedSuffixes=['localhost','local','internal','invalid','test','example','onion'];
export function normalizeHostname(value){
 if(typeof value!=='string'||value.length>1024||!value||/[\s\u0000-\u001f\u007f\/@:#?%\\]/u.test(value))throw invalid();
 // Do not let URL parsing reinterpret dotted-number, escaped, full-width separator or authority forms.
 if(/[\u3002\uff0e\uff61]/u.test(value)||value.endsWith('..'))throw invalid();
 const input=value.endsWith('.')?value.slice(0,-1):value;
 let host;try{host=domainToASCII(input).toLowerCase();}catch{throw invalid();}
 if(!host||host.length>253||isIP(host)||!host.includes('.'))throw invalid();
 const labels=host.split('.');
 if(labels.some(l=>! /^(?:[a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])$/.test(l))||! /^(?:[a-z][a-z0-9-]{1,62})$/.test(labels.at(-1)))throw invalid();
 if(reservedSuffixes.some(s=>host===s||host.endsWith('.'+s)))throw invalid();
 return host;
}

export function classifyHostname(hostname,platformHostname){
 const host=normalizeHostname(hostname),platform=['localhost','127.0.0.1','[::1]'].includes(platformHostname)?null:normalizeHostname(platformHostname);
 if(platform&&(host===platform||host==='www.'+platform))throw badInput('This hostname is reserved for MY Solar Solutions.');
 if(platform&&host.endsWith('.'+platform)){
  const label=host.slice(0,-platform.length-1);
  if(label.includes('.')||['www','api','app','auth','admin','origin','edge','status','mail','cdn','assets','support','platform'].includes(label))throw badInput('Choose an available single company subdomain.');
  return {hostname:host,kind:'platform_subdomain'};
 }
 if(host.endsWith('.railway.app')||host.endsWith('.railway.internal')||host.endsWith('.workers.dev')||host.endsWith('.pages.dev'))throw badInput('Use a company-owned hostname, not a hosting-provider origin.');
 return {hostname:host,kind:'custom'};
}

// Parse the actual HTTP Host authority; Express req.hostname can honor forwarded headers.
export function requestHostname(req,{production=true}={}){
 const raw=req.headers?.host;
 if(typeof raw!=='string'||raw.length>300||/[\s\/@?#%\\\u3002\uff0e\uff61]/u.test(raw))throw invalid();
 const hostHeaders=(req.rawHeaders||[]).filter((_,i,a)=>i%2===0&&a[i].toLowerCase()==='host');
 if(hostHeaders.length>1)throw invalid();
 if(raw.includes(':')&&!(!production&&/^\[::1\](?::[1-9][0-9]{0,4})?$/i.test(raw))&&!/^[^:]+:[1-9][0-9]{0,4}$/.test(raw))throw invalid();
 let url;try{url=new URL('http://'+raw);}catch{throw invalid();}
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw invalid();
 const literal=raw.toLowerCase().replace(/:\d+$/,'');
 if(!production&&['localhost','127.0.0.1','[::1]'].includes(literal)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname.toLowerCase()))return url.hostname.toLowerCase();
 if(url.port&&url.port!=='443'&&url.port!=='80')throw invalid();
 return normalizeHostname(url.hostname);
}

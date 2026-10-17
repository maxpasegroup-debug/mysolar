import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {Resolver} from 'node:dns/promises';

export const verificationName=hostname=>'_mysolar-verification.'+hostname;
const hash=(domain,value)=>createHash('sha256').update(JSON.stringify([domain.id,domain.company_id,domain.hostname,value])).digest('hex');
export function newChallenge(domain,now=Date.now()){
 const value='mysolar-v1='+randomBytes(32).toString('base64url');
 return {hash:hash(domain,value),expires:new Date(now+24*3600000),instructions:{type:'TXT',name:verificationName(domain.hostname),value}};
}
export function proofMatches(domain,records){
 if(!/^[0-9a-f]{64}$/.test(domain.challenge_hash||'')||!Array.isArray(records)||records.length>50)return false;
 return records.some(chunks=>{
  if(!Array.isArray(chunks)||chunks.length>20||chunks.some(s=>typeof s!=='string')||chunks.join('').length>512)return false;
  const actual=Buffer.from(hash(domain,chunks.join('')),'hex'),expected=Buffer.from(domain.challenge_hash,'hex');
  return timingSafeEqual(actual,expected);
 });
}
export async function readOwnershipProof(hostname){
 const resolver=new Resolver({timeout:2500,tries:1});
 let timer;
 try{return await Promise.race([resolver.resolveTxt(verificationName(hostname)),new Promise((_,reject)=>{timer=setTimeout(()=>{resolver.cancel();reject(new Error('DNS_PROOF_TIMEOUT'));},4000);})]);}
 catch{return [];}
 finally{clearTimeout(timer);}
}

import {createHash,randomUUID} from 'node:crypto';
import {audit} from '../db/pool.js';
import {config} from '../config.js';
import {badInput,HttpError} from '../errors.js';
import * as v from '../validation.js';
import {requireFeature,policy} from '../commercial/policy.js';
import {classifyHostname} from './hostname.js';
import {newChallenge,proofMatches,verificationName} from './proof.js';
import {domainProvider} from './provider.js';

export const commands=Object.freeze(['challenge','primary','setup','suspend','remove','reconcile','activate']);
export function commandInput(body){
 v.body(body,['operationKey','revision','reason']);v.uuid(body.operationKey);
 if(!Number.isSafeInteger(body.revision)||body.revision<1)throw badInput('Refresh the domain record before continuing.');
 return {...body,reason:v.text(body.reason,'reason',300,10)};
}
export function publicDomain(row){
 const fields=['id','company_id','hostname','kind','is_primary','status','challenge_expires_at','verified_at','ownership_checked_at','provider','provider_hostname_status','certificate_status','provider_checked_at','revision','created_at','updated_at','deactivated_at'];
 return {...Object.fromEntries(fields.map(k=>[k,row[k]])),verification_record:verificationName(row.hostname)};
}
function canonical(input){return Object.fromEntries(Object.entries(input).sort(([a],[b])=>a.localeCompare(b)));}
function fingerprint(ctx,action,id,input){return createHash('sha256').update(JSON.stringify([ctx.userId,ctx.companyId,action,id,canonical(input)])).digest('hex');}
function conflict(message){return new HttpError(409,'DOMAIN_CHANGED',message);}
export async function domainRecord(db,ctx,id){
 const row=(await db.query('SELECT * FROM company_domains WHERE id=$1 AND company_id=$2 FOR UPDATE',[v.uuid(id),ctx.companyId])).rows[0];
 if(!row)throw new HttpError(404,'DOMAIN_NOT_FOUND','This domain registration was not found.');return row;
}
export function expectDomain(row,input){if(row.revision!==input.revision)throw conflict('This domain changed. Refresh before continuing.');}
export async function replay(db,ctx,action,id,input){
 const old=(await db.query('SELECT id,domain_id,fingerprint,action,status,last_error_code FROM domain_operations WHERE company_id=$1 AND operation_key=$2',[ctx.companyId,input.operationKey])).rows[0];
 if(!old)return null;
 if(old.fingerprint!==fingerprint(ctx,action,id,input))throw conflict('This operation key was already used for different details.');
 const row=await domainRecord(db,ctx,old.domain_id);
 return {domain:publicDomain(row),operation:{id:old.id,action:old.action,status:old.status,last_error_code:old.last_error_code},replayed:true,message:'Previous operation returned. Challenge secrets are not retained; request a new challenge if needed.'};
}
async function recordOperation(db,ctx,action,id,input,{status='succeeded',code='',previous=null}={}){
 const operation={id:randomUUID(),action,status,last_error_code:code};
 const current=await domainRecord(db,ctx,id),state=row=>row?{status:row.status,isPrimary:row.is_primary,revision:row.revision}:null;
 await db.query('INSERT INTO domain_operations(id,company_id,domain_id,operation_key,fingerprint,action,provider,status,last_error_code,actor_user_id,reason,assignment_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[operation.id,ctx.companyId,id,input.operationKey,fingerprint(ctx,action,action==='register'?null:id,input),action,domainProvider.id,status,code,ctx.userId,input.reason,current.revision]);
 await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'domain.'+action,target:id,metadata:{operationId:operation.id,status,code,reason:input.reason,previous:state(previous),current:state(current)}});
 return operation;
}
export async function registerDomain(db,ctx,body){
 v.body(body,['hostname','operationKey','reason']);v.uuid(body.operationKey);
 const normalized=classifyHostname(body.hostname,new URL(config.origin).hostname);
 if(verificationName(normalized.hostname).length>253)throw badInput('This hostname is too long for the ownership-verification record.');
 const input={hostname:normalized.hostname,operationKey:body.operationKey,reason:v.text(body.reason,'reason',300,10)};
 const old=await replay(db,ctx,'register',null,input);if(old)return old;
 await requireFeature(await policy(db,ctx.companyId),'custom_domain');
 // Serialize claims across different companies without introducing a separate tenant store.
 await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[normalized.hostname]);
 if((await db.query("SELECT 1 FROM company_domains WHERE hostname=$1 AND (status<>'removed' OR (provider_hostname_id IS NOT NULL AND provider_hostname_status<>'removed'))",[normalized.hostname])).rowCount)throw new HttpError(409,'DOMAIN_UNAVAILABLE','This hostname is already reserved or awaits provider cleanup.');
 const id=randomUUID(),assignment={id,company_id:ctx.companyId,...normalized},challenge=newChallenge(assignment);
 const row=(await db.query('INSERT INTO company_domains(id,company_id,hostname,kind,challenge_hash,challenge_expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,ctx.companyId,normalized.hostname,normalized.kind,challenge.hash,challenge.expires,ctx.userId])).rows[0];
 const operation=await recordOperation(db,ctx,'register',id,input);
 return {domain:publicDomain(row),operation,challenge:challenge.instructions,message:normalized.kind==='platform_subdomain'?'Subdomain reserved pending proof. A platform DNS operator must publish this TXT challenge. Wildcard DNS/TLS and provider routing are not configured by this request.':'Hostname reserved pending DNS ownership proof. This does not provision DNS, HTTPS or a public website.'};
}
export async function verifyDomain(db,ctx,id,input,proof){
 const old=await replay(db,ctx,'verify',id,input);if(old)return old;
 const row=await domainRecord(db,ctx,id);expectDomain(row,input);
 if(row.status!=='pending'||!row.challenge_expires_at||new Date(row.challenge_expires_at)<=new Date())throw conflict('Request a fresh pending ownership challenge.');
 if(proof.challengeHash!==row.challenge_hash)throw conflict('The ownership challenge changed.');
 const matched=proofMatches(row,proof.records);
 await db.query("UPDATE company_domains SET status=CASE WHEN $1 THEN 'verified' ELSE status END,verified_at=CASE WHEN $1 THEN now() ELSE verified_at END,ownership_checked_at=now(),revision=revision+1,updated_at=now() WHERE id=$2",[matched,id]);
 const operation=await recordOperation(db,ctx,'verify',id,input,{status:matched?'succeeded':'failed',code:matched?'':'DNS_PROOF_NOT_FOUND',previous:row});
 return {domain:publicDomain(await domainRecord(db,ctx,id)),operation,message:matched?'DNS ownership proof matched. The domain is verified, not active; provider, website and authentication readiness are still required.':'No matching DNS ownership proof was found. DNS may be unavailable or still propagating. No verification or activation was granted.'};
}
export async function changeDomain(db,ctx,id,action,input){
 if(!commands.includes(action))throw badInput('Choose a supported domain action.');
 const old=action==='activate'?null:await replay(db,ctx,action,id,input);if(old)return old;
 const row=await domainRecord(db,ctx,id);expectDomain(row,input);
 if(row.status==='removed'&&action!=='remove')throw conflict('Removed registrations cannot be reused. Register again and verify ownership.');
 if(action==='activate')throw new HttpError(409,'DOMAIN_ACTIVATION_UNAVAILABLE','Domain activation is unavailable until verified provider routing, published website content and domain authentication are implemented. No domain was activated.');
 let status='succeeded',code='',challenge;
 if(['setup','reconcile'].includes(action)){
  if(action==='setup'&&!['verified','active'].includes(row.status))throw conflict('Verify ownership before requesting provider setup.');
  await requireFeature(await policy(db,ctx.companyId),'custom_domain');
  // Durable intent only. A future worker must revalidate the assignment before any provider call.
  status='blocked';code='DOMAIN_PROVIDER_UNAVAILABLE';
 }else if(action==='challenge'){
  if(row.status==='active')throw conflict('Suspend an active domain before replacing its ownership challenge.');
  await requireFeature(await policy(db,ctx.companyId),'custom_domain');
  challenge=newChallenge(row);
  await db.query("UPDATE company_domains SET status='pending',is_primary=false,challenge_hash=$1,challenge_expires_at=$2,verified_at=NULL,revision=revision+1,updated_at=now() WHERE id=$3",[challenge.hash,challenge.expires,id]);
 }else if(action==='primary'){
  if(!['verified','active'].includes(row.status))throw conflict('Verify this domain before selecting it as primary.');
  await requireFeature(await policy(db,ctx.companyId),'custom_domain');
  const replaced=await db.query('UPDATE company_domains SET is_primary=false,revision=revision+1,updated_at=now() WHERE company_id=$1 AND is_primary AND id<>$2 RETURNING id',[ctx.companyId,id]);
  for(const old of replaced.rows)await audit(db,{actor:ctx.userId,company:ctx.companyId,action:'domain.primary_replaced',target:old.id,metadata:{newPrimary:id,reason:input.reason}});
  await db.query('UPDATE company_domains SET is_primary=true,revision=revision+1,updated_at=now() WHERE id=$1',[id]);
 }else{
  // Local removal/suspension takes effect before any eventual provider cleanup.
  const removed=action==='remove';
  await db.query("UPDATE company_domains SET status=$1,is_primary=false,challenge_hash=CASE WHEN $2 THEN NULL ELSE challenge_hash END,deactivated_at=now(),revision=revision+1,updated_at=now() WHERE id=$3",[removed?'removed':'suspended',removed,id]);
  if(row.provider_hostname_id){status='blocked';code='DOMAIN_PROVIDER_UNAVAILABLE';}
 }
 const operation=await recordOperation(db,ctx,action,id,input,{status,code,previous:row});
 return {domain:publicDomain(await domainRecord(db,ctx,id)),operation,...(challenge?{challenge:challenge.instructions}:{}),message:status==='blocked'?'Operation recorded but blocked: provider integration is unavailable. No external hostname, DNS or certificate operation was performed.':action==='primary'?'Primary preference saved. This does not publish or activate the website.':'Local domain state saved. No provider operation was performed.'};
}

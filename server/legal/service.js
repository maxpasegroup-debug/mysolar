import {audit} from '../db/pool.js';
import {HttpError,badInput} from '../errors.js';
import {documents,requiredDocuments,reviewed,reviewConfiguration,commercialReady} from './catalogue.js';

// Use the existing durable audit system; do not create a parallel identity/tenant store.
// Fixed action names and locks give idempotent append-only receipts through this service.
export async function acceptDocuments(db,userId,type,submitted,{catalogue=documents,review=reviewConfiguration(),companyId=null}={}){
 if(!Array.isArray(submitted)||submitted.length>6)throw badInput('Choose the exact policy versions shown.');
 const required=requiredDocuments(type).map(d=>d.key),seen=new Set();
 for(const receipt of submitted){if(!receipt||Object.keys(receipt).sort().join(',')!=='digest,key'||seen.has(receipt.key))throw badInput();seen.add(receipt.key);const d=catalogue.find(x=>x.key===receipt.key);if(!d||d.audience==='business'&&type!=='business'||d.digest!==receipt.digest)throw new HttpError(409,'LEGAL_VERSION_CHANGED','Policy versions changed. Review the current documents before accepting.');if(!reviewed(d,review))throw new HttpError(409,'LEGAL_REVIEW_PENDING','These documents are drafts pending professional review; acceptance cannot be recorded as an approved agreement.');}
 if(required.some(key=>!seen.has(key)))throw badInput('Review and accept all required documents.');
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['legal-accept:'+userId+':'+(companyId||'account')]);
 let added=0;
 for(const {key,digest} of submitted){const d=catalogue.find(x=>x.key===key);if((await db.query("SELECT 1 FROM audit_events WHERE actor_user_id=$1 AND action='legal.accepted' AND metadata->>'digest'=$2 AND company_id IS NOT DISTINCT FROM $3::uuid",[userId,digest,companyId])).rowCount)continue;
  await audit(db,{actor:userId,company:companyId,action:'legal.accepted',metadata:{key,digest,version:d.version,snapshot:d,reviewReference:review.documents[key].reference,effectiveAt:review.documents[key].effectiveAt,method:'explicit_checkbox',scope:companyId?'company_owner':'account'}});added++;
 }
 return {added};
}
export async function registerAcceptance(db,userId,type,input){
 const required=requiredDocuments(type),review=reviewConfiguration();
 // Draft documents are never silently converted into accepted legal agreements.
 if(required.every(d=>reviewed(d,review)))return acceptDocuments(db,userId,type,input);
 if(input?.length)throw new HttpError(409,'LEGAL_REVIEW_PENDING','Policies are still drafts. No legal acceptance was recorded.');
}
export async function marketingPreference(db,userId,enabled){
 if(typeof enabled!=='boolean')throw badInput('Choose whether to receive optional marketing email.');
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['legal-marketing:'+userId]);
 const previous=(await db.query("SELECT metadata FROM audit_events WHERE actor_user_id=$1 AND action='legal.marketing_preference' ORDER BY id DESC LIMIT 1",[userId])).rows[0]?.metadata;
 if(previous?.enabled===enabled)return {enabled,changed:false};
 await audit(db,{actor:userId,action:'legal.marketing_preference',metadata:{channel:'email',purpose:'MY Solar product news and optional offers',noticeVersion:'marketing-email-2026-10-30.1',enabled,source:'explicit_preference'}});
 return {enabled,changed:true};
}
export async function marketingAllowed(db,userId){return (await db.query("SELECT metadata->'enabled' AS enabled FROM audit_events WHERE actor_user_id=$1 AND action='legal.marketing_preference' ORDER BY id DESC LIMIT 1",[userId])).rows[0]?.enabled===true;}
export async function assertCommercialAcceptance(db,userId,companyId){
 if(!commercialReady())throw new HttpError(409,'COMMERCIAL_REVIEW_PENDING','Legal and tax approval is pending. No new payment or autopay mandate can be created.');
 for(const doc of requiredDocuments('business'))if(!(await db.query("SELECT 1 FROM audit_events WHERE actor_user_id=$1 AND action='legal.accepted' AND metadata->>'digest'=$2 AND company_id=$3",[userId,doc.digest,companyId])).rowCount)throw new HttpError(409,'LEGAL_ACCEPTANCE_REQUIRED','The company owner must review and accept the current company terms in the Legal & privacy centre before subscribing.');
}

import {createHash,randomUUID} from 'node:crypto';
import {HttpError} from '../errors.js';
import {uuid} from '../validation.js';

const conflict=message=>new HttpError(409,'COMPANY_CREATE_CONFLICT',message);
export function creationIdentity(userId,key,payload){
 if(key!==undefined)uuid(key);
 const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 if(key===undefined)return {id:randomUUID(),fingerprint};
 // UUIDv8 derived from authenticated owner + random client retry key. The key
 // is not authority, and cannot name an arbitrary existing company.
 const hex=createHash('sha256').update('company-create:v1:'+userId+':'+key).digest('hex');
 return {id:`${hex.slice(0,8)}-${hex.slice(8,12)}-8${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`,fingerprint};
}

// Must be called only after lockedUser() in the same transaction. That existing
// user-row lock serializes concurrent creations/retries across sessions/workers.
// Existing immutable company.created audit metadata stores the request digest;
// no parallel persistence system or schema/migration is introduced.
export async function prepareCompanyCreation(db,userId,key,payload){
 const identity=creationIdentity(userId,key,payload);
 if(key!==undefined){
  const existing=(await db.query('SELECT id,created_by FROM companies WHERE id=$1',[identity.id])).rows[0];
  if(existing){
   if(existing.created_by!==userId)throw conflict('This request cannot be reused. Start again from company setup.');
   const member=(await db.query("SELECT 1 FROM company_memberships WHERE company_id=$1 AND user_id=$2 AND role_id='owner' AND status='active'",[identity.id,userId])).rowCount;
   if(!member)throw new HttpError(403,'COMPANY_ACCESS_DENIED','You no longer own this workspace.');
   const original=(await db.query("SELECT metadata FROM audit_events WHERE company_id=$1 AND actor_user_id=$2 AND action='company.created' AND target_id=$1 ORDER BY id LIMIT 1",[identity.id,userId])).rows[0];
   if(original?.metadata?.creationFingerprint!==identity.fingerprint)throw conflict('This request already created a workspace with different details. Open My companies before trying again.');
   return {...identity,replayed:true};
  }
 }
 // A new key after a reload must not silently create another identical owned
 // workspace. Do not automatically select/merge a company based on its name.
 const duplicate=await db.query(`SELECT c.id FROM companies c JOIN company_memberships m ON m.company_id=c.id WHERE m.user_id=$1 AND m.role_id='owner' AND m.status='active' AND lower(c.name)=lower($2) AND lower(c.business_email)=lower($3) AND lower(c.city)=lower($4) LIMIT 1`,[userId,payload.name,payload.email,payload.city]);
 if(duplicate.rowCount)throw new HttpError(409,'COMPANY_ALREADY_EXISTS','You already own a workspace with these company details. Open My companies to continue setup instead of registering it again.');
 return {...identity,replayed:false};
}

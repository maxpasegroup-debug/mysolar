import {randomUUID} from 'node:crypto';
import {audit} from '../db/pool.js';
import {digest} from './security.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';

export async function validateInvitation(db,token,email){
 if(token===undefined)return false;
 const raw=v.text(token,'invitation',43,43);
 if(!/^[A-Za-z0-9_-]{43}$/.test(raw))throw new HttpError(400,'INVALID_INVITATION','This invitation is unavailable or belongs to another address.');
 const result=await db.query(`SELECT 1 FROM (SELECT company_id,email,invited_by,expires_at,status FROM company_invitations WHERE token_hash=$1 UNION ALL SELECT company_id,email,invited_by,expires_at,status FROM customer_access_invitations WHERE token_hash=$1) i JOIN companies c ON c.id=i.company_id JOIN company_memberships m ON m.company_id=c.id AND m.user_id=i.invited_by JOIN users u ON u.id=m.user_id WHERE i.email=$2 AND i.status='pending' AND i.expires_at>now() AND c.status='active' AND c.lifecycle='active' AND m.status='active' AND u.status='active' AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id='invitations.manage')`,[digest(raw),email]);
 if(!result.rowCount)throw new HttpError(400,'INVALID_INVITATION','This invitation is unavailable or belongs to another address.');return true;
}
export async function createIdentity(db,{name,email,passwordHash,emailVerified=false}){
 const id=randomUUID();
 await db.query('INSERT INTO users(id,email,display_name,password_hash,email_verified_at) VALUES($1,$2,$3,$4,CASE WHEN $5 THEN now() END)',[id,email,name,passwordHash,emailVerified]);
 await db.query('INSERT INTO customer_profiles(user_id) VALUES($1)',[id]);
 await audit(db,{actor:id,action:'account.registered',target:id});return id;
}

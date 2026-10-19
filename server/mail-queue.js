import {randomUUID} from 'node:crypto';
import {transaction} from './db/pool.js';
import {mailTransport} from './mail.js';
import {config} from './config.js';
import {seal,unseal} from './auth/sealed.js';

export async function enqueueMail(db,{kind,userId=null,companyId=null,email,referenceHash=null,subject,text,expiresAt}){
 if(!mailTransport)throw Error('MAIL_UNAVAILABLE');
 const id=randomUUID();await db.query('INSERT INTO mail_jobs(id,kind,user_id,company_id,recipient,reference_hash,payload,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,kind,userId,companyId,email,referenceHash,seal({subject,text}),expiresAt]);return id;
}
async function valid(db,j){
 if(j.kind==='operations')return config.opsAlertsEnabled&&j.recipient===config.opsAlertRecipient&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.recipient);
 if(j.kind==='recovery')return (await db.query("SELECT 1 FROM password_reset_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.user_id=$2 AND t.expires_at>now() AND t.used_at IS NULL AND u.email=$3 AND u.status='active'",[j.reference_hash,j.user_id,j.recipient])).rowCount;
 if(j.kind==='verification')return (await db.query("SELECT 1 FROM email_verifications t JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.user_id=$2 AND t.expires_at>now() AND t.email=$3 AND u.email=t.email AND u.status='active' AND u.email_verified_at IS NULL",[j.reference_hash,j.user_id,j.recipient])).rowCount;
 if(['employee','customer'].includes(j.kind)){
  const table=j.kind==='employee'?'company_invitations':'customer_access_invitations';
  const contactGuard=j.kind==='customer'?" AND EXISTS(SELECT 1 FROM company_contacts cc WHERE cc.id=i.contact_id AND cc.company_id=i.company_id AND cc.revision=i.contact_revision AND cc.user_id IS NULL AND lower(cc.email)=i.email) AND EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role_id=m.role_id AND rp.permission_id='customers.manage')":'';
  return (await db.query(`SELECT 1 FROM ${table} i JOIN companies c ON c.id=i.company_id JOIN company_memberships m ON m.company_id=i.company_id AND m.user_id=i.invited_by JOIN users u ON u.id=m.user_id WHERE i.token_hash=$1 AND i.company_id=$2 AND i.email=$3 AND i.status='pending' AND i.expires_at>now() AND c.status='active' AND m.status='active' AND u.status='active' AND EXISTS(SELECT 1 FROM role_permissions p WHERE p.role_id=m.role_id AND p.permission_id='invitations.manage') ${contactGuard}` ,[j.reference_hash,j.company_id,j.recipient])).rowCount;
 }
 if(j.kind==='reminder')return (await import('./automation/engine.js')).emailStillAuthorized(db,j);
 return false; // Reminder delivery must be authorized by its own adapter, never generic free-form mail.
}
export async function mailTick(){
 if(!mailTransport)return {state:'unconfigured'};
 const job=await transaction(async db=>{
  await db.query("UPDATE mail_jobs SET status=CASE WHEN attempts>=5 THEN 'dead' ELSE 'retry' END,available_at=now(),claim_token=NULL,lease_until=NULL,payload=CASE WHEN attempts>=5 THEN NULL ELSE payload END,finished_at=CASE WHEN attempts>=5 THEN now() ELSE finished_at END,last_code='LEASE_EXPIRED' WHERE status='running' AND lease_until<now()");
  const j=(await db.query("SELECT * FROM mail_jobs WHERE status IN ('pending','retry') AND available_at<=now() AND attempts<5 ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!j)return null;
  if(Date.parse(j.expires_at)<=Date.now()||!await valid(db,j)){await db.query("UPDATE mail_jobs SET status='cancelled',payload=NULL,finished_at=now(),last_code='NO_LONGER_VALID' WHERE id=$1",[j.id]);return null;}
  return (await db.query("UPDATE mail_jobs SET status='running',attempts=attempts+1,claim_token=$1,lease_until=now()+interval '2 minutes' WHERE id=$2 RETURNING *",[randomUUID(),j.id])).rows[0];
 });
 if(!job){await transaction(db=>db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('mail',now(),'idle') ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status='idle'"));return {state:'idle'};}let accepted=false;
 try{const body=unseal(job.payload);await mailTransport.sendMail({from:config.mailFrom,to:job.recipient,...body,messageId:'<'+job.id+'@mysolar.solutions>'});accepted=true;}catch{}
 await transaction(async db=>{const j=(await db.query("SELECT * FROM mail_jobs WHERE id=$1 AND status='running' AND claim_token=$2 FOR UPDATE",[job.id,job.claim_token])).rows[0];if(!j)return;
  const state=accepted?'accepted':j.attempts>=5?'dead':'retry';await db.query("UPDATE mail_jobs SET status=$1,payload=CASE WHEN $1 IN ('accepted','dead') THEN NULL ELSE payload END,last_code=$2,claim_token=NULL,lease_until=NULL,available_at=now()+($3::int*interval '1 second'),finished_at=CASE WHEN $1 IN ('accepted','dead') THEN now() END WHERE id=$4",[state,accepted?'SMTP_ACCEPTED':'DELIVERY_FAILED',Math.min(3600,30*2**(j.attempts-1)),j.id]);await db.query('INSERT INTO mail_attempts(job_id,attempt,outcome) VALUES($1,$2,$3)',[j.id,j.attempts,state]);
 });
 await transaction(db=>db.query("INSERT INTO process_heartbeats(name,last_at,last_status) VALUES('mail',now(),$1) ON CONFLICT(name) DO UPDATE SET last_at=now(),last_status=excluded.last_status",[accepted?'accepted':'failure']));
 return {state:accepted?'accepted':'retry',receipt:'SMTP acceptance is not inbox receipt; external delivery is at-least-once.'};
}

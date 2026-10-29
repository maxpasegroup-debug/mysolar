import {Router} from 'express';
import {randomInt,randomUUID} from 'node:crypto';
import {transaction,audit} from '../db/pool.js';
import {config} from '../config.js';
import {mailTransport} from '../mail.js';
import {enqueueMail} from '../mail-queue.js';
import {csrf,issueSession,setSessionCookie} from './sessions.js';
import {limit,privateDigest,safeEqual,hashPassword} from './security.js';
import {seal,unseal} from './sealed.js';
import {createIdentity} from './registration.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';
export const businessSignup=Router();
const invalid=()=>new HttpError(400,'INVALID_SIGNUP_CODE','This verification is invalid or expired. Request a new code in this browser.');
const exists=()=>new HttpError(409,'EMAIL_UNAVAILABLE','This email is already registered. Sign in, or use a different email for your separate business account.');
function ready(req){if(req.session.user_id)throw new HttpError(409,'ALREADY_SIGNED_IN','Use your signed-in workspace, or sign out before creating a separate business account.');if(!mailTransport||!config.dataEncryptionKey)throw new HttpError(503,'SIGNUP_EMAIL_UNAVAILABLE','Verification email is unavailable. No account was created.');}
async function lockEmail(db,email){await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',['verified-signup',email]);}
export function usableBusinessChallenge(row,sessionHash,now=Date.now()){return Boolean(row&&!row.used_at&&row.attempts<5&&Date.parse(row.expires_at)>now&&row.session_hash===sessionHash);}
export function signupDeliveryMessage(state){return {accepted:'The mail server accepted your verification email. This does not confirm inbox delivery; check Inbox and Spam.',retry:'Email delivery is retrying after a failure. No account has been created. You can check again or contact support.',dead:'Email delivery failed. No account has been created. Check the address, request a new code or contact support.',cancelled:'This email request is no longer active. Request a new code.',pending:'Your verification email is waiting for the mail worker. Inbox delivery is not confirmed.',running:'The mail worker is attempting delivery. Inbox delivery is not confirmed.'}[state]||'No delivery confirmation is available. No account has been created.';}
async function challenge(db,req,id){
 const email=(await db.query('SELECT email FROM registration_challenges WHERE id=$1',[id])).rows[0]?.email;if(!email)return null;
 await lockEmail(db,email);const row=(await db.query('SELECT * FROM registration_challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!usableBusinessChallenge(row,req.session.token_hash))return null;
 const context=unseal(row.context);return context.flow==='business_email_first'?row:null;
}
businessSignup.post('/business-signup/request',csrf,async(req,res)=>{
 ready(req);const d=v.body(req.body,['email','previousChallenge'],['email']),email=v.email(d.email);if(d.previousChallenge)v.uuid(d.previousChallenge);
 await limit(req,'email-signup-ip',req.ip,5,3600);await limit(req,'email-signup-address',email,3,3600);await limit(req,'email-signup-cooldown',email,1,60);
 const id=await transaction(async db=>{
  await lockEmail(db,email);if((await db.query('SELECT 1 FROM users WHERE lower(email)=$1',[email])).rowCount)throw exists();
  if(d.previousChallenge)await db.query('UPDATE registration_challenges SET used_at=now(),context=NULL WHERE id=$1 AND session_hash=$2 AND used_at IS NULL',[d.previousChallenge,req.session.token_hash]);
  await db.query('UPDATE registration_challenges SET used_at=now(),context=NULL WHERE email=$1 AND session_hash=$2 AND used_at IS NULL',[email,req.session.token_hash]);
  const id=randomUUID(),code=String(randomInt(0,100000000)).padStart(8,'0'),expires=new Date(Date.now()+900000);
  await db.query('INSERT INTO registration_challenges(id,email,session_hash,code_hash,context,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[id,email,req.session.token_hash,privateDigest('signup:'+id+':'+code),seal({flow:'business_email_first',accountType:'business'}),expires]);
  await enqueueMail(db,{kind:'registration_otp',email,referenceHash:id,subject:'Verify your MY Solar business email',text:'MY SOLAR SOLUTIONS\n\nYour business signup code:\n\n'+code+'\n\nValid for 15 minutes, once, in the browser where you started. Verification does not create a company or activate billing. Never share this code. If you did not request it, ignore this email.',expiresAt:expires});
  await audit(db,{action:'auth.business_signup_code_queued'});return id;
 });res.status(202).json({challenge:id,message:'Verification email queued. Check your inbox and Spam. Delivery is not yet confirmed.'});
});
businessSignup.post('/business-signup/verify',csrf,async(req,res)=>{
 ready(req);const d=v.body(req.body,['challenge','otp']),id=v.uuid(d.challenge);if(typeof d.otp!=='string'||!/^\d{8}$/.test(d.otp))throw invalid();
 await limit(req,'email-signup-confirm-ip',req.ip,20,900);await limit(req,'email-signup-confirm-challenge',id,10,900);
 const result=await transaction(async db=>{const row=await challenge(db,req,id);if(!row)return null;if(row.verified_at)return {email:row.email};if(!safeEqual(row.code_hash,privateDigest('signup:'+id+':'+d.otp))){await db.query('UPDATE registration_challenges SET attempts=attempts+1 WHERE id=$1',[id]);return null;}if((await db.query('SELECT 1 FROM users WHERE lower(email)=$1',[row.email])).rowCount)throw exists();await db.query('UPDATE registration_challenges SET verified_at=now() WHERE id=$1',[id]);await audit(db,{action:'auth.business_email_verified'});return {email:row.email};});
 if(!result)throw invalid();res.json({...result,verified:true,message:'Email verified. Set your name and password to create your account.'});
});
businessSignup.get('/business-signup/status',async(req,res)=>{
 if(!req.session||req.session.user_id)throw invalid();v.body(req.query,['challenge']);const id=v.uuid(req.query.challenge);
 await limit(req,'business-signup-status',req.session.token_hash,30,60);
 const row=await transaction(async db=>{const row=(await db.query('SELECT id,context,used_at,verified_at,expires_at,attempts FROM registration_challenges WHERE id=$1 AND session_hash=$2',[id,req.session.token_hash])).rows[0];if(!row||row.used_at||row.attempts>=5||Date.parse(row.expires_at)<=Date.now()||unseal(row.context).flow!=='business_email_first')throw invalid();if(row.verified_at)return {state:'verified',message:'Your email is verified. Continue account setup.'};const mail=(await db.query("SELECT status FROM mail_jobs WHERE reference_hash=$1 AND kind='registration_otp' ORDER BY created_at DESC LIMIT 1",[id])).rows[0];return {state:mail?.status||'unknown',message:signupDeliveryMessage(mail?.status)};});res.json(row);
});
businessSignup.post('/business-signup/complete',csrf,async(req,res)=>{
 ready(req);const d=v.body(req.body,['challenge','name','password']),id=v.uuid(d.challenge),name=v.text(d.name,'name',100),password=v.password(d.password);
 await limit(req,'business-signup-complete',req.ip,10,900);const passwordHash=await hashPassword(password);
 let issued;try{issued=await transaction(async db=>{const row=await challenge(db,req,id);if(!row?.verified_at)return null;if((await db.query('SELECT 1 FROM users WHERE lower(email)=$1',[row.email])).rowCount)throw exists();const user=await createIdentity(db,{name,email:row.email,passwordHash,accountType:'business',emailVerified:true});await db.query('UPDATE registration_challenges SET used_at=now(),context=NULL WHERE id=$1',[id]);await audit(db,{actor:user,action:'auth.business_signup_completed'});return issueSession(db,user,req.session.token_hash);});}catch(error){if(error.code==='23505')throw exists();throw error;}
 if(!issued)throw invalid();setSessionCookie(res,issued);res.status(201).json({message:'Business account created. Continue company setup.'});
});

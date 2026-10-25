import {Router} from 'express';
import {randomInt,randomUUID} from 'node:crypto';
import {pool,transaction,audit} from '../db/pool.js';
import {config} from '../config.js';
import {mailTransport} from '../mail.js';
import {enqueueMail} from '../mail-queue.js';
import {csrf,issueSession,setSessionCookie} from './sessions.js';
import {limit,privateDigest,safeEqual,hashPassword} from './security.js';
import {seal,unseal} from './sealed.js';
import {accountType} from './account-type.js';
import {createIdentity,validateInvitation} from './registration.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';

export const emailRegistration=Router();
const unavailable=()=>new HttpError(409,'EMAIL_UNAVAILABLE','This email is already registered. Sign in or use a different email for your separate account.');
const invalid=()=>new HttpError(400,'INVALID_SIGNUP_CODE','This code is invalid, expired or no longer available. Request a new code in this browser.');
function ready(req){if(req.session.user_id)throw new HttpError(409,'ALREADY_SIGNED_IN','Sign out before creating another account.');if(!mailTransport||!config.dataEncryptionKey)throw new HttpError(503,'SIGNUP_EMAIL_UNAVAILABLE','Signup verification email is unavailable. No account was created. Please try again later or contact support.');}
async function emailLock(db,email){await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',['verified-signup',email]);}
emailRegistration.post('/register',csrf,async(req,res)=>{
 const input=v.body(req.body,['name','email','password','accountType','invitationToken'],['name','email','password']);
 const name=v.text(input.name,'name',100),email=v.email(input.email),password=v.password(input.password);ready(req);
 if((await pool.query('SELECT 1 FROM users WHERE lower(email)=$1',[email])).rowCount)throw unavailable();const invitation=await validateInvitation(pool,input.invitationToken,email);await limit(req,invitation?'invited-email-signup-ip':'email-signup-ip',req.ip,invitation?30:5,3600);await limit(req,'email-signup-address',email,3,3600);await limit(req,'email-signup-cooldown',email,1,60);
 const passwordHash=await hashPassword(password);
 const challenge=await transaction(async db=>{
  await emailLock(db,email);if((await db.query('SELECT 1 FROM users WHERE lower(email)=$1',[email])).rowCount)throw unavailable();
  const invited=await validateInvitation(db,input.invitationToken,email),type=accountType(input.accountType||invited||'customer');if(invited&&invited!==type)throw new HttpError(400,'INVITATION_ACCOUNT_TYPE','Use the account type required by the invitation.');
  await db.query('UPDATE registration_challenges SET used_at=now(),context=NULL WHERE email=$1 AND session_hash=$2 AND used_at IS NULL',[email,req.session.token_hash]);
  const id=randomUUID(),code=String(randomInt(0,100000000)).padStart(8,'0'),expires=new Date(Date.now()+900000);
  await db.query('INSERT INTO registration_challenges(id,email,session_hash,code_hash,context,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[id,email,req.session.token_hash,privateDigest('signup:'+id+':'+code),seal({name,passwordHash,accountType:type,...(input.invitationToken?{invitationToken:input.invitationToken}:{})}),expires]);
  await enqueueMail(db,{kind:'registration_otp',email,referenceHash:id,subject:'Verify your MY Solar Solutions email',text:'MY SOLAR SOLUTIONS\n\nVerify your '+(type==='business'?'business':'customer')+' signup with this code:\n\n'+code+'\n\nValid for 15 minutes, once, in the browser where you started signup. Your account is not created until you verify this code. Never share it; our team will never ask for it. If you did not request this, ignore this email.',expiresAt:expires});
  await audit(db,{action:'auth.signup_code_queued'});return id;
 });res.status(202).json({challenge,message:'Verification email queued. Enter the eight-digit code to create your account. Check Spam too. Inbox delivery is not yet confirmed.'});
});
emailRegistration.post('/register/confirm',csrf,async(req,res)=>{
 ready(req);const input=v.body(req.body,['challenge','otp']),id=v.uuid(input.challenge);if(typeof input.otp!=='string'||!/^\d{8}$/.test(input.otp))throw invalid();
 await limit(req,'email-signup-confirm-ip',req.ip,20,900);await limit(req,'email-signup-confirm-challenge',id,10,900);
 let issued;try{issued=await transaction(async db=>{
  const lookup=(await db.query('SELECT email FROM registration_challenges WHERE id=$1',[id])).rows[0];if(!lookup)return null;
  await emailLock(db,lookup.email);const row=(await db.query('SELECT * FROM registration_challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row||row.used_at||row.attempts>=5||Date.parse(row.expires_at)<=Date.now()||row.session_hash!==req.session.token_hash)return null;
  if(!safeEqual(row.code_hash,privateDigest('signup:'+id+':'+input.otp))){await db.query('UPDATE registration_challenges SET attempts=attempts+1 WHERE id=$1',[id]);await audit(db,{action:'auth.signup_code_rejected'});return null;}
  if((await db.query('SELECT 1 FROM users WHERE lower(email)=$1',[row.email])).rowCount)throw unavailable();
  const context=unseal(row.context),type=accountType(context.accountType),invited=await validateInvitation(db,context.invitationToken,row.email);if(invited&&invited!==type)throw invalid();
  const userId=await createIdentity(db,{name:context.name,email:row.email,passwordHash:context.passwordHash,accountType:type,emailVerified:true});
  await db.query('UPDATE registration_challenges SET used_at=now(),context=NULL WHERE id=$1',[id]);
  await audit(db,{actor:userId,action:'auth.signup_email_verified'});return issueSession(db,userId,req.session.token_hash);
 });}catch(error){if(error.code==='23505')throw unavailable();throw error;}
 if(!issued)throw invalid();setSessionCookie(res,issued);res.status(201).json({message:'Email verified and account created. You are signed in.'});
});

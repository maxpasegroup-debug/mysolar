import {accountType} from './account-type.js';
import {Router} from 'express';
import {randomInt,randomUUID} from 'node:crypto';
import {pool,transaction,audit} from '../db/pool.js';
import {config} from '../config.js';
import * as v from '../validation.js';
import {HttpError} from '../errors.js';
import {csrf,requireUser,lockedUser,issueSession,setSessionCookie,clearSessionCookie,invalidateAll} from './sessions.js';
import {limit,digest,hashPassword,randomToken,safeEqual} from './security.js';
import {seal,unseal} from './sealed.js';
import {verifySecondFactor} from './protection.js';
import {enqueueMail} from '../mail-queue.js';
import {pinAvailable,pinEmailAvailable,mobileNumber,pinValue,pinDigest,hashPin,verifyPin,verifyAccountCredential} from './pin-security.js';
import {createIdentity,validateInvitation} from './registration.js';

export const pinRoutes=Router();pinRoutes.use(csrf);
const generic='If these details are eligible, a six-digit code will be emailed to the registered recovery address. Check your inbox. Delivery is not yet confirmed.';
const invalid=()=>new HttpError(400,'INVALID_OTP','The code is invalid, expired or no longer available. Request a new code.');
const badLogin=()=>new HttpError(401,'INVALID_CREDENTIALS','The mobile number or PIN is incorrect, or sign-in is temporarily locked. Try again after 15 minutes or reset your PIN.');
let dummyPinHash;
function emailReady(){if(!pinEmailAvailable())throw new HttpError(503,'PIN_EMAIL_UNAVAILABLE','Mobile/PIN setup and recovery email are not configured. No code was sent. Use existing email/password access or contact support.');}
function codeValue(value){if(typeof value!=='string'||!/^\d{6}$/.test(value))throw invalid();return value;}
async function queueCode(db,req,{purpose,email,mobile,userId=null,revision=null,context=null}){
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[mobile+':'+email+':'+(userId||'signup'),'pin-'+purpose]);
 await db.query('UPDATE pin_challenges SET used_at=now() WHERE mobile=$1 AND email=$2 AND purpose=$3 AND user_id IS NOT DISTINCT FROM $4::uuid AND used_at IS NULL',[mobile,email,purpose,userId]);
 const accountLabel=context?.accountType||(userId?(await db.query('SELECT account_type FROM users WHERE id=$1',[userId])).rows[0]?.account_type:null)||'account';
 const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0'),expires=new Date(Date.now()+600000);
 await db.query('INSERT INTO pin_challenges(id,purpose,user_id,email,mobile,session_hash,credential_revision,code_hash,context,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,purpose,userId,email,mobile,req.session.token_hash,revision,pinDigest('otp',id+':'+code),context?seal(context):null,expires]);
 await enqueueMail(db,{kind:'pin_otp',userId,email,referenceHash:id,subject:purpose==='reset'?'Reset your MY Solar PIN':'Verify your MY Solar recovery email',text:'Account: '+accountLabel+'; mobile ending '+mobile.slice(-4)+'. Your MY Solar email verification code is '+code+'. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email.',expiresAt:expires});
 await audit(db,{actor:userId,action:'auth.pin_code_queued',metadata:{purpose}});return id;
}
async function checkedChallenge(db,req,id,purpose,code){
 const row=(await db.query('SELECT * FROM pin_challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!row||row.purpose!==purpose||row.session_hash!==req.session.token_hash||row.used_at||row.attempts>=5||Date.parse(row.expires_at)<=Date.now())return null;
 if(!safeEqual(row.code_hash,pinDigest('otp',id+':'+code))){await db.query('UPDATE pin_challenges SET attempts=attempts+1 WHERE id=$1',[id]);await audit(db,{actor:row.user_id,action:'auth.pin_code_rejected'});return null;}
 return row;
}
pinRoutes.post('/register/request',async(req,res)=>{
 if(req.session.user_id)throw new HttpError(409,'ALREADY_SIGNED_IN','Use Account security to add mobile/PIN to your existing account.');
 emailReady();const input=v.body(req.body,['name','email','mobile','invitationToken','accountType'],['name','email','mobile']);
 const name=v.text(input.name,'name',100),email=v.email(input.email),mobile=mobileNumber(input.mobile);
 const invited=await validateInvitation(pool,input.invitationToken,email);const type=accountType(input.accountType||invited||'customer');if(invited&&invited!==type)throw new HttpError(400,'INVITATION_ACCOUNT_TYPE','Choose the account type required by this invitation.');
 await limit(req,'pin-signup-ip',req.ip,invited?30:5,3600);await limit(req,'pin-signup-email',type+':'+email,3,3600);await limit(req,'pin-signup-mobile',mobile,3,3600);await limit(req,'pin-signup-cooldown',type+':'+email,1,60);
 const challenge=await transaction(async db=>{
  if((await db.query('SELECT 1 FROM users WHERE email=$1 UNION ALL SELECT 1 FROM mobile_credentials WHERE mobile=$2',[email,mobile])).rowCount)return randomUUID();
  return queueCode(db,req,{purpose:'signup',email,mobile,context:{name,accountType:type,...(input.invitationToken?{invitationToken:input.invitationToken}:{})}});
 });res.status(202).json({challenge,message:generic});
});
pinRoutes.post('/register/confirm',async(req,res)=>{
 emailReady();if(req.session.user_id)throw new HttpError(409,'ALREADY_SIGNED_IN','Sign out before creating another account.');
 const input=v.body(req.body,['challenge','otp','pin']),id=v.uuid(input.challenge),code=codeValue(input.otp);pinValue(input.pin,{newPin:true});
 await limit(req,'pin-signup-confirm-ip',req.ip,20,3600);
 const result=await transaction(async db=>{
  const row=await checkedChallenge(db,req,id,'signup',code);if(!row)return null;
  const context=unseal(row.context);await validateInvitation(db,context.invitationToken,row.email);
  const userId=await createIdentity(db,{name:context.name,email:row.email,passwordHash:await hashPassword(randomToken()+randomToken()),emailVerified:true,accountType:accountType(context.accountType)});
  await db.query('INSERT INTO mobile_credentials(user_id,mobile,pin_hash) VALUES($1,$2,$3)',[userId,row.mobile,await hashPin(input.pin)]);
  await db.query('UPDATE pin_challenges SET used_at=now() WHERE id=$1',[id]);
  await audit(db,{actor:userId,action:'auth.pin_enabled'});return issueSession(db,userId,req.session.token_hash);
 });if(!result)throw invalid();setSessionCookie(res,result);res.status(201).json({message:'Email verified and account created. You are signed in.'});
});
pinRoutes.post('/login',async(req,res)=>{
 if(!pinAvailable())throw new HttpError(503,'PIN_UNAVAILABLE','Mobile/PIN sign-in is not configured. Use email and password.');
 const input=v.body(req.body,['mobile','pin','code'],['mobile','pin']),mobile=mobileNumber(input.mobile);pinValue(input.pin);
 await limit(req,'pin-login-ip',req.ip,20);await limit(req,'pin-login-mobile',mobile,10);
 const result=await transaction(async db=>{
  const owner=(await db.query('SELECT user_id FROM mobile_credentials WHERE mobile=$1',[mobile])).rows[0];if(!owner){dummyPinHash||=hashPin('483729');await verifyPin(await dummyPinHash,input.pin);return {error:badLogin()};}
  const user=(await db.query('SELECT id,status,email_verified_at FROM users WHERE id=$1 FOR UPDATE',[owner.user_id])).rows[0];
  const c=(await db.query('SELECT * FROM mobile_credentials WHERE user_id=$1 FOR UPDATE',[owner.user_id])).rows[0];
  if(!user||user.status!=='active'||!user.email_verified_at||!c||c.mobile!==mobile||Date.parse(c.locked_until)>Date.now())return {error:badLogin()};
  const failure=async()=>{const attempts=c.locked_until?1:c.failed_attempts+1;await db.query("UPDATE mobile_credentials SET failed_attempts=$1,locked_until=CASE WHEN $1>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=$2",[attempts,user.id]);await audit(db,{actor:user.id,action:'auth.pin_login_rejected'});return {error:badLogin()};};
  if(!await verifyPin(c.pin_hash,input.pin))return failure();
  if(input.code===undefined&&(await db.query('SELECT 1 FROM account_security WHERE user_id=$1 AND secret IS NOT NULL',[user.id])).rowCount)return {error:new HttpError(403,'MFA_REQUIRED','Enter your authenticator or recovery code to finish signing in.')};
  let mfa;try{mfa=await verifySecondFactor(db,user.id,input.code);}catch(error){if(!(error instanceof HttpError))throw error;return failure();}
  await db.query('UPDATE mobile_credentials SET failed_attempts=0,locked_until=NULL WHERE user_id=$1',[user.id]);
  const memberships=await db.query("SELECT m.company_id FROM company_memberships m JOIN companies c ON c.id=m.company_id WHERE m.user_id=$1 AND m.status='active' AND (c.status='active' OR m.role_id='owner') ORDER BY m.created_at LIMIT 2",[user.id]);
  const issued=await issueSession(db,user.id,req.session.token_hash,memberships.rowCount===1?memberships.rows[0].company_id:null);
  if(mfa)await db.query('UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1',[digest(issued.token)]);
  await audit(db,{actor:user.id,action:'auth.pin_login'});return {issued};
 });if(result.error)throw result.error;setSessionCookie(res,result.issued);res.json({message:'Signed in.'});
});
pinRoutes.post('/enrol/request',requireUser,async(req,res)=>{
 emailReady();const input=v.body(req.body,['mobile','credential','code'],['mobile','credential']),mobile=mobileNumber(input.mobile);
 await limit(req,'pin-enrol',req.session.user_id,3,3600);
 const challenge=await transaction(async db=>{
  const user=await lockedUser(db,req);
  if(!user.email_verified_at)throw new HttpError(403,'EMAIL_VERIFICATION_REQUIRED','Verify your email in Account security first.');
  if(!await verifyAccountCredential(db,user.id,input.credential))throw new HttpError(403,'ACCOUNT_VERIFICATION_REQUIRED','Check your current password or PIN.');
  await verifySecondFactor(db,user.id,input.code);
  if((await db.query('SELECT 1 FROM mobile_credentials WHERE mobile=$1 AND user_id<>$2',[mobile,user.id])).rowCount)throw new HttpError(409,'MOBILE_UNAVAILABLE','This mobile number cannot be used. Contact support if it is yours.');
  return queueCode(db,req,{purpose:'enrol',userId:user.id,email:user.email,mobile});
 });res.status(202).json({challenge,message:'Verification code queued to your verified account email. Delivery is not yet confirmed.'});
});
pinRoutes.post('/enrol/confirm',requireUser,async(req,res)=>{
 emailReady();const input=v.body(req.body,['challenge','otp','pin']),id=v.uuid(input.challenge),code=codeValue(input.otp);pinValue(input.pin,{newPin:true});
 await limit(req,'pin-enrol-confirm',req.session.user_id,10,3600);
 const done=await transaction(async db=>{
  const user=await lockedUser(db,req),row=await checkedChallenge(db,req,id,'enrol',code);
  if(!row||row.user_id!==user.id||row.email!==user.email||!user.email_verified_at)return false;
  await db.query('INSERT INTO mobile_credentials(user_id,mobile,pin_hash) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET mobile=excluded.mobile,pin_hash=excluded.pin_hash,revision=mobile_credentials.revision+1,failed_attempts=0,locked_until=NULL,updated_at=now()',[user.id,row.mobile,await hashPin(input.pin)]);
  await db.query('UPDATE pin_challenges SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
  await invalidateAll(db,user.id,'auth.pin_enabled');return true;
 });if(!done)throw invalid();clearSessionCookie(res);res.json({message:'Mobile/PIN enabled. All sessions signed out. Sign in with your mobile number and PIN.'});
});
pinRoutes.post('/reset/request',async(req,res)=>{
 emailReady();const input=v.body(req.body,['mobile']),mobile=mobileNumber(input.mobile);
 await limit(req,'pin-reset-ip',req.ip,8,3600);await limit(req,'pin-reset-mobile',mobile,3,3600);await limit(req,'pin-reset-cooldown',mobile,1,60);
 const challenge=await transaction(async db=>{
  const owner=(await db.query('SELECT user_id FROM mobile_credentials WHERE mobile=$1',[mobile])).rows[0];if(!owner)return randomUUID();
  const user=(await db.query("SELECT id,email,email_verified_at FROM users WHERE id=$1 AND status='active' FOR UPDATE",[owner.user_id])).rows[0];
  const c=(await db.query('SELECT revision,mobile FROM mobile_credentials WHERE user_id=$1',[owner.user_id])).rows[0];
  if(!user?.email_verified_at||!c||c.mobile!==mobile)return randomUUID();
  return queueCode(db,req,{purpose:'reset',userId:user.id,email:user.email,mobile,revision:c.revision});
 });res.status(202).json({challenge,message:generic});
});
pinRoutes.post('/reset/confirm',async(req,res)=>{
 emailReady();const input=v.body(req.body,['challenge','otp','pin']),id=v.uuid(input.challenge),code=codeValue(input.otp);pinValue(input.pin,{newPin:true});
 await limit(req,'pin-reset-confirm-ip',req.ip,20,3600);
 const done=await transaction(async db=>{
  const owner=(await db.query('SELECT user_id FROM pin_challenges WHERE id=$1 AND purpose=\'reset\'',[id])).rows[0];if(!owner?.user_id)return false;
  const user=(await db.query("SELECT id,email,email_verified_at FROM users WHERE id=$1 AND status='active' FOR UPDATE",[owner.user_id])).rows[0];
  const row=await checkedChallenge(db,req,id,'reset',code);if(!row||!user?.email_verified_at||user.email!==row.email)return false;
  const c=(await db.query('SELECT * FROM mobile_credentials WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];if(!c||c.mobile!==row.mobile||c.revision!==row.credential_revision)return false;
  await db.query('UPDATE mobile_credentials SET pin_hash=$1,revision=revision+1,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE user_id=$2',[await hashPin(input.pin),user.id]);
  await db.query('UPDATE pin_challenges SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[user.id]);await invalidateAll(db,user.id,'auth.pin_reset');
  await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.session.token_hash]);return true;
 });if(!done)throw invalid();clearSessionCookie(res);res.json({message:'PIN reset. All sessions signed out. Sign in again; any enabled authenticator is still required.'});
});

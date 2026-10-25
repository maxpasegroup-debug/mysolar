import {Router} from 'express';
import {randomInt,randomUUID} from 'node:crypto';
import {transaction,audit} from '../db/pool.js';
import {config} from '../config.js';
import {mailTransport} from '../mail.js';
import {enqueueMail} from '../mail-queue.js';
import {csrf,clearSessionCookie,invalidateAll} from './sessions.js';
import {limit,privateDigest,digest,safeEqual,hashPassword} from './security.js';
import {accountType} from './account-type.js';
import {HttpError} from '../errors.js';
import * as v from '../validation.js';

export const passwordReset=Router();passwordReset.use(csrf);
const message='If an eligible account matches, a code will be emailed. Check your inbox and spam folder. This screen does not confirm email delivery.';
const invalid=()=>new HttpError(400,'INVALID_RESET_CODE','This code is invalid, expired or no longer available. Request a new code in this browser.');
function ready(){if(!mailTransport||!config.dataEncryptionKey)throw new HttpError(503,'RECOVERY_UNAVAILABLE','Password recovery email is unavailable. No code was sent. Contact support.');}
passwordReset.post('/request',async(req,res)=>{
 ready();const input=v.body(req.body,['email','accountType']),email=v.email(input.email),type=accountType(input.accountType);
 await limit(req,'password-code-ip',req.ip,20,3600);await limit(req,'password-code-account',type+':'+email,3,3600);await limit(req,'password-code-cooldown',type+':'+email,1,60);
 const challenge=await transaction(async db=>{
  const user=(await db.query("SELECT id,email,password_hash FROM users WHERE email=$1 AND account_type=$2 AND status='active' FOR UPDATE",[email,type])).rows[0];
  if(!user)return randomUUID();
  await db.query('UPDATE password_reset_challenges SET used_at=now() WHERE user_id=$1 AND session_hash=$2 AND used_at IS NULL',[user.id,req.session.token_hash]);
  const id=randomUUID(),code=String(randomInt(0,100000000)).padStart(8,'0'),expires=new Date(Date.now()+900000);
  await db.query('INSERT INTO password_reset_challenges(id,user_id,session_hash,code_hash,credential_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[id,user.id,req.session.token_hash,privateDigest('password-reset:'+id+':'+code),digest(user.password_hash),expires]);
  await enqueueMail(db,{kind:'password_otp',userId:user.id,email:user.email,referenceHash:id,subject:'Reset your MY Solar Solutions password',text:'MY SOLAR SOLUTIONS\n\nYour '+(type==='business'?'business':'customer')+' account password reset code:\n\n'+code+'\n\nThis code is valid for 15 minutes and can be used once, in the browser where you requested it. Enter it with your new password. Never share this code; our team will never ask for it. If you did not request this, ignore this email. Your password has not changed.',expiresAt:expires});
  await audit(db,{actor:user.id,action:'auth.password_code_queued'});return id;
 });res.status(202).json({challenge,message});
});
passwordReset.post('/confirm',async(req,res)=>{
 ready();const input=v.body(req.body,['challenge','otp','password']),id=v.uuid(input.challenge);if(typeof input.otp!=='string'||!/^\d{8}$/.test(input.otp))throw invalid();const password=v.password(input.password);
 await limit(req,'password-code-confirm-ip',req.ip,20,900);await limit(req,'password-code-confirm-challenge',id,10,900);
 const hash=await hashPassword(password);
 const changed=await transaction(async db=>{
  const owner=(await db.query('SELECT user_id FROM password_reset_challenges WHERE id=$1',[id])).rows[0];if(!owner)return false;
  const user=(await db.query("SELECT id,password_hash FROM users WHERE id=$1 AND status='active' FOR UPDATE",[owner.user_id])).rows[0];
  const row=(await db.query('SELECT * FROM password_reset_challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!user||row.used_at||row.attempts>=5||Date.parse(row.expires_at)<=Date.now()||row.session_hash!==req.session.token_hash||row.credential_hash!==digest(user.password_hash))return false;
  if(!safeEqual(row.code_hash,privateDigest('password-reset:'+id+':'+input.otp))){await db.query('UPDATE password_reset_challenges SET attempts=attempts+1 WHERE id=$1',[id]);await audit(db,{actor:user.id,action:'auth.password_code_rejected'});return false;}
  await db.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,user.id]);
  await db.query('UPDATE password_reset_challenges SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
  await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1',[user.id]);
  await invalidateAll(db,user.id,'auth.password_code_reset');
  await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.session.token_hash]);return true;
 });if(!changed)throw invalid();clearSessionCookie(res);res.json({message:'Password changed. All sessions for this account were signed out. Sign in with your email and new password.'});
});

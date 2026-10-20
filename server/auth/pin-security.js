import {createHmac} from 'node:crypto';
import {config} from '../config.js';
import {hashPassword,verifyPassword} from './security.js';
import {badInput,HttpError} from '../errors.js';

export const pinAvailable=()=>Boolean(config.pinPepper);
export const pinEmailAvailable=()=>pinAvailable()&&config.mailEnabled&&Boolean(config.dataEncryptionKey);
export function mobileNumber(value){
 if(typeof value!=='string'||value.length>24||!/^[+\d ()-]+$/.test(value))throw badInput('Enter a valid Indian mobile number.');
 let digits=value.replace(/\D/g,'');if(digits.length===12&&digits.startsWith('91'))digits=digits.slice(2);
 if(!/^[6-9]\d{9}$/.test(digits))throw badInput('Enter a 10-digit Indian mobile number, optionally with +91.');
 return '+91'+digits;
}
export function pinValue(value,{newPin=false}={}){
 if(typeof value!=='string'||!/^\d{6}$/.test(value))throw badInput('Enter a six-digit PIN.');
 if(newPin&&(/^(\d)\1{5}$/.test(value)||'0123456789012345'.includes(value)||'9876543210987654'.includes(value)))throw badInput('Choose a less predictable PIN. Avoid repeated or consecutive digits.');
 return value;
}
export function pinDigest(purpose,value){
 if(!pinAvailable())throw new HttpError(503,'PIN_UNAVAILABLE','Mobile/PIN sign-in is not configured. Use your existing email and password.');
 return createHmac('sha256',Buffer.from(config.pinPepper,'hex')).update(purpose+'\0'+value).digest('hex');
}
export const hashPin=value=>hashPassword(pinDigest('login',pinValue(value,{newPin:true})));
export const verifyPin=(hash,value)=>verifyPassword(hash,pinDigest('login',pinValue(value)));
// Existing account-security endpoints already apply per-user request limits.
// A PIN is an alternative reauthentication credential, never an MFA bypass.
export async function verifyAccountCredential(db,userId,value){
 if(typeof value!=='string')return false;
 if(/^\d{6}$/.test(value)&&pinAvailable()){
  const row=(await db.query('SELECT m.* FROM mobile_credentials m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND u.email_verified_at IS NOT NULL',[userId])).rows[0];
  return Boolean(row&&(!row.locked_until||Date.parse(row.locked_until)<=Date.now())&&await verifyPin(row.pin_hash,value));
 }
 const row=(await db.query('SELECT password_hash FROM users WHERE id=$1',[userId])).rows[0];
 return Boolean(row&&value.length>=12&&value.length<=128&&await verifyPassword(row.password_hash,value));
}

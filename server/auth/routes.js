import {emailRegistration} from './email-registration.js';
import {accountType} from './account-type.js';
import { Router } from 'express';
import {passwordReset} from './password-reset.js';
import {pinRoutes} from './pin-routes.js';
import {pinAvailable,pinEmailAvailable} from './pin-security.js';
import {createIdentity,validateInvitation} from './registration.js';
import { mailTransport as transport } from '../mail.js';
import { pool, transaction, audit } from '../db/pool.js';
import {enqueueMail} from '../mail-queue.js';
import {accountProtection,verifySecondFactor} from './protection.js';
import { config } from '../config.js';
import * as v from '../validation.js';
import { HttpError } from '../errors.js';
import { permissionsFor,companyPermissions } from '../permissions.js';
import { limit, hashPassword, verifyPassword, randomToken, digest } from './security.js';
import { csrf, csrfToken, requireUser, issueSession, setSessionCookie, clearSessionCookie, lockedUser, invalidateAll } from './sessions.js';

export const auth = Router();
const recoveryMessage = 'If this address belongs to an active account and delivery is available, recovery instructions will be provided by email. Delivery is not guaranteed.';
let dummyHash;


async function sessionView(req) {
  if (!req.session.user_id) return { user:null, companies:[], activeCompany:null, permissions:[], platformPermissions:[], pinAvailable:pinAvailable(),pinEmailAvailable:pinEmailAvailable(),recoveryAvailable:config.mailEnabled&&Boolean(config.dataEncryptionKey), csrfToken:csrfToken(req.sessionToken) };
  return transaction(async db => {
    const user = await lockedUser(db,req);
    const memberships = await db.query(`SELECT c.id,c.name,c.city,c.status,c.lifecycle,cp.business_type,cp.business_preset,m.role_id AS role,coalesce(p.name,r.label) AS role_label,
      json_build_object('public_name',b.public_name,'logo_url',b.logo_url,'primary_color',b.primary_color,'secondary_color',b.secondary_color,'accent_color',b.accent_color) AS brand
      FROM company_memberships m JOIN companies c ON c.id=m.company_id JOIN roles r ON r.id=m.role_id LEFT JOIN company_profiles cp ON cp.company_id=c.id LEFT JOIN company_role_profiles p ON p.id=m.role_profile_id AND p.company_id=m.company_id LEFT JOIN company_branding b ON b.company_id=c.id
      WHERE m.user_id=$1 AND m.status='active' AND (c.status='active' OR m.role_id='owner') ORDER BY c.name,c.id`,[user.id]);
    const activeCompany = memberships.rows.find(row => row.id === user.active_company_id) || null;
    if (!activeCompany && user.active_company_id) await db.query('UPDATE sessions SET active_company_id=NULL WHERE token_hash=$1',[req.session.token_hash]);
    const admin = await db.query('SELECT role_id FROM platform_admin_grants WHERE user_id=$1',[user.id]);
    return {
      user:{id:user.id,email:user.email,name:user.display_name,accountType:user.account_type,emailVerified:Boolean(user.email_verified_at)},companies:memberships.rows,activeCompany,
      permissions:activeCompany ? await companyPermissions(db,activeCompany.role,activeCompany.id,user.id) : [],
      customerPermissions:user.account_type==='business'?[]:await permissionsFor(db,'customer'),
      platformPermissions:admin.rowCount ? await permissionsFor(db,admin.rows[0].role_id) : [],
      pinAvailable:pinAvailable(),pinEmailAvailable:pinEmailAvailable(),recoveryAvailable:config.mailEnabled&&Boolean(config.dataEncryptionKey),csrfToken:csrfToken(req.sessionToken)
    };
  });
}
auth.get('/session',async(req,res)=>{
  if (!req.session) {
    const issued = await transaction(db=>issueSession(db,null));
    setSessionCookie(res,issued);
    req.sessionToken=issued.token;req.session={user_id:null};
  }
  res.json(await sessionView(req));
});
auth.use(emailRegistration);

auth.post('/login',csrf,async(req,res)=>{
  await limit(req,'login-ip',req.ip,20);
  const input=v.body(req.body,['email','password','code','accountType'],['email','password']);
  const email=v.email(input.email), password=v.password(input.password);
  await limit(req,'login-account',email,10);
  const type=input.accountType===undefined?null:accountType(input.accountType);const result=await pool.query('SELECT id,password_hash,status FROM users WHERE email=$1 AND ($2::text IS NULL OR account_type=$2)',[email,type]);
  const record=result.rowCount===1?result.rows[0]:null;
  dummyHash ||= hashPassword(randomToken());
  const valid=await verifyPassword(record?.password_hash || await dummyHash,password);
  if(!valid || !record || record.status!=='active') {
    await audit(pool,{action:'auth.login_rejected'});
    throw new HttpError(401,'INVALID_CREDENTIALS','The email or password is incorrect.');
  }
  const issued=await transaction(async db=>{
    const locked=await db.query('SELECT password_hash,status FROM users WHERE id=$1 FOR UPDATE',[record.id]);
    if(locked.rows[0].status!=='active'||locked.rows[0].password_hash!==record.password_hash) throw new HttpError(401,'INVALID_CREDENTIALS','The email or password is incorrect.');
    if(input.code===undefined&&(await db.query('SELECT 1 FROM account_security WHERE user_id=$1 AND secret IS NOT NULL',[record.id])).rowCount)throw new HttpError(403,'MFA_REQUIRED','Enter your authenticator or recovery code to finish signing in.');
    const mfa=await verifySecondFactor(db,record.id,input.code);
    const memberships=await db.query(`SELECT m.company_id FROM company_memberships m JOIN companies c ON c.id=m.company_id WHERE m.user_id=$1 AND m.status='active' AND (c.status='active' OR m.role_id='owner') ORDER BY m.created_at LIMIT 2`,[record.id]);
    await audit(db,{actor:record.id,action:'auth.login'});
    const issued=await issueSession(db,record.id,req.session.token_hash,memberships.rowCount===1?memberships.rows[0].company_id:null);
    if(mfa)await db.query('UPDATE sessions SET mfa_verified_at=now() WHERE token_hash=$1',[digest(issued.token)]);return issued;
  });
  setSessionCookie(res,issued);res.json({message:'Signed in.'});
});
auth.post('/logout',csrf,requireUser,async(req,res)=>{
  v.body(req.body,[]);
  await transaction(async db=>{
    const user=await lockedUser(db,req);
    await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.session.token_hash]);
    await audit(db,{actor:user.id,action:'auth.logout'});
  });
  clearSessionCookie(res);res.json({message:'Signed out.'});
});
auth.post('/logout-all',csrf,requireUser,async(req,res)=>{
  v.body(req.body,[]);
  await transaction(async db=>{const user=await lockedUser(db,req);await invalidateAll(db,user.id);});
  clearSessionCookie(res);res.json({message:'All sessions signed out.'});
});
auth.post('/recover',csrf,async(req,res)=>{
  await limit(req,'recover-ip',req.ip,8,3600);
  const input=v.body(req.body,['email','accountType'],['email']);const email=v.email(input.email);const type=input.accountType===undefined?null:accountType(input.accountType);
  await limit(req,'recover-account',email,3,3600);
  // Do not look up an account or mint a token when delivery is not configured.
  if(!transport||!config.dataEncryptionKey) throw new HttpError(503,'RECOVERY_UNAVAILABLE','Email recovery is not configured. No recovery email was sent. Contact the platform operator.');
  await transaction(async db=>{const candidates=await db.query("SELECT id,email FROM users WHERE email=$1 AND status='active' AND ($2::text IS NULL OR account_type=$2) FOR UPDATE",[email,type]);if(candidates.rowCount!==1)return;const user=candidates.rows[0];const token=randomToken(),tokenHash=digest(token);await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1',[user.id]);await db.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[tokenHash,user.id]);await enqueueMail(db,{kind:'recovery',userId:user.id,email:user.email,referenceHash:tokenHash,subject:'Reset your MY SOLAR password',text:'Reset your password within 30 minutes: '+config.origin+'/#/reset-password?token='+token,expiresAt:new Date(Date.now()+1800000)});await audit(db,{actor:user.id,action:'auth.recovery_queued'});});
  res.status(202).json({message:recoveryMessage});
});
auth.post('/reset-password',csrf,async(req,res)=>{
  await limit(req,'reset-ip',req.ip,10,3600);
  const input=v.body(req.body,['token','password']);
  const token=v.text(input.token,'recovery token',43,43);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400,'INVALID_RESET','This reset link is invalid or expired.');
  const password=v.password(input.password);const tokenHash=digest(token);
  const hash=await hashPassword(password);
  await transaction(async db=>{
    const tokenOwner=await db.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1',[tokenHash]);
    if(!tokenOwner.rowCount)throw new HttpError(400,'INVALID_RESET','This reset link is invalid or expired.');
    const user=await db.query("SELECT id FROM users WHERE id=$1 AND status='active' FOR UPDATE",[tokenOwner.rows[0].user_id]);
    const row=await db.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[tokenHash]);
    if(!user.rowCount||!row.rowCount)throw new HttpError(400,'INVALID_RESET','This reset link is invalid or expired.');
    await db.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[hash,user.rows[0].id]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1',[user.rows[0].id]);
    await invalidateAll(db,user.rows[0].id,'auth.password_reset');
  });
  // Remove even an anonymous browser session; reset never signs the user in automatically.
  await pool.query('DELETE FROM sessions WHERE token_hash=$1',[req.session.token_hash]);
  clearSessionCookie(res);res.json({message:'Password changed. All account sessions were signed out. Please sign in again.'});
});

auth.use('/password-reset',passwordReset);
auth.use('/pin',pinRoutes);
auth.use(accountProtection);

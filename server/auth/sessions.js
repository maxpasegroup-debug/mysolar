import {effectiveTypeSQL} from './account-type.js';
import { config } from '../config.js';
import { pool, audit } from '../db/pool.js';
import { digest, randomToken, privateDigest, safeEqual } from './security.js';
import { HttpError } from '../errors.js';
const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' };
function readCookie(req) {
  const entry = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${config.cookieName}=`));
  const token = entry?.slice(config.cookieName.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export async function sessionMiddleware(req, res, next) {
  req.session = null;
  req.sessionToken = readCookie(req);
  if (req.sessionToken) {
    const result = await pool.query(`UPDATE sessions s SET last_seen_at=now() WHERE token_hash=$1 AND expires_at>now()
      AND last_seen_at>now()-($2::int * interval '1 hour')
      AND (user_id IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id=s.user_id AND u.status='active'))
      RETURNING token_hash,user_id,active_company_id,expires_at`, [digest(req.sessionToken),config.idleHours]);
    req.session = result.rows[0] || null;
  }
  next();
}
export function csrfToken(token) { return privateDigest(`csrf:${token}`); }
export function csrf(req,res,next) {
  if (!req.session || !safeEqual(req.get('x-csrf-token'),csrfToken(req.sessionToken))) throw new HttpError(403,'CSRF_REJECTED','Your security session expired. Refresh the page and try again.');
  next();
}
export function requireUser(req,res,next) {
  if (!req.session?.user_id) throw new HttpError(401,'SIGN_IN_REQUIRED','Please sign in to continue.');
  next();
}
export async function issueSession(db, userId, previousHash = null, companyId = null) {
  const token = randomToken();
  const expires = new Date(Date.now() + (userId ? config.absoluteHours : 1) * 3600000);
  if (previousHash) await db.query('DELETE FROM sessions WHERE token_hash=$1', [previousHash]);
  await db.query('INSERT INTO sessions(token_hash,user_id,active_company_id,expires_at) VALUES($1,$2,$3,$4)',[digest(token),userId,companyId,expires]);
  return { token, expires };
}
export function setSessionCookie(res, issued) { res.cookie(config.cookieName, issued.token, {...cookieOptions, expires: issued.expires}); }
export function clearSessionCookie(res) { res.clearCookie(config.cookieName, cookieOptions); }
// Recheck a session inside the mutation transaction, serializing with password reset and revocation.
export async function lockedUser(db, req) {
  const result = await db.query(`SELECT u.id,u.email,u.display_name,u.email_verified_at,${effectiveTypeSQL('u')} AS account_type FROM users u WHERE u.id=$1 AND u.status='active' FOR UPDATE`, [req.session.user_id]);
  const valid = await db.query(`SELECT token_hash,active_company_id FROM sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now()
    AND last_seen_at>now()-($3::int * interval '1 hour') FOR UPDATE`,[req.session.token_hash,req.session.user_id,config.idleHours]);
  if (!result.rowCount || !valid.rowCount) throw new HttpError(401,'SIGN_IN_REQUIRED','Please sign in again.');
  return { ...result.rows[0], active_company_id: valid.rows[0].active_company_id };
}
export async function invalidateAll(db,userId,action='session.all_revoked') {
  await db.query('DELETE FROM sessions WHERE user_id=$1',[userId]);
  await audit(db,{actor:userId,action});
}

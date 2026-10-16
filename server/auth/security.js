import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { HttpError } from '../errors.js';
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const privateDigest = value => createHmac('sha256', config.secret).update(value).digest('hex');
export const hashPassword = value => argon2.hash(value, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
export const verifyPassword = (hash, value) => argon2.verify(hash, value);
export function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a,b);
}
export function sameOrigin(req, res, next) {
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    if (req.get('origin') !== config.origin || req.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'ORIGIN_REJECTED', 'Please use the application from its configured address.');
    if (!req.is('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Send this request as JSON.');
  }
  next();
}
export async function limit(req, namespace, identifier, maximum, seconds = 900) {
  const windowStart = new Date(Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000);
  const result = await pool.query(`INSERT INTO rate_limit_buckets(key_hash,window_start,hits,expires_at) VALUES($1,$2,1,$3)
    ON CONFLICT(key_hash,window_start) DO UPDATE SET hits=rate_limit_buckets.hits+1 RETURNING hits`,
  [privateDigest(`${namespace}:${identifier}`), windowStart, new Date(windowStart.getTime() + seconds * 2000)]);
  if (result.rows[0].hits > maximum) throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.');
}

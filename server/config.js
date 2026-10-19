import {mailSettings} from './mail-config.js';
// Fail closed if an old private-environment configuration is accidentally reused.
// The application no longer includes the removed staging access/mail boundaries.
if(process.env.STAGING_MODE==='true')throw new Error('Legacy staging mode is unsupported. This release uses the root application only.');
function integer(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
const production = process.env.NODE_ENV === 'production';
let origin;try{origin=new URL(process.env.APP_ORIGIN||'http://localhost:3000');}catch{throw new Error('APP_ORIGIN must be a valid HTTP(S) origin');}
if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !['http:', 'https:'].includes(origin.protocol)) throw new Error('APP_ORIGIN must be an HTTP(S) origin');
if (production && origin.protocol !== 'https:') throw new Error('Production requires HTTPS APP_ORIGIN');
const encryptionKey=process.env.DATA_ENCRYPTION_KEY||'';
if(encryptionKey&&!/^[a-f0-9]{64}$/i.test(encryptionKey))throw new Error('DATA_ENCRYPTION_KEY must be a 32-byte hex key');
const scanUrl=process.env.FILE_SCAN_URL||'';
if(scanUrl){try{const u=new URL(scanUrl);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw Error();}catch{throw new Error('FILE_SCAN_URL must be an operator-configured HTTPS endpoint without credentials or query parameters');}}
const secret = process.env.SESSION_SECRET || '';
if (secret.length < 64 || /replace|placeholder|example/i.test(secret)) throw new Error('Set a random SESSION_SECRET of at least 64 characters');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
let database;try{database=new URL(process.env.DATABASE_URL);decodeURIComponent(database.username);decodeURIComponent(database.password);}catch{throw new Error('DATABASE_URL must be a valid PostgreSQL URL');}
if(!['postgres:','postgresql:'].includes(database.protocol)||!database.hostname||database.pathname.length<2||database.hash)throw new Error('DATABASE_URL must identify a PostgreSQL host and database');
if([...database.searchParams.keys()].some(key=>/^ssl/i.test(key)))throw new Error('Configure database TLS with DATABASE_SSL; remove SSL options from DATABASE_URL to prevent policy overrides');
if (!['disable', 'require'].includes(process.env.DATABASE_SSL || 'disable')) throw new Error('DATABASE_SSL must be disable or require');
const logoHosts=(process.env.LOGO_ALLOWED_HOSTS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
const productImageHosts=(process.env.PRODUCT_IMAGE_ALLOWED_HOSTS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
if(logoHosts.some(host=>! /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)))throw new Error('LOGO_ALLOWED_HOSTS must contain exact DNS hostnames');
if(productImageHosts.some(host=>! /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)))throw new Error('PRODUCT_IMAGE_ALLOWED_HOSTS must contain exact DNS hostnames');
const invitationDelivery=process.env.INVITATION_DELIVERY||'email';
const mail=mailSettings();
if(!['email','manual'].includes(invitationDelivery)||(production&&invitationDelivery==='manual'))throw new Error('Manual invitations are restricted to development');
export const config = Object.freeze({
  production, origin: origin.origin, secret, dataEncryptionKey:encryptionKey,
  fileScanUrl:scanUrl,fileScanKey:process.env.FILE_SCAN_KEY||'',fileQuotaBytes:integer('FILE_QUOTA_BYTES',104857600,2097152,1073741824),
  releaseId:(process.env.APP_RELEASE||'').slice(0,100)||null,
  opsAlertsEnabled:process.env.OPS_ALERTS_ENABLED==='true',
  opsAlertRecipient:process.env.OPS_ALERT_RECIPIENT||'',
  dbWarningBytes:integer('DB_WARNING_BYTES',1073741824,1048576,Number.MAX_SAFE_INTEGER),
  requireVerifiedEmail:process.env.AUTH_REQUIRE_VERIFIED_EMAIL==='true',
  requirePrivilegedMfa:process.env.AUTH_REQUIRE_PRIVILEGED_MFA==='true',
  port: integer('PORT', 3000, 1, 65535),
  databaseUrl: process.env.DATABASE_URL,
  databaseSSL: process.env.DATABASE_SSL === 'require',
  proxyHops: integer('TRUST_PROXY_HOPS', 0, 0, 3),
  absoluteHours: integer('SESSION_ABSOLUTE_HOURS', 168, 1, 720),
  idleHours: integer('SESSION_IDLE_HOURS', 12, 1, 72),
  cookieName: production ? '__Host-mysolar_session' : 'mysolar_session',
  logoHosts:Object.freeze(logoHosts), productImageHosts:Object.freeze(productImageHosts), invitationDelivery,
  mailEnabled: mail.enabled,
  smtp: mail.smtp,
  mailFrom: mail.from
});

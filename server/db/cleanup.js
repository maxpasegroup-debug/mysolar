import { pool, transaction } from './pool.js';
try {
  await transaction(async db => {
    await db.query("DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - interval '72 hours'");
    await db.query("DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' OR used_at IS NOT NULL");
    await db.query('DELETE FROM rate_limit_buckets WHERE expires_at < now()');
  });
  console.log('Expired authentication records removed. Audit events retained.');
} finally { await pool.end(); }

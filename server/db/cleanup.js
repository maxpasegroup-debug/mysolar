import { pool, transaction } from './pool.js';
try {
  await transaction(async db => {
    await db.query("DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - interval '72 hours'");
    await db.query("DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' OR used_at IS NOT NULL");
    await db.query('DELETE FROM rate_limit_buckets WHERE expires_at < now()');
    await db.query('DELETE FROM email_verifications WHERE expires_at<now()');
    await db.query("DELETE FROM pin_challenges WHERE expires_at<now() OR used_at IS NOT NULL");
    await db.query("UPDATE account_security SET pending_secret=NULL,pending_expires_at=NULL WHERE pending_expires_at<now()");
    await db.query("UPDATE mail_jobs SET payload=NULL,status=CASE WHEN status IN ('pending','retry','running') THEN 'cancelled' ELSE status END WHERE expires_at<now()");
    await db.query("DELETE FROM mail_jobs WHERE created_at<now()-interval '30 days' AND status IN ('accepted','cancelled','dead')");
    await db.query("DELETE FROM import_batches WHERE status='preview' AND expires_at<now()-interval '1 day'");
    await db.query("DELETE FROM operational_events WHERE created_at<now()-interval '30 days'");
  });
  console.log('Expired authentication records removed. Audit events retained.');
} finally { await pool.end(); }

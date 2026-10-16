import pg from 'pg';
import { config } from '../config.js';
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Calendar dates are not instants. Preserve YYYY-MM-DD for forms, validity and due dates.
  types: { getTypeParser(oid,format) { return oid===1082&&format!=='binary' ? value=>value : pg.types.getTypeParser(oid,format); } },
  ssl: config.databaseSSL ? { rejectUnauthorized: true } : false,
  max: 10, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
  statement_timeout: 15000, application_name: 'my-solar'
});
pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));
export async function transaction(work) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const result = await work(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
export async function audit(db, { actor = null, company = null, action, target = null, metadata = {} }) {
  // Callers supply fixed action names and allowlisted, non-secret metadata only.
  await db.query('INSERT INTO audit_events (actor_user_id, company_id, action, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [actor, company, action, target, JSON.stringify(metadata)]);
}

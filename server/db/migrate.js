import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pool } from './pool.js';
import { roleDefinitions } from '../permissions.js';
const db = await pool.connect();
try {
  await db.query('SELECT pg_advisory_lock(726431982)');
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('./migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      if (name === '001_identity.sql') await installCatalogue();
      continue;
    }
    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1,$2)', [name, checksum]);
      await db.query('COMMIT');
      console.log(`Applied migration: ${name}`);
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    if (name === '001_identity.sql') await installCatalogue();
  }
} catch { console.error('Migration failed. Check database configuration and migration history. No credentials are logged.'); process.exitCode = 1; }
finally { await db.query('SELECT pg_advisory_unlock(726431982)').catch(() => {}); db.release(); await pool.end(); }

async function installCatalogue() {
  // Immutable Phase 2 catalogue must exist before later SQL permission migrations, including on a fresh DB.
  const catalogueName = '002_role_catalogue_v1';
  const catalogueHash = createHash('sha256').update(JSON.stringify(roleDefinitions)).digest('hex');
  const recorded = await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [catalogueName]);
  if (recorded.rowCount && recorded.rows[0].checksum !== catalogueHash) throw new Error('Add a new catalogue migration version before changing roles');
  if (!recorded.rowCount) {
    await db.query('BEGIN');
    try {
      for (const [id, role] of Object.entries(roleDefinitions)) {
        await db.query('INSERT INTO roles(id,scope,label) VALUES($1,$2,$3)', [id,role.scope,role.label]);
        for (const permission of role.permissions) {
          await db.query('INSERT INTO permissions(id,scope) VALUES($1,$2) ON CONFLICT DO NOTHING', [permission,role.scope]);
          await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)', [id,permission]);
        }
      }
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [catalogueName,catalogueHash]);
      await db.query('COMMIT');
      console.log(`Applied migration: ${catalogueName}`);
    } catch (error) { await db.query('ROLLBACK'); throw error; }
  }
}

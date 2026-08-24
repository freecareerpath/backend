import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

/**
 * Applies every `migrations/*.sql` file, in filename order, against
 * DATABASE_URL. No migration-runner dependency (ADR-0004 "Data access") —
 * this is a thin, portable alternative to `psql -f`, which requires the
 * `psql` client binary to be installed locally. Every migration file uses
 * `IF NOT EXISTS`/guarded `ALTER`, so re-running this against an
 * already-migrated database is a safe no-op.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set — see backend/.env.example.');
    process.exit(1);
  }

  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}...`);
      await pool.query(sql);
    }
    console.log(`Applied ${files.length} migration file(s) successfully.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

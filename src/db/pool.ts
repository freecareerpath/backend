import { Pool } from 'pg';

/**
 * Single shared `pg.Pool`, injectable via PG_POOL (ADR-0004 "Data access" —
 * no ORM). Reads DATABASE_URL lazily so importing this module never throws
 * in environments with no database configured yet (unit tests, CI without a
 * live Supabase project — see docs/architecture.md "Open items").
 */
export const PG_POOL = Symbol('PG_POOL');

export function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

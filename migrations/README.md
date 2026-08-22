# Migrations

Hand-written, numbered SQL files — no ORM, no migration-runner dependency (see
[`docs/decisions/0004-accounts-and-persistence.md`](../../docs/decisions/0004-accounts-and-persistence.md)
"Data access").

No Supabase project exists yet (open item since `docs/decisions/0001-tech-stack.md`),
so these have not been run against a real database. Once `DATABASE_URL` is set:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
```

Apply files in order, once each. `gen_random_uuid()` requires the `pgcrypto`
extension (enabled by default on Supabase Postgres).

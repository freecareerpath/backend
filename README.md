# FreeCareerPath — backend

NestJS API for FreeCareerPath: auth, career-path content, and the Admin CMS
API. See the [root README](../README.md) for full-stack setup (Docker
Compose) and [`../docs/architecture.md`](../docs/architecture.md) for the
architecture rationale. This file covers running `backend/` on its own.

Every real route is served under `/api` (e.g. `/api/career-paths`,
`/api/auth/login`) — `main.ts` sets a global prefix, with the bare `/`
health-check route excluded.

## Setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
```

Needs a running Postgres — see the root README's "Option B" for a one-line
Docker command, or point `DATABASE_URL` at any local Postgres 16+.

## Database

```bash
npm run db:migrate   # applies backend/migrations/*.sql — safe to re-run
npm run db:seed      # idempotent — re-running never creates duplicates
```

## Run

```bash
npm run start:dev    # watch mode, http://localhost:3000
npm run start        # no watch
npm run start:prod   # runs the compiled dist/ build
```

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # e2e tests
npm run test:cov     # coverage
npm run lint
```

## Notable structure

- `src/auth/` — registration/login/logout, JWT access + refresh-token
  sessions, role-based (`user`/`admin`) authorization guards.
- `src/career-paths/` — public read API and the admin CRUD API
  (`/api/admin/career-paths/*`, guarded by `JwtAuthGuard` + `AdminGuard`).
- `migrations/` — hand-written, numbered, idempotent SQL migrations (no ORM
  — see `docs/decisions/` in the root repo for why).
- `scripts/migrate.ts`, `scripts/seed.ts` — the `db:migrate`/`db:seed` entry
  points above.

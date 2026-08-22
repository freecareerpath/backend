-- v2 schema (docs/decisions/0004-accounts-and-persistence.md). Applied manually:
--   psql "$DATABASE_URL" -f migrations/0001_init.sql
-- No ORM/migration runner (see ADR-0004 "Data access") — numbered SQL files only.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  roadmap_slug TEXT NOT NULL,
  node_slug TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, roadmap_slug, node_slug)
);

CREATE INDEX IF NOT EXISTS progress_user_roadmap_idx ON progress (user_id, roadmap_slug);

-- Static catalog (slug/title only) — a foreign-key target for submissions/badges.
-- Curriculum content itself stays in web/src/lib/roadmaps (ADR-0004).
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_slug TEXT NOT NULL,
  milestone_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  UNIQUE (roadmap_slug, milestone_slug)
);

CREATE TABLE IF NOT EXISTS milestone_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  milestone_slug TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS milestone_submissions_user_idx ON milestone_submissions (user_id);

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  milestone_slug TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_slug)
);

CREATE TABLE IF NOT EXISTS nudge_preferences (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  weekly_nudge_enabled BOOLEAN NOT NULL DEFAULT true,
  last_nudged_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

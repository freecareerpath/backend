-- v2.1 schema — database-driven Career Path CMS content + user roles.
-- Supersedes the "curriculum stays in web/lib/roadmaps" clause of
-- docs/decisions/0004-accounts-and-persistence.md — see
-- docs/decisions/0006-career-path-cms.md for the updated decision. Applied
-- manually, same convention as 0001:
--   psql "$DATABASE_URL" -f migrations/0002_career_paths_and_roles.sql
-- All statements are idempotent (IF NOT EXISTS / guarded ALTER), so this file
-- is safe to run more than once against the same database.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Top-level career path (was a hard-coded entry in web/src/lib/roadmaps and
-- web/src/lib/multiverse/graph.ts's PLANNED_TRACKS — now the source of truth).
CREATE TABLE IF NOT EXISTS career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_paths_status_order_idx ON career_paths (status, display_order);

-- A milestone/module within a career path (was RoadmapMilestone).
CREATE TABLE IF NOT EXISTS career_path_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id UUID NOT NULL REFERENCES career_paths (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (career_path_id, slug)
);

CREATE INDEX IF NOT EXISTS career_path_modules_path_order_idx
  ON career_path_modules (career_path_id, display_order);

-- A node/step within a module (was RoadmapNode). `node_meta` carries
-- roadmap-visualization metadata (e.g. graph position) without forcing a
-- schema change every time the frontend's visualization needs a new field.
CREATE TABLE IF NOT EXISTS career_path_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES career_path_modules (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  node_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);

CREATE INDEX IF NOT EXISTS career_path_nodes_module_order_idx
  ON career_path_nodes (module_id, display_order);

-- A curated resource link attached to a node (was RoadmapResource).
CREATE TABLE IF NOT EXISTS career_path_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES career_path_nodes (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS career_path_resources_node_idx ON career_path_resources (node_id);

-- v2.2 schema — Explain Mode graded submissions.
--
-- Backs the LLM grader described in ideas/08-explain-mode.md. Applied
-- manually, same convention as 0001 and 0002:
--   psql "$DATABASE_URL" -f migrations/0003_explain_submissions.sql
-- All statements are idempotent (IF NOT EXISTS), so this file is safe to run
-- more than once against the same database.

-- One row per graded submission. Kept rather than discarded after grading
-- for three reasons: it is the daily quota counter, it is the verdict cache
-- (a resubmitted identical answer must not be re-billed or re-graded, and
-- must not drift to a different verdict), and it is the only record of what
-- learners actually write — which is what the rubrics get refined from.
CREATE TABLE IF NOT EXISTS explain_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  roadmap_slug TEXT NOT NULL,
  node_slug TEXT NOT NULL,
  answer TEXT NOT NULL,
  -- SHA-256 of the normalised answer. The cache key: same answer, same
  -- verdict, forever. LLM graders drift, and "I got rejected for the answer
  -- that passed my friend" destroys trust permanently.
  answer_hash TEXT NOT NULL,
  -- The grader's structured feedback: verdict, gotRight, missing,
  -- misconceptions. JSONB so the shape can evolve without a migration.
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Which model produced it, so a later model change is attributable and old
  -- verdicts can be identified rather than silently mixed in.
  model TEXT NOT NULL DEFAULT '',
  -- Whether this submission consumed one of the day's attempts. A cache hit
  -- does not, so re-reading your own feedback is free.
  counted_against_quota BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The quota query: submissions by this user since midnight UTC.
CREATE INDEX IF NOT EXISTS explain_submissions_user_created_idx
  ON explain_submissions (user_id, created_at DESC);

-- The cache lookup: has this exact answer to this exact node been graded?
CREATE INDEX IF NOT EXISTS explain_submissions_cache_idx
  ON explain_submissions (node_slug, answer_hash);

-- Per-user daily allowance. Absent row means the default (3). An admin
-- raises someone's allowance by inserting here — the "message us and we'll
-- give you more" path, which is free but deliberately manual for now.
CREATE TABLE IF NOT EXISTS explain_allowances (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  daily_limit INT NOT NULL DEFAULT 3 CHECK (daily_limit >= 0),
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

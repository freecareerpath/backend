import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';
import type { NudgeCandidate } from './nudges.eligibility';

@Injectable()
export class NudgesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * "Incomplete progress" here means the user has completed at least one
   * node but not all currently-known nodes for a roadmap they've touched —
   * the exact catalog size comes from web/'s static roadmap data, not the
   * database, so this only checks "has progress at all" as the DB-visible
   * proxy; the nudge copy layer is responsible for picking a real next node.
   */
  async findCandidates(): Promise<NudgeCandidate[]> {
    const result = await this.pool.query(`
      SELECT
        u.id AS user_id,
        COALESCE(np.weekly_nudge_enabled, true) AS weekly_nudge_enabled,
        np.last_nudged_at,
        (SELECT max(p.completed_at) FROM progress p WHERE p.user_id = u.id) AS last_activity_at,
        EXISTS (SELECT 1 FROM progress p WHERE p.user_id = u.id) AS has_incomplete_progress
      FROM users u
      LEFT JOIN nudge_preferences np ON np.user_id = u.id
    `);

    return result.rows.map(
      (row: {
        user_id: string;
        weekly_nudge_enabled: boolean;
        last_nudged_at: Date | null;
        last_activity_at: Date | null;
        has_incomplete_progress: boolean;
      }) => ({
        userId: row.user_id,
        weeklyNudgeEnabled: row.weekly_nudge_enabled,
        lastNudgedAt: row.last_nudged_at,
        lastActivityAt: row.last_activity_at,
        hasIncompleteProgress: row.has_incomplete_progress,
      }),
    );
  }

  async findEmail(userId: string): Promise<string | undefined> {
    const result = await this.pool.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0]?.email;
  }

  async markNudged(userId: string, at: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO nudge_preferences (user_id, last_nudged_at)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_nudged_at = $2, updated_at = now()`,
      [userId, at],
    );
  }

  async setEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.pool.query(
      `INSERT INTO nudge_preferences (user_id, weekly_nudge_enabled)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET weekly_nudge_enabled = $2, updated_at = now()`,
      [userId, enabled],
    );
  }
}

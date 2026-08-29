import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';
import type { ExplainFeedback, ExplainRubric } from './explain.types';

/** The default every user gets without an explicit allowance row. */
export const DEFAULT_DAILY_LIMIT = 3;

@Injectable()
export class ExplainRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * The rubric as stored on the node, joined up from the roadmap slug.
   *
   * Read from the database rather than accepted from the client on purpose:
   * a client-supplied rubric would let anyone submit `mustConvey: []` and be
   * graded against nothing.
   */
  async findRubric(
    roadmapSlug: string,
    nodeSlug: string,
  ): Promise<{ title: string; rubric: ExplainRubric } | null> {
    const result = await this.pool.query(
      `SELECT n.title, n.node_meta -> 'rubric' AS rubric
         FROM career_path_nodes n
         JOIN career_path_modules m ON m.id = n.module_id
         JOIN career_paths p ON p.id = m.career_path_id
        WHERE p.slug = $1 AND n.slug = $2
        LIMIT 1`,
      [roadmapSlug, nodeSlug],
    );

    const row = result.rows[0] as
      | { title: string; rubric: unknown }
      | undefined;
    if (!row?.rubric || typeof row.rubric !== 'object') return null;

    const raw = row.rubric as Record<string, unknown>;
    const strings = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string' && v.length > 0)
        : [];

    const mustConvey = strings(raw.mustConvey);
    if (mustConvey.length === 0) return null;

    return {
      title: row.title,
      rubric: {
        mustConvey,
        mustNotClaim: strings(raw.mustNotClaim),
        followUp: typeof raw.followUp === 'string' ? raw.followUp : undefined,
      },
    };
  }

  /** This user's daily limit — their allowance row, or the default. */
  async findDailyLimit(userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT daily_limit FROM explain_allowances WHERE user_id = $1',
      [userId],
    );
    const row = result.rows[0] as { daily_limit: number } | undefined;
    return row ? Number(row.daily_limit) : DEFAULT_DAILY_LIMIT;
  }

  /**
   * Attempts used today. The day boundary is UTC rather than the viewer's
   * timezone: a client-supplied offset would be trivially spoofable, and a
   * fixed reset is easier to explain than one that moves with travel.
   */
  async countToday(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS used
         FROM explain_submissions
        WHERE user_id = $1
          AND counted_against_quota
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc')`,
      [userId],
    );
    return (result.rows[0] as { used: number }).used;
  }

  /**
   * A previous verdict for this exact answer to this node, from any user.
   *
   * Sharing the cache across users is the point: the same answer must get the
   * same verdict, and one "I was rejected for the answer that passed my
   * friend" report would cost more trust than the saved API call is worth.
   */
  async findCachedFeedback(
    nodeSlug: string,
    answerHash: string,
  ): Promise<{ feedback: ExplainFeedback; model: string } | null> {
    const result = await this.pool.query(
      `SELECT feedback, model
         FROM explain_submissions
        WHERE node_slug = $1 AND answer_hash = $2
        ORDER BY created_at ASC
        LIMIT 1`,
      [nodeSlug, answerHash],
    );
    const row = result.rows[0] as
      | { feedback: ExplainFeedback; model: string }
      | undefined;
    return row ? { feedback: row.feedback, model: row.model } : null;
  }

  async recordSubmission(params: {
    userId: string;
    roadmapSlug: string;
    nodeSlug: string;
    answer: string;
    answerHash: string;
    feedback: ExplainFeedback;
    model: string;
    countedAgainstQuota: boolean;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO explain_submissions
         (user_id, roadmap_slug, node_slug, answer, answer_hash, feedback, model, counted_against_quota)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.userId,
        params.roadmapSlug,
        params.nodeSlug,
        params.answer,
        params.answerHash,
        JSON.stringify(params.feedback),
        params.model,
        params.countedAgainstQuota,
      ],
    );
  }
}

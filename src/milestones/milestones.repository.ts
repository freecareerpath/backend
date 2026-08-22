import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export type Submission = {
  id: string;
  userId: string;
  milestoneSlug: string;
  proofUrl: string;
  status: SubmissionStatus;
};

type SubmissionRow = {
  id: string;
  user_id: string;
  milestone_slug: string;
  proof_url: string;
  status: SubmissionStatus;
};

@Injectable()
export class MilestonesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createSubmission(
    userId: string,
    milestoneSlug: string,
    proofUrl: string,
  ): Promise<Submission> {
    const result = await this.pool.query<SubmissionRow>(
      `INSERT INTO milestone_submissions (user_id, milestone_slug, proof_url, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, user_id, milestone_slug, proof_url, status`,
      [userId, milestoneSlug, proofUrl],
    );
    return this.toSubmission(result.rows[0]);
  }

  async findSubmission(id: string): Promise<Submission | undefined> {
    const result = await this.pool.query<SubmissionRow>(
      'SELECT id, user_id, milestone_slug, proof_url, status FROM milestone_submissions WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.toSubmission(result.rows[0]) : undefined;
  }

  async setStatus(id: string, status: SubmissionStatus): Promise<void> {
    await this.pool.query(
      'UPDATE milestone_submissions SET status = $2, reviewed_at = now() WHERE id = $1',
      [id, status],
    );
  }

  async awardBadge(userId: string, milestoneSlug: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO badges (user_id, milestone_slug)
       VALUES ($1, $2)
       ON CONFLICT (user_id, milestone_slug) DO NOTHING`,
      [userId, milestoneSlug],
    );
  }

  async findBadgesForUser(
    userId: string,
  ): Promise<{ milestoneSlug: string }[]> {
    const result = await this.pool.query<{ milestone_slug: string }>(
      'SELECT milestone_slug FROM badges WHERE user_id = $1',
      [userId],
    );
    return result.rows.map((row) => ({
      milestoneSlug: row.milestone_slug,
    }));
  }

  private toSubmission(row: SubmissionRow): Submission {
    return {
      id: row.id,
      userId: row.user_id,
      milestoneSlug: row.milestone_slug,
      proofUrl: row.proof_url,
      status: row.status,
    };
  }
}

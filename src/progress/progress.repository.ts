import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';
import type { ProgressRow } from './progress.merge';

@Injectable()
export class ProgressRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findForUser(userId: string): Promise<ProgressRow[]> {
    const result = await this.pool.query(
      'SELECT roadmap_slug, node_slug FROM progress WHERE user_id = $1',
      [userId],
    );
    return result.rows.map(
      (row: { roadmap_slug: string; node_slug: string }) => ({
        roadmapSlug: row.roadmap_slug,
        nodeSlug: row.node_slug,
      }),
    );
  }

  async setCompletion(
    userId: string,
    roadmapSlug: string,
    nodeSlug: string,
    completed: boolean,
  ): Promise<void> {
    if (completed) {
      await this.pool.query(
        `INSERT INTO progress (user_id, roadmap_slug, node_slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, roadmap_slug, node_slug) DO NOTHING`,
        [userId, roadmapSlug, nodeSlug],
      );
    } else {
      await this.pool.query(
        'DELETE FROM progress WHERE user_id = $1 AND roadmap_slug = $2 AND node_slug = $3',
        [userId, roadmapSlug, nodeSlug],
      );
    }
  }

  async insertMany(userId: string, rows: ProgressRow[]): Promise<void> {
    for (const row of rows) {
      await this.setCompletion(userId, row.roadmapSlug, row.nodeSlug, true);
    }
  }
}

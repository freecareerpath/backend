import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

@Injectable()
export class SessionsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      'INSERT INTO sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
      [userId, refreshTokenHash, expiresAt],
    );
    return result.rows[0].id;
  }

  /** Returns the session row if `refreshTokenHash` matches an unexpired session, else undefined. */
  async findValidByHash(
    refreshTokenHash: string,
  ): Promise<{ id: string; userId: string } | undefined> {
    const result = await this.pool.query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM sessions WHERE refresh_token_hash = $1 AND expires_at > now()',
      [refreshTokenHash],
    );
    return result.rows[0]
      ? { id: result.rows[0].id, userId: result.rows[0].user_id }
      : undefined;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }
}

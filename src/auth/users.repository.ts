import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, password_hash, created_at FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const result = await this.pool.query<UserRow>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, created_at',
      [email, passwordHash],
    );
    return toUser(result.rows[0]);
  }
}

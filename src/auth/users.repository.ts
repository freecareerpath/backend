import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

export type Role = 'user' | 'admin';

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  created_at: Date;
};

const SELECT_COLUMNS = 'id, email, name, password_hash, role, created_at';

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  async create(
    email: string,
    passwordHash: string,
    name = '',
    role: Role = 'user',
  ): Promise<User> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING ${SELECT_COLUMNS}`,
      [email, passwordHash, name, role],
    );
    return toUser(result.rows[0]);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

export type ContentStatus = 'draft' | 'published';

export type CareerPath = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status: ContentStatus;
  icon: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type CareerPathRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  status: ContentStatus;
  icon: string | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS =
  'id, slug, title, short_description, description, status, icon, display_order, created_at, updated_at';

function toCareerPath(row: CareerPathRow): CareerPath {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    status: row.status,
    icon: row.icon,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CareerPathInput = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status?: ContentStatus;
  icon?: string | null;
  displayOrder?: number;
};

export type CareerPathPatch = Partial<CareerPathInput>;

@Injectable()
export class CareerPathsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(opts: { onlyPublished: boolean }): Promise<CareerPath[]> {
    const where = opts.onlyPublished ? "WHERE status = 'published'" : '';
    const result = await this.pool.query<CareerPathRow>(
      `SELECT ${COLUMNS} FROM career_paths ${where} ORDER BY display_order ASC, created_at ASC`,
    );
    return result.rows.map(toCareerPath);
  }

  async findBySlug(
    slug: string,
    opts: { onlyPublished: boolean },
  ): Promise<CareerPath | undefined> {
    const statusClause = opts.onlyPublished ? "AND status = 'published'" : '';
    const result = await this.pool.query<CareerPathRow>(
      `SELECT ${COLUMNS} FROM career_paths WHERE slug = $1 ${statusClause}`,
      [slug],
    );
    return result.rows[0] ? toCareerPath(result.rows[0]) : undefined;
  }

  async findById(id: string): Promise<CareerPath | undefined> {
    const result = await this.pool.query<CareerPathRow>(
      `SELECT ${COLUMNS} FROM career_paths WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toCareerPath(result.rows[0]) : undefined;
  }

  async slugExists(slug: string, excludingId?: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      excludingId
        ? 'SELECT EXISTS(SELECT 1 FROM career_paths WHERE slug = $1 AND id != $2) AS exists'
        : 'SELECT EXISTS(SELECT 1 FROM career_paths WHERE slug = $1) AS exists',
      excludingId ? [slug, excludingId] : [slug],
    );
    return result.rows[0].exists;
  }

  async create(input: CareerPathInput): Promise<CareerPath> {
    const result = await this.pool.query<CareerPathRow>(
      `INSERT INTO career_paths (slug, title, short_description, description, status, icon, display_order)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'draft'), $6, COALESCE($7, 0))
       RETURNING ${COLUMNS}`,
      [
        input.slug,
        input.title,
        input.shortDescription,
        input.description,
        input.status ?? null,
        input.icon ?? null,
        input.displayOrder ?? null,
      ],
    );
    return toCareerPath(result.rows[0]);
  }

  async update(
    id: string,
    patch: CareerPathPatch,
  ): Promise<CareerPath | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, unknown> = {
      slug: patch.slug,
      title: patch.title,
      short_description: patch.shortDescription,
      description: patch.description,
      status: patch.status,
      icon: patch.icon,
      display_order: patch.displayOrder,
    };

    for (const [column, value] of Object.entries(columnMap)) {
      if (value !== undefined) {
        fields.push(`${column} = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const result = await this.pool.query<CareerPathRow>(
      `UPDATE career_paths SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ? toCareerPath(result.rows[0]) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM career_paths WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Bulk display_order update in a single round trip, used by admin drag-reorder. */
  async reorder(orderedIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE career_paths SET display_order = $1, updated_at = now() WHERE id = $2',
          [i, orderedIds[i]],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

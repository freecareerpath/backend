import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';
import type { ContentStatus } from './career-paths.repository';

export type CareerPathModule = {
  id: string;
  careerPathId: string;
  slug: string;
  title: string;
  description: string;
  status: ContentStatus;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type ModuleRow = {
  id: string;
  career_path_id: string;
  slug: string;
  title: string;
  description: string;
  status: ContentStatus;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS =
  'id, career_path_id, slug, title, description, status, display_order, created_at, updated_at';

function toModule(row: ModuleRow): CareerPathModule {
  return {
    id: row.id,
    careerPathId: row.career_path_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ModuleInput = {
  careerPathId: string;
  slug: string;
  title: string;
  description?: string;
  status?: ContentStatus;
  displayOrder?: number;
};

export type ModulePatch = Partial<Omit<ModuleInput, 'careerPathId'>>;

@Injectable()
export class CareerPathModulesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByCareerPathId(
    careerPathId: string,
    opts: { onlyPublished: boolean },
  ): Promise<CareerPathModule[]> {
    const statusClause = opts.onlyPublished ? "AND status = 'published'" : '';
    const result = await this.pool.query<ModuleRow>(
      `SELECT ${COLUMNS} FROM career_path_modules WHERE career_path_id = $1 ${statusClause} ORDER BY display_order ASC`,
      [careerPathId],
    );
    return result.rows.map(toModule);
  }

  /** Batched lookup across many career paths at once — avoids N+1 when listing several career paths with their modules. */
  async findByCareerPathIds(
    careerPathIds: string[],
    opts: { onlyPublished: boolean },
  ): Promise<CareerPathModule[]> {
    if (careerPathIds.length === 0) return [];
    const statusClause = opts.onlyPublished ? "AND status = 'published'" : '';
    const result = await this.pool.query<ModuleRow>(
      `SELECT ${COLUMNS} FROM career_path_modules WHERE career_path_id = ANY($1) ${statusClause} ORDER BY display_order ASC`,
      [careerPathIds],
    );
    return result.rows.map(toModule);
  }

  async findById(id: string): Promise<CareerPathModule | undefined> {
    const result = await this.pool.query<ModuleRow>(
      `SELECT ${COLUMNS} FROM career_path_modules WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toModule(result.rows[0]) : undefined;
  }

  async create(input: ModuleInput): Promise<CareerPathModule> {
    const result = await this.pool.query<ModuleRow>(
      `INSERT INTO career_path_modules (career_path_id, slug, title, description, status, display_order)
       VALUES ($1, $2, $3, COALESCE($4, ''), COALESCE($5, 'published'), COALESCE($6, 0))
       RETURNING ${COLUMNS}`,
      [
        input.careerPathId,
        input.slug,
        input.title,
        input.description ?? null,
        input.status ?? null,
        input.displayOrder ?? null,
      ],
    );
    return toModule(result.rows[0]);
  }

  async update(
    id: string,
    patch: ModulePatch,
  ): Promise<CareerPathModule | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, unknown> = {
      slug: patch.slug,
      title: patch.title,
      description: patch.description,
      status: patch.status,
      display_order: patch.displayOrder,
    };

    for (const [column, value] of Object.entries(columnMap)) {
      if (value !== undefined) {
        fields.push(`${column} = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<ModuleRow>(
      `UPDATE career_path_modules SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ? toModule(result.rows[0]) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM career_path_modules WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE career_path_modules SET display_order = $1, updated_at = now() WHERE id = $2',
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

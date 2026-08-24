import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';
import type { ContentStatus } from './career-paths.repository';

export type CareerPathNode = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: ContentStatus;
  displayOrder: number;
  nodeMeta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type NodeRow = {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: ContentStatus;
  display_order: number;
  node_meta: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS =
  'id, module_id, slug, title, summary, description, status, display_order, node_meta, created_at, updated_at';

function toNode(row: NodeRow): CareerPathNode {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    status: row.status,
    displayOrder: row.display_order,
    nodeMeta: row.node_meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NodeInput = {
  moduleId: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  status?: ContentStatus;
  displayOrder?: number;
  nodeMeta?: Record<string, unknown>;
};

export type NodePatch = Partial<Omit<NodeInput, 'moduleId'>>;

@Injectable()
export class CareerPathNodesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByModuleId(
    moduleId: string,
    opts: { onlyPublished: boolean },
  ): Promise<CareerPathNode[]> {
    const statusClause = opts.onlyPublished ? "AND status = 'published'" : '';
    const result = await this.pool.query<NodeRow>(
      `SELECT ${COLUMNS} FROM career_path_nodes WHERE module_id = $1 ${statusClause} ORDER BY display_order ASC`,
      [moduleId],
    );
    return result.rows.map(toNode);
  }

  /** Batched lookup across many modules at once — avoids N+1 when assembling a full career-path tree. */
  async findByModuleIds(
    moduleIds: string[],
    opts: { onlyPublished: boolean },
  ): Promise<CareerPathNode[]> {
    if (moduleIds.length === 0) return [];
    const statusClause = opts.onlyPublished ? "AND status = 'published'" : '';
    const result = await this.pool.query<NodeRow>(
      `SELECT ${COLUMNS} FROM career_path_nodes WHERE module_id = ANY($1) ${statusClause} ORDER BY display_order ASC`,
      [moduleIds],
    );
    return result.rows.map(toNode);
  }

  async findById(id: string): Promise<CareerPathNode | undefined> {
    const result = await this.pool.query<NodeRow>(
      `SELECT ${COLUMNS} FROM career_path_nodes WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toNode(result.rows[0]) : undefined;
  }

  /** One node within one career path, found by (careerPathSlug, nodeSlug) — used by the node detail page. */
  async findBySlugWithinCareerPath(
    careerPathSlug: string,
    nodeSlug: string,
    opts: { onlyPublished: boolean },
  ): Promise<CareerPathNode | undefined> {
    const statusClause = opts.onlyPublished
      ? "AND n.status = 'published' AND m.status = 'published' AND cp.status = 'published'"
      : '';
    const result = await this.pool.query<NodeRow>(
      `SELECT n.id, n.module_id, n.slug, n.title, n.summary, n.description, n.status, n.display_order, n.node_meta, n.created_at, n.updated_at
       FROM career_path_nodes n
       JOIN career_path_modules m ON m.id = n.module_id
       JOIN career_paths cp ON cp.id = m.career_path_id
       WHERE cp.slug = $1 AND n.slug = $2 ${statusClause}`,
      [careerPathSlug, nodeSlug],
    );
    return result.rows[0] ? toNode(result.rows[0]) : undefined;
  }

  async create(input: NodeInput): Promise<CareerPathNode> {
    const result = await this.pool.query<NodeRow>(
      `INSERT INTO career_path_nodes (module_id, slug, title, summary, description, status, display_order, node_meta)
       VALUES ($1, $2, $3, COALESCE($4, ''), COALESCE($5, ''), COALESCE($6, 'published'), COALESCE($7, 0), COALESCE($8, '{}'::jsonb))
       RETURNING ${COLUMNS}`,
      [
        input.moduleId,
        input.slug,
        input.title,
        input.summary ?? null,
        input.description ?? null,
        input.status ?? null,
        input.displayOrder ?? null,
        input.nodeMeta ? JSON.stringify(input.nodeMeta) : null,
      ],
    );
    return toNode(result.rows[0]);
  }

  async update(
    id: string,
    patch: NodePatch,
  ): Promise<CareerPathNode | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, unknown> = {
      slug: patch.slug,
      title: patch.title,
      summary: patch.summary,
      description: patch.description,
      status: patch.status,
      display_order: patch.displayOrder,
      node_meta:
        patch.nodeMeta !== undefined
          ? JSON.stringify(patch.nodeMeta)
          : undefined,
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

    const result = await this.pool.query<NodeRow>(
      `UPDATE career_path_nodes SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ? toNode(result.rows[0]) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM career_path_nodes WHERE id = $1',
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
          'UPDATE career_path_nodes SET display_order = $1, updated_at = now() WHERE id = $2',
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

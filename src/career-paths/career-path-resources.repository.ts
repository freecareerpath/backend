import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pool';

export type CareerPathResource = {
  id: string;
  nodeId: string;
  label: string;
  url: string;
  displayOrder: number;
};

type ResourceRow = {
  id: string;
  node_id: string;
  label: string;
  url: string;
  display_order: number;
};

const COLUMNS = 'id, node_id, label, url, display_order';

function toResource(row: ResourceRow): CareerPathResource {
  return {
    id: row.id,
    nodeId: row.node_id,
    label: row.label,
    url: row.url,
    displayOrder: row.display_order,
  };
}

export type ResourceInput = {
  nodeId: string;
  label: string;
  url: string;
  displayOrder?: number;
};

export type ResourcePatch = Partial<Omit<ResourceInput, 'nodeId'>>;

@Injectable()
export class CareerPathResourcesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByNodeId(nodeId: string): Promise<CareerPathResource[]> {
    const result = await this.pool.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM career_path_resources WHERE node_id = $1 ORDER BY display_order ASC`,
      [nodeId],
    );
    return result.rows.map(toResource);
  }

  /** Batched lookup across many nodes at once — avoids N+1 when assembling a full career-path tree. */
  async findByNodeIds(nodeIds: string[]): Promise<CareerPathResource[]> {
    if (nodeIds.length === 0) return [];
    const result = await this.pool.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM career_path_resources WHERE node_id = ANY($1) ORDER BY display_order ASC`,
      [nodeIds],
    );
    return result.rows.map(toResource);
  }

  async findById(id: string): Promise<CareerPathResource | undefined> {
    const result = await this.pool.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM career_path_resources WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toResource(result.rows[0]) : undefined;
  }

  async create(input: ResourceInput): Promise<CareerPathResource> {
    const result = await this.pool.query<ResourceRow>(
      `INSERT INTO career_path_resources (node_id, label, url, display_order)
       VALUES ($1, $2, $3, COALESCE($4, 0))
       RETURNING ${COLUMNS}`,
      [input.nodeId, input.label, input.url, input.displayOrder ?? null],
    );
    return toResource(result.rows[0]);
  }

  async update(
    id: string,
    patch: ResourcePatch,
  ): Promise<CareerPathResource | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, unknown> = {
      label: patch.label,
      url: patch.url,
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
    values.push(id);

    const result = await this.pool.query<ResourceRow>(
      `UPDATE career_path_resources SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ? toResource(result.rows[0]) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM career_path_resources WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

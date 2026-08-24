import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CareerPathsRepository,
  type CareerPathPatch,
} from './career-paths.repository';
import {
  CareerPathModulesRepository,
  type ModulePatch,
} from './career-path-modules.repository';
import {
  CareerPathNodesRepository,
  type NodePatch,
} from './career-path-nodes.repository';
import {
  CareerPathResourcesRepository,
  type ResourcePatch,
} from './career-path-resources.repository';
import type {
  CareerPathDetailDto,
  CareerPathSummaryDto,
  ModuleDto,
  NodeDto,
  ResourceDto,
} from './career-paths.types';
import {
  optionalNonNegativeInt,
  optionalSlug,
  optionalString,
  requireNonEmptyString,
  requireOrderedIdArray,
  requireSlug,
  requireStatus,
  requireUrl,
} from './validation';

type CreateCareerPathInput = {
  slug: unknown;
  title: unknown;
  shortDescription: unknown;
  description: unknown;
  status?: unknown;
  icon?: unknown;
  displayOrder?: unknown;
};

type CreateModuleInput = {
  slug: unknown;
  title: unknown;
  description?: unknown;
  status?: unknown;
  displayOrder?: unknown;
};

type CreateNodeInput = {
  slug: unknown;
  title: unknown;
  summary?: unknown;
  description?: unknown;
  status?: unknown;
  displayOrder?: unknown;
  nodeMeta?: unknown;
};

type CreateResourceInput = {
  label: unknown;
  url: unknown;
  displayOrder?: unknown;
};

/**
 * Assembles the public/admin career-path tree via a fixed small number of
 * batched queries (career path -> its modules -> all their nodes in one
 * query -> all those nodes' resources in one query), regardless of how many
 * modules/nodes exist — avoids N+1 round trips per node/resource.
 */
@Injectable()
export class CareerPathsService {
  constructor(
    private readonly careerPaths: CareerPathsRepository,
    private readonly modules: CareerPathModulesRepository,
    private readonly nodes: CareerPathNodesRepository,
    private readonly resources: CareerPathResourcesRepository,
  ) {}

  // ---------- Public reads ----------

  async listPublished(): Promise<CareerPathSummaryDto[]> {
    const paths = await this.careerPaths.findAll({ onlyPublished: true });
    const contentByPath = await this.hasContentByPathId(
      paths.map((p) => p.id),
      { onlyPublished: true },
    );
    return paths.map((p) => toSummaryDto(p, contentByPath.get(p.id) ?? false));
  }

  async getPublishedBySlug(slug: string): Promise<CareerPathDetailDto> {
    const path = await this.careerPaths.findBySlug(slug, {
      onlyPublished: true,
    });
    if (!path) throw new NotFoundException('Career path not found.');
    const modules = await this.assembleModules(path.id, {
      onlyPublished: true,
    });
    return { ...toSummaryDto(path, modules.length > 0), modules };
  }

  async getPublishedNode(
    careerPathSlug: string,
    nodeSlug: string,
  ): Promise<{
    careerPath: CareerPathSummaryDto;
    node: NodeDto;
  }> {
    const path = await this.careerPaths.findBySlug(careerPathSlug, {
      onlyPublished: true,
    });
    if (!path) throw new NotFoundException('Career path not found.');

    const node = await this.nodes.findBySlugWithinCareerPath(
      careerPathSlug,
      nodeSlug,
      {
        onlyPublished: true,
      },
    );
    if (!node) throw new NotFoundException('Node not found.');

    const resourceRows = await this.resources.findByNodeId(node.id);
    return {
      // A node was found within this career path, so it necessarily has content.
      careerPath: toSummaryDto(path, true),
      node: toNodeDto(node, resourceRows),
    };
  }

  // ---------- Admin reads ----------

  async adminListAll(): Promise<CareerPathSummaryDto[]> {
    const paths = await this.careerPaths.findAll({ onlyPublished: false });
    const contentByPath = await this.hasContentByPathId(
      paths.map((p) => p.id),
      { onlyPublished: false },
    );
    return paths.map((p) => toSummaryDto(p, contentByPath.get(p.id) ?? false));
  }

  /** One batched query across every requested career path — avoids N+1 when computing `hasContent` for a whole list. */
  private async hasContentByPathId(
    careerPathIds: string[],
    opts: { onlyPublished: boolean },
  ): Promise<Map<string, boolean>> {
    const moduleRows = await this.modules.findByCareerPathIds(
      careerPathIds,
      opts,
    );
    const result = new Map<string, boolean>();
    for (const m of moduleRows) result.set(m.careerPathId, true);
    return result;
  }

  async adminGetById(id: string): Promise<CareerPathDetailDto> {
    const path = await this.careerPaths.findById(id);
    if (!path) throw new NotFoundException('Career path not found.');
    const modules = await this.assembleModules(path.id, {
      onlyPublished: false,
    });
    return { ...toSummaryDto(path, modules.length > 0), modules };
  }

  private async assembleModules(
    careerPathId: string,
    opts: { onlyPublished: boolean },
  ): Promise<ModuleDto[]> {
    const moduleRows = await this.modules.findByCareerPathId(
      careerPathId,
      opts,
    );
    if (moduleRows.length === 0) return [];

    const moduleIds = moduleRows.map((m) => m.id);
    const nodeRows = await this.nodes.findByModuleIds(moduleIds, opts);
    const nodeIds = nodeRows.map((n) => n.id);
    const resourceRows = await this.resources.findByNodeIds(nodeIds);

    const resourcesByNode = groupBy(resourceRows, (r) => r.nodeId);
    const nodesByModule = groupBy(nodeRows, (n) => n.moduleId);

    return moduleRows.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      description: m.description,
      status: m.status,
      displayOrder: m.displayOrder,
      nodes: (nodesByModule.get(m.id) ?? []).map((n) =>
        toNodeDto(n, resourcesByNode.get(n.id) ?? []),
      ),
    }));
  }

  // ---------- Admin: career paths ----------

  async adminCreateCareerPath(
    input: CreateCareerPathInput,
  ): Promise<CareerPathDetailDto> {
    const slug = requireSlug(input.slug);
    if (await this.careerPaths.slugExists(slug)) {
      throw new ConflictException(
        'A career path with this slug already exists.',
      );
    }
    const created = await this.careerPaths.create({
      slug,
      title: requireNonEmptyString(input.title, 'title', 200),
      shortDescription: requireNonEmptyString(
        input.shortDescription,
        'shortDescription',
        500,
      ),
      description: optionalString(input.description, 'description') ?? '',
      status:
        input.status !== undefined ? requireStatus(input.status) : undefined,
      icon: typeof input.icon === 'string' ? input.icon : undefined,
      displayOrder: optionalNonNegativeInt(input.displayOrder, 'displayOrder'),
    });
    return { ...toSummaryDto(created, false), modules: [] };
  }

  async adminUpdateCareerPath(
    id: string,
    input: Partial<CreateCareerPathInput>,
  ): Promise<CareerPathDetailDto> {
    await this.requireCareerPath(id);

    const patch: CareerPathPatch = {};
    if (input.slug !== undefined) {
      const slug = optionalSlug(input.slug)!;
      if (await this.careerPaths.slugExists(slug, id)) {
        throw new ConflictException(
          'A career path with this slug already exists.',
        );
      }
      patch.slug = slug;
    }
    if (input.title !== undefined)
      patch.title = requireNonEmptyString(input.title, 'title', 200);
    if (input.shortDescription !== undefined) {
      patch.shortDescription = requireNonEmptyString(
        input.shortDescription,
        'shortDescription',
        500,
      );
    }
    if (input.description !== undefined)
      patch.description = optionalString(input.description, 'description');
    if (input.status !== undefined) patch.status = requireStatus(input.status);
    if (input.icon !== undefined)
      patch.icon = typeof input.icon === 'string' ? input.icon : null;
    if (input.displayOrder !== undefined) {
      patch.displayOrder = optionalNonNegativeInt(
        input.displayOrder,
        'displayOrder',
      );
    }

    await this.careerPaths.update(id, patch);
    return this.adminGetById(id);
  }

  async adminDeleteCareerPath(id: string): Promise<void> {
    await this.requireCareerPath(id);
    await this.careerPaths.delete(id);
  }

  async adminReorderCareerPaths(orderedIds: unknown): Promise<void> {
    await this.careerPaths.reorder(requireOrderedIdArray(orderedIds));
  }

  // ---------- Admin: modules ----------

  async adminCreateModule(
    careerPathId: string,
    input: CreateModuleInput,
  ): Promise<ModuleDto> {
    await this.requireCareerPath(careerPathId);
    const created = await this.modules.create({
      careerPathId,
      slug: requireSlug(input.slug),
      title: requireNonEmptyString(input.title, 'title', 200),
      description: optionalString(input.description, 'description'),
      status:
        input.status !== undefined ? requireStatus(input.status) : undefined,
      displayOrder: optionalNonNegativeInt(input.displayOrder, 'displayOrder'),
    });
    return { ...created, nodes: [] };
  }

  async adminUpdateModule(
    id: string,
    input: Partial<CreateModuleInput>,
  ): Promise<ModuleDto> {
    const existing = await this.modules.findById(id);
    if (!existing) throw new NotFoundException('Module not found.');

    const patch: ModulePatch = {};
    if (input.slug !== undefined) patch.slug = optionalSlug(input.slug);
    if (input.title !== undefined)
      patch.title = requireNonEmptyString(input.title, 'title', 200);
    if (input.description !== undefined)
      patch.description = optionalString(input.description, 'description');
    if (input.status !== undefined) patch.status = requireStatus(input.status);
    if (input.displayOrder !== undefined) {
      patch.displayOrder = optionalNonNegativeInt(
        input.displayOrder,
        'displayOrder',
      );
    }

    const updated = await this.modules.update(id, patch);
    const nodeRows = await this.nodes.findByModuleId(id, {
      onlyPublished: false,
    });
    const resourceRows = await this.resources.findByNodeIds(
      nodeRows.map((n) => n.id),
    );
    const resourcesByNode = groupBy(resourceRows, (r) => r.nodeId);
    return {
      ...updated!,
      nodes: nodeRows.map((n) => toNodeDto(n, resourcesByNode.get(n.id) ?? [])),
    };
  }

  async adminDeleteModule(id: string): Promise<void> {
    const existing = await this.modules.findById(id);
    if (!existing) throw new NotFoundException('Module not found.');
    await this.modules.delete(id);
  }

  async adminReorderModules(orderedIds: unknown): Promise<void> {
    await this.modules.reorder(requireOrderedIdArray(orderedIds));
  }

  // ---------- Admin: nodes ----------

  async adminCreateNode(
    moduleId: string,
    input: CreateNodeInput,
  ): Promise<NodeDto> {
    const existingModule = await this.modules.findById(moduleId);
    if (!existingModule) throw new NotFoundException('Module not found.');

    const created = await this.nodes.create({
      moduleId,
      slug: requireSlug(input.slug),
      title: requireNonEmptyString(input.title, 'title', 200),
      summary: optionalString(input.summary, 'summary', 500),
      description: optionalString(input.description, 'description'),
      status:
        input.status !== undefined ? requireStatus(input.status) : undefined,
      displayOrder: optionalNonNegativeInt(input.displayOrder, 'displayOrder'),
      nodeMeta: isRecord(input.nodeMeta) ? input.nodeMeta : undefined,
    });
    return toNodeDto(created, []);
  }

  async adminUpdateNode(
    id: string,
    input: Partial<CreateNodeInput>,
  ): Promise<NodeDto> {
    const existing = await this.nodes.findById(id);
    if (!existing) throw new NotFoundException('Node not found.');

    const patch: NodePatch = {};
    if (input.slug !== undefined) patch.slug = optionalSlug(input.slug);
    if (input.title !== undefined)
      patch.title = requireNonEmptyString(input.title, 'title', 200);
    if (input.summary !== undefined)
      patch.summary = optionalString(input.summary, 'summary', 500);
    if (input.description !== undefined)
      patch.description = optionalString(input.description, 'description');
    if (input.status !== undefined) patch.status = requireStatus(input.status);
    if (input.displayOrder !== undefined) {
      patch.displayOrder = optionalNonNegativeInt(
        input.displayOrder,
        'displayOrder',
      );
    }
    if (input.nodeMeta !== undefined && isRecord(input.nodeMeta))
      patch.nodeMeta = input.nodeMeta;

    const updated = await this.nodes.update(id, patch);
    const resourceRows = await this.resources.findByNodeId(id);
    return toNodeDto(updated!, resourceRows);
  }

  async adminDeleteNode(id: string): Promise<void> {
    const existing = await this.nodes.findById(id);
    if (!existing) throw new NotFoundException('Node not found.');
    await this.nodes.delete(id);
  }

  async adminReorderNodes(orderedIds: unknown): Promise<void> {
    await this.nodes.reorder(requireOrderedIdArray(orderedIds));
  }

  // ---------- Admin: resources ----------

  async adminCreateResource(
    nodeId: string,
    input: CreateResourceInput,
  ): Promise<ResourceDto> {
    const existingNode = await this.nodes.findById(nodeId);
    if (!existingNode) throw new NotFoundException('Node not found.');

    const created = await this.resources.create({
      nodeId,
      label: requireNonEmptyString(input.label, 'label', 200),
      url: requireUrl(input.url),
      displayOrder: optionalNonNegativeInt(input.displayOrder, 'displayOrder'),
    });
    return toResourceDto(created);
  }

  async adminUpdateResource(
    id: string,
    input: Partial<CreateResourceInput>,
  ): Promise<ResourceDto> {
    const existing = await this.resources.findById(id);
    if (!existing) throw new NotFoundException('Resource not found.');

    const patch: ResourcePatch = {};
    if (input.label !== undefined)
      patch.label = requireNonEmptyString(input.label, 'label', 200);
    if (input.url !== undefined) patch.url = requireUrl(input.url);
    if (input.displayOrder !== undefined) {
      patch.displayOrder = optionalNonNegativeInt(
        input.displayOrder,
        'displayOrder',
      );
    }

    const updated = await this.resources.update(id, patch);
    return toResourceDto(updated!);
  }

  async adminDeleteResource(id: string): Promise<void> {
    const existing = await this.resources.findById(id);
    if (!existing) throw new NotFoundException('Resource not found.');
    await this.resources.delete(id);
  }

  private async requireCareerPath(id: string) {
    const existing = await this.careerPaths.findById(id);
    if (!existing) throw new NotFoundException('Career path not found.');
    return existing;
  }
}

function toSummaryDto(
  path: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    description: string;
    status: 'draft' | 'published';
    icon: string | null;
    displayOrder: number;
  },
  hasContent: boolean,
): CareerPathSummaryDto {
  return {
    id: path.id,
    slug: path.slug,
    title: path.title,
    shortDescription: path.shortDescription,
    description: path.description,
    status: path.status,
    icon: path.icon,
    displayOrder: path.displayOrder,
    hasContent,
  };
}

function toNodeDto(
  node: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string;
    status: 'draft' | 'published';
    displayOrder: number;
    nodeMeta: Record<string, unknown>;
  },
  resources: { id: string; label: string; url: string; displayOrder: number }[],
): NodeDto {
  return {
    id: node.id,
    slug: node.slug,
    title: node.title,
    summary: node.summary,
    description: node.description,
    status: node.status,
    displayOrder: node.displayOrder,
    nodeMeta: node.nodeMeta,
    resources: resources.map(toResourceDto),
  };
}

function toResourceDto(r: {
  id: string;
  label: string;
  url: string;
  displayOrder: number;
}): ResourceDto {
  return { id: r.id, label: r.label, url: r.url, displayOrder: r.displayOrder };
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

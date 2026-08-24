/** Public/admin API response shapes — the tree assembled by CareerPathsService. */

export type ResourceDto = {
  id: string;
  label: string;
  url: string;
  displayOrder: number;
};

export type NodeDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: 'draft' | 'published';
  displayOrder: number;
  nodeMeta: Record<string, unknown>;
  resources: ResourceDto[];
};

export type ModuleDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  displayOrder: number;
  nodes: NodeDto[];
};

export type CareerPathSummaryDto = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status: 'draft' | 'published';
  icon: string | null;
  displayOrder: number;
  /** Whether this career path has at least one published module — lets the frontend distinguish "live, browsable" tracks from "announced, coming soon" ones without hard-coding a slug list. */
  hasContent: boolean;
};

export type CareerPathDetailDto = CareerPathSummaryDto & {
  modules: ModuleDto[];
};

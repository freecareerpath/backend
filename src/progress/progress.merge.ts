export type LocalRoadmapProgress = {
  roadmapSlug: string;
  completedNodeSlugs: string[];
};

export type ProgressRow = { roadmapSlug: string; nodeSlug: string };

/**
 * Pure merge logic (US-017, ADR-0004 "merge, server wins on conflict") — no
 * database involved, fully unit-testable. Returns only the rows that need
 * inserting: anything already present server-side is left untouched (a
 * completed node never regresses), and anything already migrated produces an
 * empty diff on a repeat call, so calling this twice with the same input is
 * naturally idempotent without a separate "already migrated" flag.
 */
export function computeMigrationInserts(
  local: LocalRoadmapProgress[],
  serverRows: ProgressRow[],
): ProgressRow[] {
  const serverKeys = new Set(
    serverRows.map((row) => `${row.roadmapSlug}::${row.nodeSlug}`),
  );

  const inserts: ProgressRow[] = [];
  for (const entry of local) {
    for (const nodeSlug of entry.completedNodeSlugs) {
      const key = `${entry.roadmapSlug}::${nodeSlug}`;
      if (!serverKeys.has(key)) {
        inserts.push({ roadmapSlug: entry.roadmapSlug, nodeSlug });
      }
    }
  }
  return inserts;
}

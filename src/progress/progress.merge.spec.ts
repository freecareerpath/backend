import { computeMigrationInserts } from './progress.merge';

describe('computeMigrationInserts', () => {
  it('inserts local-only completions when the server has nothing yet', () => {
    const inserts = computeMigrationInserts(
      [{ roadmapSlug: 'foundations', completedNodeSlugs: ['a', 'b'] }],
      [],
    );
    expect(inserts).toEqual([
      { roadmapSlug: 'foundations', nodeSlug: 'a' },
      { roadmapSlug: 'foundations', nodeSlug: 'b' },
    ]);
  });

  it('never re-inserts a node the server already has (server wins on conflict)', () => {
    const inserts = computeMigrationInserts(
      [{ roadmapSlug: 'foundations', completedNodeSlugs: ['a', 'b'] }],
      [{ roadmapSlug: 'foundations', nodeSlug: 'a' }],
    );
    expect(inserts).toEqual([{ roadmapSlug: 'foundations', nodeSlug: 'b' }]);
  });

  it('is idempotent: running it again after the server catches up produces no new inserts', () => {
    const local = [
      { roadmapSlug: 'foundations', completedNodeSlugs: ['a', 'b'] },
    ];
    const firstPass = computeMigrationInserts(local, []);
    const serverAfterFirstPass = firstPass;

    const secondPass = computeMigrationInserts(local, serverAfterFirstPass);
    expect(secondPass).toEqual([]);
  });

  it('keeps roadmaps independent — a node slug on one roadmap does not satisfy the same slug on another', () => {
    const inserts = computeMigrationInserts(
      [{ roadmapSlug: 'git-github', completedNodeSlugs: ['intro'] }],
      [{ roadmapSlug: 'foundations', nodeSlug: 'intro' }],
    );
    expect(inserts).toEqual([{ roadmapSlug: 'git-github', nodeSlug: 'intro' }]);
  });

  it('handles an empty local snapshot without error', () => {
    expect(
      computeMigrationInserts([], [{ roadmapSlug: 'x', nodeSlug: 'y' }]),
    ).toEqual([]);
  });
});

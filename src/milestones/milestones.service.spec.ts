import { MilestonesService } from './milestones.service';

function makeRepo() {
  return {
    createSubmission: jest.fn(),
    findSubmission: jest.fn(),
    setStatus: jest.fn(),
    awardBadge: jest.fn(),
    findBadgesForUser: jest.fn(),
  };
}

describe('MilestonesService', () => {
  it('rejects a submission whose proof URL is unreachable, before ever creating it', async () => {
    const repo = makeRepo();
    const service = new MilestonesService(repo as never);

    await expect(
      service.submit('u1', 'ship-a-project', 'not a url'),
    ).rejects.toThrow();
    expect(repo.createSubmission).not.toHaveBeenCalled();
  });

  it('awards a badge only after a submission is accepted, never on submission alone', async () => {
    const repo = makeRepo();
    repo.findSubmission.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      milestoneSlug: 'ship-a-project',
      proofUrl: 'https://example.com',
      status: 'pending',
    });
    const service = new MilestonesService(repo as never);

    await service.accept('s1');

    expect(repo.setStatus).toHaveBeenCalledWith('s1', 'accepted');
    expect(repo.awardBadge).toHaveBeenCalledWith('u1', 'ship-a-project');
  });

  it('rejecting a submission never awards a badge', async () => {
    const repo = makeRepo();
    repo.findSubmission.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      milestoneSlug: 'ship-a-project',
      proofUrl: 'https://example.com',
      status: 'pending',
    });
    const service = new MilestonesService(repo as never);

    await service.reject('s1');

    expect(repo.setStatus).toHaveBeenCalledWith('s1', 'rejected');
    expect(repo.awardBadge).not.toHaveBeenCalled();
  });

  it('accepting/rejecting an unknown submission throws instead of silently badging', async () => {
    const repo = makeRepo();
    repo.findSubmission.mockResolvedValue(undefined);
    const service = new MilestonesService(repo as never);

    await expect(service.accept('missing')).rejects.toThrow();
    expect(repo.awardBadge).not.toHaveBeenCalled();
  });
});

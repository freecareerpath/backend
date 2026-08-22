import { NudgesService } from './nudges.service';
import * as emailModule from './email';

function makeRepo() {
  return {
    findCandidates: jest.fn(),
    findEmail: jest.fn(),
    markNudged: jest.fn(),
    setEnabled: jest.fn(),
  };
}

describe('NudgesService.sendNudges', () => {
  it('emails only eligible candidates and records when they were nudged', async () => {
    const repo = makeRepo();
    repo.findCandidates.mockResolvedValue([
      {
        userId: 'eligible',
        weeklyNudgeEnabled: true,
        hasIncompleteProgress: true,
        lastActivityAt: new Date('2026-08-01T00:00:00Z'),
        lastNudgedAt: null,
      },
      {
        userId: 'opted-out',
        weeklyNudgeEnabled: false,
        hasIncompleteProgress: true,
        lastActivityAt: new Date('2026-08-01T00:00:00Z'),
        lastNudgedAt: null,
      },
    ]);
    repo.findEmail.mockResolvedValue('user@example.com');
    const sendEmailSpy = jest
      .spyOn(emailModule, 'sendEmail')
      .mockResolvedValue(undefined);

    const service = new NudgesService(repo as never);
    const now = new Date('2026-08-21T00:00:00Z');
    const count = await service.sendNudges(now);

    expect(count).toBe(1);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(repo.markNudged).toHaveBeenCalledWith('eligible', now);
    expect(repo.markNudged).not.toHaveBeenCalledWith('opted-out', now);

    sendEmailSpy.mockRestore();
  });

  it('sends nothing when there are no eligible candidates', async () => {
    const repo = makeRepo();
    repo.findCandidates.mockResolvedValue([]);
    const sendEmailSpy = jest
      .spyOn(emailModule, 'sendEmail')
      .mockResolvedValue(undefined);

    const service = new NudgesService(repo as never);
    const count = await service.sendNudges(new Date('2026-08-21T00:00:00Z'));

    expect(count).toBe(0);
    expect(sendEmailSpy).not.toHaveBeenCalled();
    sendEmailSpy.mockRestore();
  });
});

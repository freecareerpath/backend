import {
  selectEligibleForNudge,
  type NudgeCandidate,
} from './nudges.eligibility';

const now = new Date('2026-08-21T00:00:00Z');
const eightDaysAgo = new Date('2026-08-13T00:00:00Z');
const oneDayAgo = new Date('2026-08-20T00:00:00Z');

function baseCandidate(
  overrides: Partial<NudgeCandidate> = {},
): NudgeCandidate {
  return {
    userId: 'u1',
    weeklyNudgeEnabled: true,
    hasIncompleteProgress: true,
    lastActivityAt: eightDaysAgo,
    lastNudgedAt: null,
    ...overrides,
  };
}

describe('selectEligibleForNudge', () => {
  it('selects a stale, opted-in, incomplete user', () => {
    const result = selectEligibleForNudge([baseCandidate()], now);
    expect(result).toHaveLength(1);
  });

  it('excludes users who opted out', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ weeklyNudgeEnabled: false })],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it('excludes users with nothing incomplete to resume', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ hasIncompleteProgress: false })],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it('excludes users who were active within the last 7 days', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ lastActivityAt: oneDayAgo })],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it('excludes users already nudged within the last 7 days (no double-send)', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ lastNudgedAt: oneDayAgo })],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it('re-includes a user once their last nudge is more than 7 days old', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ lastNudgedAt: eightDaysAgo })],
      now,
    );
    expect(result).toHaveLength(1);
  });

  it('includes a user who has never been active/nudged before (both null)', () => {
    const result = selectEligibleForNudge(
      [baseCandidate({ lastActivityAt: null, lastNudgedAt: null })],
      now,
    );
    expect(result).toHaveLength(1);
  });
});

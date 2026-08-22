export type NudgeCandidate = {
  userId: string;
  weeklyNudgeEnabled: boolean;
  hasIncompleteProgress: boolean;
  lastActivityAt: Date | null;
  lastNudgedAt: Date | null;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure eligibility rule (US-020, ADR-0004 "weekly nudges") — no database
 * involved. A user is nudged at most once a week, only if they opted in,
 * only if there's something real to resume, and never while still actively
 * engaged (no point nudging someone who was just active).
 */
export function selectEligibleForNudge(
  candidates: NudgeCandidate[],
  now: Date,
): NudgeCandidate[] {
  return candidates.filter((candidate) => {
    if (!candidate.weeklyNudgeEnabled) return false;
    if (!candidate.hasIncompleteProgress) return false;

    if (
      candidate.lastActivityAt &&
      now.getTime() - candidate.lastActivityAt.getTime() < SEVEN_DAYS_MS
    ) {
      return false;
    }

    if (
      candidate.lastNudgedAt &&
      now.getTime() - candidate.lastNudgedAt.getTime() < SEVEN_DAYS_MS
    ) {
      return false;
    }

    return true;
  });
}

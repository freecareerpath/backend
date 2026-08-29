/** The rubric a submission is graded against, as stored on the node. */
export type ExplainRubric = {
  mustConvey: string[];
  mustNotClaim: string[];
  followUp?: string;
};

/**
 * The grader's structured verdict.
 *
 * Never a bare verdict: LeetCode can say "Wrong Answer" because you can debug
 * your own code, but an unexplained rejection here is infuriating and teaches
 * nothing. `gotRight` comes first deliberately — it is the motivating half,
 * and naming it specifically is what makes the rest land.
 */
export type ExplainFeedback = {
  /** Indices into rubric.mustConvey the answer actually conveyed. */
  conveyed: number[];
  /** Indices into rubric.mustNotClaim the answer stated. Any one fails. */
  claimed: number[];
  /** What the answer got right, in the grader's words, naming specifics. */
  gotRight: string;
  /** What is missing, and why it matters. Empty when nothing is. */
  missing: string;
  /** Why each stated misconception is wrong. Empty when there are none. */
  misconceptions: string;
  /** Derived, not asked of the model: any claimed misconception fails. */
  passed: boolean;
};

export type QuotaState = {
  used: number;
  limit: number;
  remaining: number;
};

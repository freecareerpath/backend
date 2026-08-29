import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DEFAULT_DAILY_LIMIT, ExplainRepository } from './explain.repository';
import { OpenAiGrader } from './openai-grader';
import type { ExplainFeedback, QuotaState } from './explain.types';

const MIN_ANSWER_CHARS = 20;
const MAX_ANSWER_CHARS = 4000;

export type SubmitResult = {
  feedback: ExplainFeedback;
  quota: QuotaState;
  /** True when this verdict came from the cache and cost no attempt. */
  cached: boolean;
};

@Injectable()
export class ExplainService {
  constructor(
    private readonly repo: ExplainRepository,
    private readonly grader: OpenAiGrader,
  ) {}

  async getQuota(userId: string): Promise<QuotaState> {
    const [limit, used] = await Promise.all([
      this.repo.findDailyLimit(userId),
      this.repo.countToday(userId),
    ]);
    return { used, limit, remaining: Math.max(0, limit - used) };
  }

  async submit(params: {
    userId: string;
    roadmapSlug: string;
    nodeSlug: string;
    answer: string;
  }): Promise<SubmitResult> {
    const answer = params.answer.trim();

    if (answer.length < MIN_ANSWER_CHARS) {
      throw new BadRequestException(
        `Write a bit more than that — at least ${MIN_ANSWER_CHARS} characters.`,
      );
    }
    if (answer.length > MAX_ANSWER_CHARS) {
      throw new BadRequestException(
        `That is longer than ${MAX_ANSWER_CHARS} characters. Interview answers are short; say the important part.`,
      );
    }

    const node = await this.repo.findRubric(params.roadmapSlug, params.nodeSlug);
    if (!node) {
      throw new NotFoundException('That question has no rubric to grade against.');
    }

    const answerHash = hashAnswer(answer);

    // A resubmitted identical answer returns the stored verdict: it costs no
    // attempt, no API call, and — the part that matters — cannot come back
    // with a different verdict than it did the first time.
    const cached = await this.repo.findCachedFeedback(params.nodeSlug, answerHash);
    if (cached) {
      await this.repo.recordSubmission({
        ...params,
        answer,
        answerHash,
        feedback: cached.feedback,
        model: cached.model,
        countedAgainstQuota: false,
      });
      return { feedback: cached.feedback, quota: await this.getQuota(params.userId), cached: true };
    }

    const quota = await this.getQuota(params.userId);
    if (quota.remaining <= 0) {
      // 429 rather than 403: this is a rate limit, and it lifts tomorrow.
      throw new HttpException(
        {
          message: `You've used all ${quota.limit} graded answers for today. They reset at midnight UTC — or message us and we'll raise your limit, free.`,
          quota,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const feedback = await this.grader.grade({
      question: node.title,
      answer,
      rubric: node.rubric,
    });

    await this.repo.recordSubmission({
      ...params,
      answer,
      answerHash,
      feedback,
      model: this.grader.model,
      countedAgainstQuota: true,
    });

    return { feedback, quota: await this.getQuota(params.userId), cached: false };
  }
}

/**
 * Cache key. Case and whitespace are normalised so trivial edits — a fixed
 * typo, a re-wrapped line — hit the same verdict rather than burning another
 * attempt on an answer that says the same thing.
 */
function hashAnswer(answer: string): string {
  const normalised = answer.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalised).digest('hex');
}

export { DEFAULT_DAILY_LIMIT };

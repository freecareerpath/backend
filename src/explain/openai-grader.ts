import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ExplainFeedback, ExplainRubric } from './explain.types';

/**
 * Grades an explanation against a hand-written rubric using the OpenAI API.
 *
 * Model choice: gpt-5-nano, the cheapest model OpenAI offers
 * ($0.05 / $0.40 per million input / output tokens as of August 2026). A
 * submission is a few hundred tokens of rubric plus a few hundred of answer,
 * so a graded submission costs a small fraction of a cent. Overridable with
 * OPENAI_MODEL without a code change.
 *
 * Two things matter more than the model:
 *
 *  - **The rubric is ours; the model only applies it.** The prompt gives the
 *    model our mustConvey / mustNotClaim lists and asks which items are
 *    present. It is not asked whether the answer is "good" — that would be
 *    the model inventing a standard, and the standard is the whole product.
 *
 *  - **Concepts, not vocabulary.** The prompt is explicit that an answer in
 *    different words, or in imperfect English, is correct if the concept is
 *    there. Our audience is largely learning in a second language, and
 *    marking them down for phrasing is the fastest way to lose them.
 *
 * temperature is 0 so the same answer tends to the same verdict; the real
 * consistency guarantee is the verdict cache in the repository.
 */

const DEFAULT_MODEL = 'gpt-5-nano';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 30_000;

type ChatCompletion = {
  choices?: { message?: { content?: string } }[];
};

@Injectable()
export class OpenAiGrader {
  private readonly logger = new Logger(OpenAiGrader.name);

  get model(): string {
    return process.env.OPENAI_MODEL || DEFAULT_MODEL;
  }

  get configured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async grade(params: {
    question: string;
    answer: string;
    rubric: ExplainRubric;
  }): Promise<ExplainFeedback> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Grading is not configured on this server.',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt(params) },
          ],
        }),
      });
    } catch (error) {
      clearTimeout(timer);
      this.logger.error(`OpenAI request failed: ${String(error)}`);
      throw new ServiceUnavailableException(
        'The grader is unreachable right now. Your answer was not used up — try again shortly.',
      );
    }
    clearTimeout(timer);

    if (!response.ok) {
      // Never surface the provider's body: it can echo the request and, on an
      // auth failure, name the key.
      this.logger.error(`OpenAI returned ${response.status}`);
      throw new ServiceUnavailableException(
        'The grader is unavailable right now. Your answer was not used up — try again shortly.',
      );
    }

    const body = (await response.json()) as ChatCompletion;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException('The grader returned nothing.');
    }

    return this.parse(content, params.rubric);
  }

  /**
   * The model's JSON is untrusted input like any other. An index that does not
   * point into the rubric is dropped rather than trusted, so a hallucinated
   * "you claimed misconception 7" cannot fail an answer against a
   * misconception that does not exist.
   */
  private parse(content: string, rubric: ExplainRubric): ExplainFeedback {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(
        'The grader returned something unreadable. Your answer was not used up.',
      );
    }

    const indices = (value: unknown, bound: number): number[] =>
      Array.isArray(value)
        ? Array.from(
            new Set(
              value.filter(
                (v): v is number =>
                  Number.isInteger(v) && (v as number) >= 0 && (v as number) < bound,
              ),
            ),
          ).sort((a, b) => a - b)
        : [];

    const text = (value: unknown): string =>
      typeof value === 'string' ? value.trim().slice(0, 2000) : '';

    const claimed = indices(raw.claimed, rubric.mustNotClaim.length);
    const conveyed = indices(raw.conveyed, rubric.mustConvey.length);

    return {
      conveyed,
      claimed,
      gotRight: text(raw.gotRight),
      missing: text(raw.missing),
      misconceptions: text(raw.misconceptions),
      // Derived here, not asked of the model: every concept present and no
      // misconception stated. A misconception fails the answer outright
      // however much of the rest is right.
      passed: claimed.length === 0 && conveyed.length === rubric.mustConvey.length,
    };
  }
}

const SYSTEM_PROMPT = `You grade short written explanations of C++ and concurrency concepts for people preparing for quant developer interviews.

You are given a question, a candidate's answer, and a rubric with two lists written by the site's authors. Apply that rubric. Do not invent your own standard for what a good answer is, and do not grade on style, length, or polish.

Rules, in order of importance:

1. Grade concepts, not vocabulary. If the answer conveys a rubric point in different words, by analogy, or in imperfect English, it counts. Many of these learners are writing in a second language; never mark a point missing because the wording is not the textbook phrasing.
2. A point counts only if the answer actually conveys it. Do not give credit for a related keyword appearing near it. "Mutex, mutual exclusion, lock, atomic" with no explanation conveys nothing.
3. Report a mustNotClaim item only when the answer really asserts it. Do not infer it from an omission.
4. Write the prose feedback directly to the candidate as "you". Be specific and quote their own phrasing where it helps. Be encouraging about what is right and blunt about what is wrong, without being unkind.

Reply with JSON only, in exactly this shape:
{
  "conveyed": [indices into mustConvey the answer conveys],
  "claimed": [indices into mustNotClaim the answer asserts],
  "gotRight": "what the answer gets right, naming specifics",
  "missing": "what is missing from mustConvey and why it matters, or an empty string",
  "misconceptions": "each misconception stated and why it is wrong, or an empty string"
}`;

function userPrompt(params: {
  question: string;
  answer: string;
  rubric: ExplainRubric;
}): string {
  const list = (items: string[]) =>
    items.map((item, i) => `  ${i}. ${item}`).join('\n') || '  (none)';

  return [
    `QUESTION: ${params.question}`,
    '',
    'RUBRIC — mustConvey (each must be present, in any words):',
    list(params.rubric.mustConvey),
    '',
    'RUBRIC — mustNotClaim (stating any one of these fails the answer):',
    list(params.rubric.mustNotClaim),
    '',
    "CANDIDATE'S ANSWER:",
    params.answer,
  ].join('\n');
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NudgesRepository } from './nudges.repository';
import { selectEligibleForNudge } from './nudges.eligibility';
import { sendEmail } from './email';

@Injectable()
export class NudgesService {
  private readonly logger = new Logger(NudgesService.name);

  constructor(private readonly repository: NudgesRepository) {}

  /** Weekly, in-process cron — no queue/worker infra (ADR-0004). */
  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklyNudge(): Promise<void> {
    const sent = await this.sendNudges(new Date());
    this.logger.log(`Weekly nudge run: ${sent} email(s) sent.`);
  }

  async sendNudges(now: Date): Promise<number> {
    const candidates = await this.repository.findCandidates();
    const eligible = selectEligibleForNudge(candidates, now);

    for (const candidate of eligible) {
      const email = await this.repository.findEmail(candidate.userId);
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: 'Pick up where you left off',
        body: 'You have progress waiting — resume your roadmap when ready.',
      });
      await this.repository.markNudged(candidate.userId, now);
    }

    return eligible.length;
  }

  setEnabled(userId: string, enabled: boolean): Promise<void> {
    return this.repository.setEnabled(userId, enabled);
  }
}

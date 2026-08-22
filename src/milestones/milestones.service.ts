import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MilestonesRepository, type Submission } from './milestones.repository';
import { isReachable } from './url-check';

@Injectable()
export class MilestonesService {
  constructor(private readonly repository: MilestonesRepository) {}

  async submit(
    userId: string,
    milestoneSlug: string,
    proofUrl: string,
  ): Promise<Submission> {
    const reachable = await isReachable(proofUrl);
    if (!reachable) {
      throw new BadRequestException(
        "We couldn't reach that link — please check it and try again.",
      );
    }
    return this.repository.createSubmission(userId, milestoneSlug, proofUrl);
  }

  async accept(submissionId: string): Promise<void> {
    const submission = await this.repository.findSubmission(submissionId);
    if (!submission) throw new NotFoundException('Submission not found.');

    await this.repository.setStatus(submissionId, 'accepted');
    // Badge is awarded only on acceptance — never on submission alone
    // (ADR-0004 "milestone submission honesty").
    await this.repository.awardBadge(
      submission.userId,
      submission.milestoneSlug,
    );
  }

  async reject(submissionId: string): Promise<void> {
    const submission = await this.repository.findSubmission(submissionId);
    if (!submission) throw new NotFoundException('Submission not found.');

    await this.repository.setStatus(submissionId, 'rejected');
  }

  getBadges(userId: string) {
    return this.repository.findBadgesForUser(userId);
  }
}

import { Injectable } from '@nestjs/common';
import { ProgressRepository } from './progress.repository';
import {
  computeMigrationInserts,
  type LocalRoadmapProgress,
  type ProgressRow,
} from './progress.merge';

@Injectable()
export class ProgressService {
  constructor(private readonly repository: ProgressRepository) {}

  getForUser(userId: string): Promise<ProgressRow[]> {
    return this.repository.findForUser(userId);
  }

  setCompletion(
    userId: string,
    roadmapSlug: string,
    nodeSlug: string,
    completed: boolean,
  ): Promise<void> {
    return this.repository.setCompletion(
      userId,
      roadmapSlug,
      nodeSlug,
      completed,
    );
  }

  async migrate(
    userId: string,
    local: LocalRoadmapProgress[],
  ): Promise<{ inserted: number }> {
    const serverRows = await this.repository.findForUser(userId);
    const inserts = computeMigrationInserts(local, serverRows);
    await this.repository.insertMany(userId, inserts);
    return { inserted: inserts.length };
  }
}

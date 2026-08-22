import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import type { LocalRoadmapProgress } from './progress.merge';

type AuthedRequest = Request & { user: { userId: string } };

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  get(@Req() req: AuthedRequest) {
    return this.progress.getForUser(req.user.userId);
  }

  @Post()
  set(
    @Req() req: AuthedRequest,
    @Body()
    body: { roadmapSlug: string; nodeSlug: string; completed: boolean },
  ) {
    return this.progress.setCompletion(
      req.user.userId,
      body.roadmapSlug,
      body.nodeSlug,
      body.completed,
    );
  }

  @Post('migrate')
  migrate(
    @Req() req: AuthedRequest,
    @Body() body: { progress: LocalRoadmapProgress[] },
  ) {
    return this.progress.migrate(req.user.userId, body.progress ?? []);
  }
}

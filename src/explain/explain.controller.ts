import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExplainService } from './explain.service';

type AuthedRequest = Request & { user: { userId: string } };

/**
 * Graded Explain Mode submissions.
 *
 * Auth is required on both routes — the daily allowance is per account, and
 * an anonymous quota would be a cookie away from unlimited. The web app keeps
 * the ungraded self-check available logged-out, so signing in adds grading
 * rather than gating the exercise itself.
 */
@Controller('explain')
@UseGuards(JwtAuthGuard)
export class ExplainController {
  constructor(private readonly explain: ExplainService) {}

  @Get('quota')
  quota(@Req() req: AuthedRequest) {
    return this.explain.getQuota(req.user.userId);
  }

  @Post('submit')
  submit(
    @Req() req: AuthedRequest,
    @Body() body: { roadmapSlug: string; nodeSlug: string; answer: string },
  ) {
    return this.explain.submit({
      userId: req.user.userId,
      roadmapSlug: body.roadmapSlug,
      nodeSlug: body.nodeSlug,
      answer: body.answer ?? '',
    });
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InternalTokenGuard } from './internal-token.guard';
import { MilestonesService } from './milestones.service';

type AuthedRequest = Request & { user: { userId: string } };

@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @Req() req: AuthedRequest,
    @Body() body: { milestoneSlug: string; proofUrl: string },
  ) {
    return this.milestones.submit(
      req.user.userId,
      body.milestoneSlug,
      body.proofUrl,
    );
  }

  @Get('badges')
  @UseGuards(JwtAuthGuard)
  badges(@Req() req: AuthedRequest) {
    return this.milestones.getBadges(req.user.userId);
  }

  @Post('submissions/:id/accept')
  @UseGuards(InternalTokenGuard)
  accept(@Param('id') id: string) {
    return this.milestones.accept(id);
  }

  @Post('submissions/:id/reject')
  @UseGuards(InternalTokenGuard)
  reject(@Param('id') id: string) {
    return this.milestones.reject(id);
  }
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NudgesService } from './nudges.service';

type AuthedRequest = Request & { user: { userId: string } };

@Controller('nudges')
export class NudgesController {
  constructor(private readonly nudges: NudgesService) {}

  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  setPreference(@Req() req: AuthedRequest, @Body() body: { enabled: boolean }) {
    return this.nudges.setEnabled(req.user.userId, body.enabled);
  }
}

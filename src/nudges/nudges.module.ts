import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NudgesController } from './nudges.controller';
import { NudgesService } from './nudges.service';
import { NudgesRepository } from './nudges.repository';

@Module({
  imports: [AuthModule],
  controllers: [NudgesController],
  providers: [NudgesService, NudgesRepository],
})
export class NudgesModule {}

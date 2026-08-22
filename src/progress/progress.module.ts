import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressRepository } from './progress.repository';

@Module({
  imports: [AuthModule],
  controllers: [ProgressController],
  providers: [ProgressService, ProgressRepository],
})
export class ProgressModule {}

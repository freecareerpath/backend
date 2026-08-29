import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExplainController } from './explain.controller';
import { ExplainService } from './explain.service';
import { ExplainRepository } from './explain.repository';
import { OpenAiGrader } from './openai-grader';

@Module({
  imports: [AuthModule],
  controllers: [ExplainController],
  providers: [ExplainService, ExplainRepository, OpenAiGrader],
})
export class ExplainModule {}

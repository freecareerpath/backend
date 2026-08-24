import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { ProgressModule } from './progress/progress.module';
import { MilestonesModule } from './milestones/milestones.module';
import { NudgesModule } from './nudges/nudges.module';
import { CareerPathsModule } from './career-paths/career-paths.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DbModule,
    AuthModule,
    ProgressModule,
    MilestonesModule,
    NudgesModule,
    CareerPathsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

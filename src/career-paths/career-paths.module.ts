import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CareerPathsController } from './career-paths.controller';
import { AdminCareerPathsController } from './admin-career-paths.controller';
import { CareerPathsService } from './career-paths.service';
import { CareerPathsRepository } from './career-paths.repository';
import { CareerPathModulesRepository } from './career-path-modules.repository';
import { CareerPathNodesRepository } from './career-path-nodes.repository';
import { CareerPathResourcesRepository } from './career-path-resources.repository';

@Module({
  imports: [AuthModule],
  controllers: [CareerPathsController, AdminCareerPathsController],
  providers: [
    CareerPathsService,
    CareerPathsRepository,
    CareerPathModulesRepository,
    CareerPathNodesRepository,
    CareerPathResourcesRepository,
  ],
})
export class CareerPathsModule {}

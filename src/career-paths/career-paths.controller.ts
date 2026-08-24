import { Controller, Get, Param } from '@nestjs/common';
import { CareerPathsService } from './career-paths.service';

/** Public, unauthenticated read API — backs the homepage hero and /roadmaps pages. */
@Controller('career-paths')
export class CareerPathsController {
  constructor(private readonly careerPaths: CareerPathsService) {}

  @Get()
  list() {
    return this.careerPaths.listPublished();
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.careerPaths.getPublishedBySlug(slug);
  }

  @Get(':slug/nodes/:nodeSlug')
  getNode(@Param('slug') slug: string, @Param('nodeSlug') nodeSlug: string) {
    return this.careerPaths.getPublishedNode(slug, nodeSlug);
  }
}

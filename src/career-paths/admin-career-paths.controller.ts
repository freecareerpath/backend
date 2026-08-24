import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CareerPathsService } from './career-paths.service';

/**
 * Every route here requires both a valid session AND the admin role —
 * enforced entirely server-side (JwtAuthGuard populates `req.user`,
 * AdminGuard then checks `req.user.role`), so a normal USER manually
 * constructing these requests with a valid-but-non-admin session still gets
 * 401/403 regardless of what the admin frontend hides or disables.
 */
@Controller('admin/career-paths')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCareerPathsController {
  constructor(private readonly careerPaths: CareerPathsService) {}

  @Get()
  list() {
    return this.careerPaths.adminListAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.careerPaths.adminGetById(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.careerPaths.adminCreateCareerPath(body as never);
  }

  @Patch('reorder')
  reorder(@Body() body: { orderedIds: unknown }) {
    return this.careerPaths
      .adminReorderCareerPaths(body.orderedIds)
      .then(() => ({ ok: true }));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.careerPaths.adminUpdateCareerPath(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.careerPaths.adminDeleteCareerPath(id);
    return { ok: true };
  }

  // ---------- modules ----------

  @Post(':careerPathId/modules')
  createModule(
    @Param('careerPathId') careerPathId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminCreateModule(careerPathId, body as never);
  }

  @Patch('modules/reorder')
  reorderModules(@Body() body: { orderedIds: unknown }) {
    return this.careerPaths
      .adminReorderModules(body.orderedIds)
      .then(() => ({ ok: true }));
  }

  @Patch('modules/:moduleId')
  updateModule(
    @Param('moduleId') moduleId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminUpdateModule(moduleId, body);
  }

  @Delete('modules/:moduleId')
  async removeModule(@Param('moduleId') moduleId: string) {
    await this.careerPaths.adminDeleteModule(moduleId);
    return { ok: true };
  }

  // ---------- nodes ----------

  @Post('modules/:moduleId/nodes')
  createNode(
    @Param('moduleId') moduleId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminCreateNode(moduleId, body as never);
  }

  @Patch('nodes/reorder')
  reorderNodes(@Body() body: { orderedIds: unknown }) {
    return this.careerPaths
      .adminReorderNodes(body.orderedIds)
      .then(() => ({ ok: true }));
  }

  @Patch('nodes/:nodeId')
  updateNode(
    @Param('nodeId') nodeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminUpdateNode(nodeId, body);
  }

  @Delete('nodes/:nodeId')
  async removeNode(@Param('nodeId') nodeId: string) {
    await this.careerPaths.adminDeleteNode(nodeId);
    return { ok: true };
  }

  // ---------- resources ----------

  @Post('nodes/:nodeId/resources')
  createResource(
    @Param('nodeId') nodeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminCreateResource(nodeId, body as never);
  }

  @Patch('resources/:resourceId')
  updateResource(
    @Param('resourceId') resourceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.careerPaths.adminUpdateResource(resourceId, body);
  }

  @Delete('resources/:resourceId')
  async removeResource(@Param('resourceId') resourceId: string) {
    await this.careerPaths.adminDeleteResource(resourceId);
    return { ok: true };
  }
}

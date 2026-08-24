import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt.strategy';

/**
 * Must run *after* JwtAuthGuard (which populates `req.user`) — combine as
 * `@UseGuards(JwtAuthGuard, AdminGuard)`. Enforced entirely server-side: a
 * normal USER manually constructing the exact HTTP request still gets 403
 * here regardless of what the frontend renders or hides.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}

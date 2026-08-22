import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Minimal "authenticated internal endpoint" gate for reviewer accept/reject
 * actions (ADR-0004: acceptance is a manual reviewer action, not automated).
 * Deliberately not a full admin-role/user system — that's a real gap, not a
 * hidden one; see the v2 report for what a proper reviewer-role model would
 * need before this is used for anything beyond internal/manual review.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers['x-internal-token'];
    const expected = process.env.INTERNAL_REVIEW_TOKEN;

    if (!expected || token !== expected) {
      throw new UnauthorizedException(
        'Invalid or missing internal review token.',
      );
    }
    return true;
  }
}

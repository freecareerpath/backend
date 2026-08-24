import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/**
 * Minimal in-memory sliding-window limiter — no Redis/new dependency for a
 * single-process backend at this scale (ADR-0004 "avoid unnecessary
 * dependencies"). Keyed by IP + attempted email so one bad actor can't lock
 * out every user sharing a NAT'd IP, and a distributed attacker can't use a
 * single email to fan out across many IPs unnoticed by either axis alone.
 * Resets on process restart, which is an acceptable tradeoff for a login
 * brute-force guard (not a durable security boundary on its own — password
 * hashing + generic error messages are the primary defenses).
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const email = (req.body as { email?: string })?.email ?? 'unknown';
    const key = `${req.ip}:${email.toLowerCase()}`;
    const now = Date.now();

    const recent = (this.attempts.get(key) ?? []).filter(
      (t) => now - t < WINDOW_MS,
    );

    if (recent.length >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Please try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }
}

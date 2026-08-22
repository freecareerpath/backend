import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

function fromAccessTokenCookie(req: Request): string | null {
  return (req?.cookies?.['fcp_access_token'] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: fromAccessTokenCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: { sub: string }): Promise<{ userId: string }> {
    return { userId: payload.sub };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UsersRepository } from './users.repository';

function fromAccessTokenCookie(req: Request): string | null {
  return (req?.cookies?.['fcp_access_token'] as string | undefined) ?? null;
}

export type AuthenticatedUser = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersRepository) {
    super({
      jwtFromRequest: fromAccessTokenCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
    });
  }

  /**
   * Looks up the user's *current* role on every request rather than trusting
   * a role claim baked into the JWT at login time — a role change (or a
   * deleted account) takes effect immediately instead of only after the
   * short-lived access token expires. One extra indexed lookup per request
   * is an acceptable cost at this scale.
   */
  async validate(payload: { sub: string }): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginRateLimitGuard } from './login-rate-limit.guard';
import type { AuthenticatedUser } from './jwt.strategy';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS } from './tokens';

type Credentials = { email: string; password: string; rememberMe?: boolean };
type RegisterBody = Credentials & { name: string };

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() body: RegisterBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(
      body.email,
      body.password,
      body.name,
    );
    this.setCookies(res, tokens);
    return { userId: tokens.userId };
  }

  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  async login(
    @Body() body: Credentials,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(body.email, body.password);
    this.setCookies(res, tokens, body.rememberMe ?? true);
    return { userId: tokens.userId };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies?.['fcp_refresh_token'] as string) ?? '';
    const tokens = await this.auth.refresh(refreshToken);
    this.setCookies(res, tokens);
    return { userId: tokens.userId };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies?.['fcp_refresh_token'] as string) ?? '';
    await this.auth.logout(refreshToken);
    res.clearCookie('fcp_access_token', COOKIE_OPTS);
    res.clearCookie('fcp_refresh_token', COOKIE_OPTS);
    return { ok: true };
  }

  /**
   * `rememberMe` only affects whether the *refresh* cookie persists past
   * closing the browser (omitting `maxAge` makes it a session cookie) — the
   * server-side session record still expires after the normal 30 days
   * either way, so "not remembered" doesn't change how long the session is
   * revocable/valid server-side, only how long the browser retains it.
   */
  private setCookies(
    res: Response,
    tokens: AuthTokens,
    rememberMe = true,
  ): void {
    res.cookie('fcp_access_token', tokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
    res.cookie('fcp_refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      ...(rememberMe ? { maxAge: REFRESH_TOKEN_TTL_MS } : {}),
    });
  }
}

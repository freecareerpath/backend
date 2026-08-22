import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS } from './tokens';

type Credentials = { email: string; password: string };

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
    @Body() body: Credentials,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(body.email, body.password);
    this.setCookies(res, tokens);
    return { userId: tokens.userId };
  }

  @Post('login')
  async login(
    @Body() body: Credentials,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(body.email, body.password);
    this.setCookies(res, tokens);
    return { userId: tokens.userId };
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

  private setCookies(res: Response, tokens: AuthTokens): void {
    res.cookie('fcp_access_token', tokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
    res.cookie('fcp_refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }
}

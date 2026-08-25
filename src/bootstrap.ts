import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Shared between main.ts (persistent server: Docker/self-hosted) and
 * api/index.ts (Vercel serverless function) so both entry points boot the
 * exact same AppModule/middleware/CORS config — see docs/decisions/0008.
 *
 * FRONTEND_URLS (comma-separated) takes precedence over the single-origin
 * FRONTEND_URL so a Vercel Preview backend can allow its own Preview
 * frontend origin(s) alongside production, without breaking the existing
 * single-origin self-hosted deployment that only sets FRONTEND_URL.
 */
export function resolveAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? 'http://localhost:3100';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function createNestApp(
  adapter?: AbstractHttpAdapter,
): Promise<INestApplication> {
  const app = adapter
    ? await NestFactory.create(AppModule, adapter)
    : await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Every response from this API is per-request/per-user (auth, progress,
  // admin CRUD) and must never be shared-cached. Without an explicit
  // Cache-Control, Vercel's platform default of `public, max-age=0,
  // must-revalidate` marks responses as edge-cacheable — and Vercel's CDN
  // then strips `Set-Cookie` from any response it treats as cacheable,
  // silently dropping the auth cookies that register/login/refresh set
  // (verified: even `/api/health`, which sets no cookies, got the same
  // `public` default). `no-store` opts every response out of that.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Every real endpoint lives under /api — `/` itself is excluded so it
  // stays available as a bare health check independent of that routing
  // split (docs/architecture.md "Deployment topology").
  app.setGlobalPrefix('api', { exclude: ['/'] });

  const allowedOrigins = resolveAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  return app;
}

// Must run before any other import touches process.env (e.g. DbModule's
// createPool(), which reads DATABASE_URL at provider-factory time) — no
// env-loading mechanism existed before this, since no real database had
// ever been connected to.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Every real endpoint lives under /api — this is what lets Nginx route
  // `/api/*` to this service and everything else to the frontend with a
  // single un-rewritten proxy_pass (docs/architecture.md "Deployment
  // topology"). `/` itself is excluded so it stays available as a bare
  // container health check independent of that routing split.
  app.setGlobalPrefix('api', { exclude: ['/'] });
  // Cookie-based auth requires an explicit origin (not '*') with credentials
  // enabled — the browser rejects `Set-Cookie` on a wildcard-origin response.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3100',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

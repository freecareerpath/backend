// Must run before any other import touches process.env (e.g. DbModule's
// createPool(), which reads DATABASE_URL at provider-factory time) — no
// env-loading mechanism existed before this, since no real database had
// ever been connected to.
import 'dotenv/config';
import { createNestApp } from './bootstrap';

/**
 * Persistent-server entry point (Docker/self-hosted — docs/decisions/0008).
 * The Vercel serverless deployment uses api/index.ts instead, which shares
 * this same createNestApp() bootstrap rather than duplicating it.
 */
async function bootstrap() {
  const app = await createNestApp();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

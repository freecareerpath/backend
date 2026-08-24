import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'http';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { createNestApp } from '../src/bootstrap';

/**
 * Vercel serverless entry point. Bootstraps the same NestJS AppModule as
 * main.ts, on an Express instance Vercel's Node runtime can invoke directly
 * as a request handler. Bootstrapped once per warm Lambda instance (not per
 * request) — `ready` is module-scoped, so a warm invocation reuses the
 * already-initialized app (and its single pg.Pool) instead of re-creating
 * it, which is what keeps this safe against Supabase connection exhaustion
 * under concurrent serverless invocations (see backend/vercel.json and
 * docs/decisions/0008-decentralized-deployment-tooling.md).
 */
const server = express();
let ready: Promise<void> | null = null;

async function initialize(): Promise<void> {
  const app = await createNestApp(new ExpressAdapter(server));
  await app.init();
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!ready) ready = initialize();
  await ready;
  server(req, res);
}

/**
 * Local/containerised entrypoint. On Vercel this file is not used: api/index.ts
 * exports the same app as a serverless function instead.
 */
import { createApp } from './app';
import { env } from './lib/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (${env.provider})`);
  console.log(`  GET /api/search?keyword=engineer&jobTitle=manager&skill=leadership`);
  console.log(`  GET /api/stats`);
});

const shutdown = (signal: string): void => {
  console.log(`\n${signal} received, closing`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;

/**
 * Runtime configuration.
 *
 * The .env file is parsed here (no dependency, no side effects elsewhere) so that
 * DATABASE_URL is guaranteed to be present before Prisma Client is constructed —
 * locally it comes from server/.env, on Vercel from the project's environment
 * variables, and the code path is identical.
 */
import fs from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env.local', '.env'];

function loadEnvFiles(): void {
  // dist/lib -> dist -> server, and src/lib -> src -> server: both resolve here.
  const roots = [process.cwd(), path.resolve(__dirname, '..', '..')];
  for (const root of roots) {
    for (const name of ENV_FILES) {
      const file = path.join(root, name);
      if (!fs.existsSync(file)) continue;
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (!match || match[1] === undefined) continue;
        const key = match[1];
        if (process.env[key] !== undefined) continue;
        process.env[key] = (match[2] ?? '').replace(/^(["'])([\s\S]*)\1$/, '$2');
      }
    }
  }
}

loadEnvFiles();

const MISSING_DATABASE_URL = [
  'DATABASE_URL is not set.',
  '  local:  copy server/.env.example to server/.env (file:./dev.db)',
  '  vercel: add it in Project Settings > Environment Variables (Neon pooled URL)',
].join('\n');

export type DatabaseProvider = 'sqlite' | 'postgresql';

function providerFor(url: string): DatabaseProvider {
  if (url.startsWith('file:')) return 'sqlite';
  if (/^(postgres|postgresql|prisma):/.test(url)) return 'postgresql';
  throw new Error(`Unsupported DATABASE_URL scheme: use file:./dev.db or a postgres:// URL`);
}

const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
if (databaseUrl === '') throw new Error(MISSING_DATABASE_URL);

const origins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value !== '');

export const env = {
  databaseUrl,
  provider: providerFor(databaseUrl),
  port: Number.parseInt(process.env.PORT ?? '5000', 10) || 5000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Empty means "reflect any origin", which is what a public read-only API needs. */
  corsOrigins: origins,
  isProduction: process.env.NODE_ENV === 'production',
  onVercel: !!process.env.VERCEL,
} as const;

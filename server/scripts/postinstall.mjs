/**
 * Runs after `npm install` in this package.
 *
 * Locally it only makes sure the generated Prisma client exists.
 * On Vercel it also provisions the production database, which is what makes
 * "git push + set DATABASE_URL + connect Neon" a complete deployment:
 *   1. write schema.generated.prisma with provider=postgresql
 *   2. prisma generate
 *   3. prisma db push   (create tables if they are missing)
 *   4. seed             (only when the Profile table is empty)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { generateSchema } from './prisma-schema.mjs';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const serverDir = path.join(here, '..');
const onVercel = !!process.env.VERCEL;

const run = (cmd, args) => {
  console.log(`[postinstall] ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: serverDir, stdio: 'inherit', shell: process.platform === 'win32' });
};

if (onVercel && !process.env.DATABASE_URL) {
  console.error(
    '\n[postinstall] DATABASE_URL is not set for this Vercel deployment.\n' +
      '              Add it in Project Settings → Environment Variables\n' +
      '              (Neon: Dashboard → Connection string → pooled connection).\n',
  );
  process.exit(1);
}

const { provider } = generateSchema();
console.log(`[postinstall] prisma provider: ${provider}${onVercel ? ' (vercel build)' : ''}`);

run('prisma', ['generate']);

if (!onVercel) {
  console.log('[postinstall] local install: run "npm run db:push && npm run seed" to create and fill dev.db');
  process.exit(0);
}

run('prisma', ['db', 'push', '--skip-generate', '--accept-data-loss']);

const dataset = fs.existsSync(path.join(serverDir, '..', 'data'))
  ? fs.readdirSync(path.join(serverDir, '..', 'data')).find((f) => /300 user linkedin/i.test(f))
  : undefined;

if (!dataset) {
  console.warn('[postinstall] no dataset found in ../data — skipping seed');
  process.exit(0);
}

// The seed script is a no-op when the database already holds profiles.
run('tsx', ['prisma/seed.ts']);

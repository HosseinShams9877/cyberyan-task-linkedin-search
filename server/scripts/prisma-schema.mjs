/**
 * Writes prisma/schema.generated.prisma from prisma/schema.prisma, choosing the
 * datasource provider from DATABASE_URL.
 *
 * Prisma does not allow env() in `datasource.provider`, but the whole point of
 * this project is "SQLite locally, Neon Postgres on Vercel, no manual steps".
 * Generating the schema right before every prisma command keeps a single source
 * of truth (schema.prisma) and still gives Prisma a static provider.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const prismaDir = path.join(here, '..', 'prisma');
const source = path.join(prismaDir, 'schema.prisma');
const target = path.join(prismaDir, 'schema.generated.prisma');

/** Load server/.env without adding a dependency (Prisma reads it too). */
function loadEnvFile() {
  const envPath = path.join(here, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["'](.*)["']$/, '$1');
  }
}

export function providerFor(databaseUrl) {
  const value = (databaseUrl ?? '').trim();
  if (!value || value.startsWith('file:')) return 'sqlite';
  if (/^(postgres|postgresql):\/\//.test(value)) return 'postgresql';
  if (/^prisma(\+postgres)?:\/\//.test(value)) return 'postgresql';
  throw new Error(
    `Unsupported DATABASE_URL "${value.slice(0, 24)}…". Use file:./dev.db (SQLite) or a postgres:// URL.`,
  );
}

export function generateSchema() {
  loadEnvFile();
  const provider = providerFor(process.env.DATABASE_URL);
  const raw = fs.readFileSync(source, 'utf8');
  const out = raw.replace(
    /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*)"[^"]+"/,
    `$1"${provider}"`,
  );
  if (out === raw && !raw.includes(`provider = "${provider}"`)) {
    throw new Error('Could not rewrite the datasource provider in prisma/schema.prisma');
  }
  const banner = `// AUTO-GENERATED from schema.prisma — do not edit. Run "npm run prisma:schema".\n`;
  const next = banner + out;
  const prev = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (prev !== next) fs.writeFileSync(target, next);
  return { provider, target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url))) {
  const { provider } = generateSchema();
  console.log(`prisma schema provider: ${provider}`);
}

/**
 * Copies the generated Prisma Client (and its query engine) next to the compiled
 * output, because tsc only emits .ts files: dist/lib/prisma.js requires
 * ../generated/prisma at runtime, which must therefore exist inside dist/.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const from = path.join(here, '..', 'src', 'generated');
const to = path.join(here, '..', 'dist', 'generated');

if (!fs.existsSync(from)) {
  console.error('[copy-generated] src/generated is missing - run "npm run generate" first');
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`[copy-generated] ${path.relative(process.cwd(), to)}`);

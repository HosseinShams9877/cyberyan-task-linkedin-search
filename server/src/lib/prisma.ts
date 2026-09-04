/**
 * Prisma Client singleton.
 *
 * Serverless functions (and `tsx watch`) re-evaluate modules often; caching the
 * client on the global object keeps one connection pool per process instead of
 * one per invocation, which is what Neon's connection limit requires.
 */
import { PrismaClient } from '../generated/prisma';
import { env } from './env';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Explicit, so the client never depends on ambient .env loading.
    datasources: { db: { url: env.databaseUrl } },
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) globalForPrisma.prisma = prisma;

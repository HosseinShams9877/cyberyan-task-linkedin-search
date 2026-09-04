/**
 * API routes.
 *
 * Everything is validated with zod before it reaches Prisma: unknown parameters
 * are rejected, numbers are coerced and bounded, and the page size is capped so a
 * crafted request cannot ask for the whole table.
 */
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, flattenQuery, notFound } from '../lib/http';
import { getFilters, getProfile, searchProfiles, type SearchQuery } from '../services/search';
import { getStats } from '../services/stats';

const text = (max: number) => z.string().min(1).max(max);

const searchSchema = z
  .object({
    keyword: text(120).optional(),
    jobTitle: text(120).optional(),
    skill: text(80).optional(),
    industry: text(80).optional(),
    country: text(80).optional(),
    company: text(120).optional(),
    role: text(60).optional(),
    minConnections: z.coerce.number().int().min(0).max(100000).optional(),
    minYears: z.coerce.number().int().min(0).max(70).optional(),
    hasEmail: z.enum(['true', 'false']).optional(),
    sort: z.enum(['relevance', 'name', 'connections', 'experience']).default('relevance'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const idSchema = z.coerce.number().int().positive();

export const api = Router();

api.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

api.get('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(flattenQuery(req.query));
  if (!parsed.success) {
    throw badRequest(
      'Invalid search parameters',
      parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }
  const { hasEmail, ...rest } = parsed.data;
  const query: SearchQuery = { ...rest, ...(hasEmail === undefined ? {} : { hasEmail: hasEmail === 'true' }) };
  res.json(await searchProfiles(query));
});

api.get('/filters', async (_req, res) => {
  res.json(await getFilters());
});

api.get('/stats', async (_req, res) => {
  res.json(await getStats());
});

api.get('/profiles/:id', async (req, res) => {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) throw badRequest('Profile id must be a positive integer');
  const profile = await getProfile(parsed.data);
  if (!profile) throw notFound(`No profile with id ${parsed.data}`);
  res.json(profile);
});

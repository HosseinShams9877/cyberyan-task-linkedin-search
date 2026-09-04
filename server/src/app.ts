/**
 * Express application.
 *
 * Exported as a plain app (no listen) so the same instance serves both the local
 * dev server (src/index.ts) and the Vercel serverless function (api/index.ts).
 */
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { env } from './lib/env';
import { HttpError } from './lib/http';
import { api } from './routes';
import type { ApiError } from './types/api';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    cors({
      // Read-only public API: any origin may call it unless CORS_ORIGIN narrows it.
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      methods: ['GET', 'OPTIONS'],
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: '16kb' }));

  app.get('/api', (_req, res) => {
    res.json({
      name: 'LinkedIn Dataset Search API',
      endpoints: ['/api/health', '/api/search', '/api/filters', '/api/stats', '/api/profiles/:id'],
    });
  });
  app.use('/api', api);

  const missing: RequestHandler = (req, res) => {
    const body: ApiError = { error: 'not_found', message: `No route for ${req.method} ${req.path}` };
    res.status(404).json(body);
  };
  app.use(missing);

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
      const body: ApiError = { error: error.code, message: error.message };
      if (error.details !== undefined) body.details = error.details;
      res.status(error.status).json(body);
      return;
    }
    // Unexpected: log the real reason, return a generic message.
    console.error('[api] unhandled error', error);
    const body: ApiError = {
      error: 'internal_error',
      message: env.isProduction ? 'Something went wrong' : String((error as Error)?.message ?? error),
    };
    res.status(500).json(body);
  };
  app.use(onError);

  return app;
}

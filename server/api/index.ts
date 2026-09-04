/**
 * Vercel serverless entrypoint.
 *
 * vercel.json routes every /api/* request here and @vercel/node invokes the
 * default export as (req, res) — an Express app is exactly that, so the local
 * server and the deployed function run identical code.
 */
import { createApp } from '../src/app';

export default createApp();

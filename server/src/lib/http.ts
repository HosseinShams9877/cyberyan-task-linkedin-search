/** HTTP error helpers shared by the routes and the error middleware. */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (message: string): HttpError => new HttpError(404, 'not_found', message);
export const badRequest = (message: string, details?: unknown): HttpError =>
  new HttpError(400, 'bad_request', message, details);

/**
 * Express gives query values as string | string[] | undefined (repeated keys), and
 * a cleared dropdown sends an empty string. Flatten to "last value wins" and drop
 * the empties so every schema can just use optional strings.
 */
export function flattenQuery(query: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof query !== 'object' || query === null) return out;
  for (const [key, raw] of Object.entries(query as Record<string, unknown>)) {
    const value = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed === '') continue;
    out[key] = trimmed;
  }
  return out;
}

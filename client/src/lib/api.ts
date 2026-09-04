/**
 * Tiny fetch wrapper for the API.
 *
 * VITE_API_URL points at the backend: in production it is empty, so requests go to
 * /api/* on the same Vercel domain; in dev it defaults to the local Express port.
 */
import type { FiltersResponse, ProfileDetail, SearchResponse, StatsResponse } from './api-types';

const configured = (import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE = (configured || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ErrorBody {
  message?: unknown;
  error?: unknown;
  details?: unknown;
}

async function request<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const query = params && [...params.keys()].length > 0 ? `?${params.toString()}` : '';
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}${query}`, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError(0, `Cannot reach the API at ${API_BASE || window.location.origin}. Is the server running?`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body as ErrorBody | null;
    const message = typeof details?.message === 'string' ? details.message : `Request failed (${response.status})`;
    throw new ApiRequestError(response.status, message, details?.details);
  }
  return body as T;
}

/** Only non-empty values are sent, so the server never sees blank parameters. */
export function toParams(values: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  return params;
}

export const api = {
  search: (params: URLSearchParams, signal?: AbortSignal) =>
    request<SearchResponse>('/api/search', params, signal),
  filters: (signal?: AbortSignal) => request<FiltersResponse>('/api/filters', undefined, signal),
  stats: (signal?: AbortSignal) => request<StatsResponse>('/api/stats', undefined, signal),
  profile: (id: number, signal?: AbortSignal) =>
    request<ProfileDetail>(`/api/profiles/${id}`, undefined, signal),
};

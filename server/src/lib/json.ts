/** Helpers for the JSON-string columns (kept portable across SQLite/Postgres). */

export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const parseStringArray = (value: string | null | undefined): string[] =>
  parseJsonArray<unknown>(value).filter((item): item is string => typeof item === 'string');

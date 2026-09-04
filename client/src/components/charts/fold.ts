import type { Bucket } from '../../lib/api-types';

/**
 * Fold everything past `keep` into a single trailing bucket.
 *
 * Categorical hues stop at a fixed count, so a tail is folded rather than given
 * generated colors. Ranks are stable because the API returns buckets sorted by
 * count, so a slice keeps its hue between reloads.
 */
export function foldTail(rows: Bucket[], keep: number, otherLabel = 'other'): Bucket[] {
  if (rows.length <= keep) return rows;
  const head = rows.slice(0, keep);
  const tail = rows.slice(keep).reduce((sum, row) => sum + row.count, 0);
  return tail > 0 ? [...head, { label: otherLabel, count: tail }] : head;
}

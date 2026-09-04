import { CHART } from './theme';

interface Entry {
  value?: number | string;
  color?: string;
  payload?: { label?: string; full?: string; share?: number };
}

/**
 * One readout for bar, column and slice hovers. The value leads and the category
 * follows, because the reader already knows which mark they are pointing at.
 *
 * Labels arrive from the API, so they go in as React text children (escaped),
 * never as markup.
 */
export default function ChartTooltip({
  active,
  payload,
  unit = 'profiles',
  format = (value: string) => value,
}: {
  active?: boolean;
  payload?: Entry[];
  unit?: string;
  format?: (label: string) => string;
}) {
  const entry = active ? payload?.[0] : undefined;
  if (!entry) return null;

  const row = entry.payload ?? {};
  const count = typeof entry.value === 'number' ? entry.value.toLocaleString('en-US') : String(entry.value ?? '');

  return (
    <div className="rounded-lg border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-3 rounded-full"
          style={{ backgroundColor: entry.color ?? CHART.series }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-slate-50">{count}</span>
        <span className="text-muted">{unit}</span>
      </p>
      <p className="mt-0.5 max-w-56 text-slate-300">{format(row.full ?? row.label ?? '')}</p>
      {row.share !== undefined ? (
        <p className="text-muted">{`${(row.share * 100).toFixed(1)}% of the total`}</p>
      ) : null}
    </div>
  );
}

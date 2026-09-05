import { usePrefs } from '../../i18n';
import { formatNumber, formatPercent } from '../../lib/format';
import { chartTheme } from './theme';

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
  unit,
  format = (value: string) => value,
}: {
  active?: boolean;
  payload?: Entry[];
  unit?: string;
  format?: (label: string) => string;
}) {
  // Recharts renders the tooltip outside the chart's own React subtree in some
  // layouts, so it reads the preferences itself rather than taking them as props.
  const { t, theme, dir } = usePrefs();
  const entry = active ? payload?.[0] : undefined;
  if (!entry) return null;

  const row = entry.payload ?? {};
  const count = typeof entry.value === 'number' ? formatNumber(entry.value) : String(entry.value ?? '');

  return (
    // The plot is force-LTR so Recharts' coordinates stay put; the tooltip is prose,
    // so it takes the document direction back.
    <div
      dir={dir}
      className="rounded-lg border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
    >
      <p className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-3 rounded-full"
          style={{ backgroundColor: entry.color ?? chartTheme(theme).series }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-ink tabular-nums">{count}</span>
        <span className="text-muted">{unit ?? t('unit.profiles')}</span>
      </p>
      <p className="mt-0.5 max-w-56 text-ink-body">{format(row.full ?? row.label ?? '')}</p>
      {row.share !== undefined ? (
        <p className="text-muted">{t('chart.shareOfTotal', { share: formatPercent(row.share, 1, 1) })}</p>
      ) : null}
    </div>
  );
}

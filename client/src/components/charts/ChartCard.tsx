import { useId, useState } from 'react';
import { useT } from '../../i18n';
import type { Bucket } from '../../lib/api-types';
import { formatNumber, formatPercent } from '../../lib/format';

/**
 * Frame shared by every chart: title, subtitle and a table view of the same rows.
 *
 * The table is not a fallback, it is the WCAG-clean twin - so no value is only
 * reachable by hovering a mark. It also carries the relief the light palette needs:
 * three of the five light slots sit below 3:1 on white, which is legal only where a
 * reader can get the same numbers without color.
 */
export default function ChartCard({
  title,
  subtitle,
  rows,
  unit,
  format,
  total,
  className = '',
  children,
}: {
  title: string;
  subtitle: string;
  rows: Bucket[];
  unit: string;
  format: (label: string) => string;
  /**
   * Denominator for the share column. Defaults to the sum of the rows, which is
   * right when they partition something; pass the profile count where a profile
   * can appear in more than one row (skills) or where the rows are only a top N.
   */
  total?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const panelId = useId();
  const whole = total ?? rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className={`card flex flex-col p-4 ${className}`} aria-labelledby={`${panelId}-title`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id={`${panelId}-title`} className="font-semibold text-ink">
            {title}
          </h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 px-2 py-1 text-xs"
          aria-pressed={view === 'table'}
          aria-controls={panelId}
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
        >
          {view === 'chart' ? t('chart.toTable') : t('chart.toChart')}
        </button>
      </div>

      <div id={panelId} className="min-w-0 flex-1">
        {view === 'chart' ? (
          children
        ) : (
          // No scroll container: a table that shows nine of fifteen rows looks
          // complete, so it lists every row and the card grows instead.
          <table className="w-full text-start text-sm">
            <caption className="sr-only">{t('chart.tableCaption', { title, subtitle })}</caption>
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="py-1.5 pe-3 text-start font-medium">
                  {unit}
                </th>
                <th scope="col" className="py-1.5 pe-3 text-end font-medium">
                  {t('chart.colProfiles')}
                </th>
                <th scope="col" className="py-1.5 text-end font-medium">
                  {t('chart.colShare')}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-line/50">
                  <td className="py-1.5 pe-3 text-ink-body">{format(row.label)}</td>
                  <td className="py-1.5 pe-3 text-end text-ink-body">{formatNumber(row.count)}</td>
                  <td className="py-1.5 text-end text-muted">{formatPercent(row.count, whole, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

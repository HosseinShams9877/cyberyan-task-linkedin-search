import { useId, useState } from 'react';
import type { Bucket } from '../../lib/api-types';

/**
 * Frame shared by every chart: title, subtitle and a table view of the same rows.
 *
 * The table is not a fallback, it is the WCAG-clean twin - so no value is only
 * reachable by hovering a mark.
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
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const panelId = useId();
  const whole = total ?? rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className={`card flex flex-col p-4 ${className}`} aria-labelledby={`${panelId}-title`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id={`${panelId}-title`} className="font-semibold text-slate-100">
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
          {view === 'chart' ? 'Table' : 'Chart'}
        </button>
      </div>

      <div id={panelId} className="min-w-0 flex-1">
        {view === 'chart' ? (
          children
        ) : (
          // No scroll container: a table that shows nine of fifteen rows looks
          // complete, so it lists every row and the card grows instead.
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{`${title} - ${subtitle}`}</caption>
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  {unit}
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  Profiles
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-line/50">
                  <td className="py-1.5 pr-3 text-slate-200">{format(row.label)}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-200">
                    {row.count.toLocaleString('en-US')}
                  </td>
                  <td className="py-1.5 text-right text-muted">
                    {whole === 0 ? '-' : `${((row.count / whole) * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

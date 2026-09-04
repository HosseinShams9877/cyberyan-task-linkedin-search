import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import ChartTooltip from './ChartTooltip';
import { CHART } from './theme';

/**
 * Part-to-whole across a handful of named categories - the one place in this
 * dashboard where the categories themselves are the subject, so the palette is
 * categorical and assigned in fixed order.
 *
 * Slices are separated by a 2px stroke in the surface color: the gap does the
 * separating, so no slice needs an outline of its own.
 */
export default function BucketDonut({
  rows,
  format,
  unit = 'profiles',
}: {
  rows: Bucket[];
  format: (label: string) => string;
  unit?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const data = rows.map((row, index) => ({
    label: format(row.label),
    full: format(row.label),
    count: row.count,
    share: total === 0 ? 0 : row.count / total,
    color: CHART.categorical[index % CHART.categorical.length],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={196}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip content={<ChartTooltip unit={unit} />} animationDuration={120} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            stroke={CHART.surface}
            strokeWidth={2}
            isAnimationActive={false}
            activeShape={{ fillOpacity: 0.82 }}
          >
            {data.map((slice) => (
              <Cell key={slice.label} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Identity never rests on hue alone: the legend names every slice and gives its count. */}
      <ul className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-slate-200">{slice.label}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {slice.count.toLocaleString('en-US')}
              <span className="ml-1 text-muted/70">{`${(slice.share * 100).toFixed(0)}%`}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import { formatNumber, formatPercent } from '../../lib/format';
import ChartTooltip from './ChartTooltip';
import { useChart } from './theme';

/**
 * Part-to-whole across a handful of named categories - the one place in this
 * dashboard where the categories themselves are the subject, so the palette is
 * categorical and assigned in fixed order.
 *
 * Slices are separated by a 2px stroke in the surface color: the gap does the
 * separating, so no slice needs an outline of its own. The stroke follows the theme,
 * or the ring would show dark seams on a white card.
 */
export default function BucketDonut({
  rows,
  format,
  unit,
}: {
  rows: Bucket[];
  format: (label: string) => string;
  unit?: string;
}) {
  const { chart, rtl } = useChart();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const data = rows.map((row, index) => ({
    label: format(row.label),
    full: format(row.label),
    count: row.count,
    share: total === 0 ? 0 : row.count / total,
    color: chart.categorical[index % chart.categorical.length],
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
            // The ring is read outward from twelve o'clock, so in Persian it winds
            // anticlockwise: the largest slice still lands where the eye starts.
            startAngle={90}
            endAngle={rtl ? 450 : -270}
            stroke={chart.surface}
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
            <span dir="auto" className="min-w-0 flex-1 truncate text-ink-body rtl:text-right">{slice.label}</span>
            {/*
              A dot between the two numbers, not just a gap: set in Persian digits,
              "50 30%" reads as one four-digit number, and the dot is the separator the
              results line and the chart subtitles already use.
            */}
            <span className="shrink-0 text-muted tabular-nums">
              {formatNumber(slice.count)}
              <span aria-hidden="true" className="mx-1 text-muted/50">
                &middot;
              </span>
              <span className="text-muted/70">{formatPercent(slice.share, 1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

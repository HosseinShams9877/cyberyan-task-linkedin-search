import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import { formatNumber } from '../../lib/format';
import ChartTooltip from './ChartTooltip';
import { BAR_SIZE, useChart } from './theme';

/**
 * Columns for an ordered scale with short labels. Only the tallest column is
 * direct-labelled - a number on every cap goes unread - and the y-axis ticks carry
 * the rest.
 *
 * In Persian the categories run right to left, which is the reading order of the
 * ordered scale, and the value axis moves to the right edge.
 */
export default function BucketColumns({
  rows,
  unit,
  height = 220,
  total,
}: {
  rows: Bucket[];
  unit?: string;
  height?: number;
  /** Share denominator; defaults to the sum of the rows. Matches ChartCard's. */
  total?: number;
}) {
  const { chart, rtl, axisTick } = useChart();
  const whole = total ?? rows.reduce((sum, row) => sum + row.count, 0);
  const peak = Math.max(0, ...rows.map((row) => row.count));
  const data = rows.map((row) => ({
    label: row.label,
    full: row.label,
    count: row.count,
    share: whole === 0 ? 0 : row.count / whole,
    peak: row.count === peak ? row.count : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={rtl ? { top: 18, right: -18, bottom: 4, left: 4 } : { top: 18, right: 4, bottom: 4, left: -18 }}
      >
        <CartesianGrid vertical={false} stroke={chart.grid} strokeWidth={1} />
        <XAxis
          dataKey="label"
          reversed={rtl}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chart.grid }}
          interval={0}
        />
        <YAxis
          orientation={rtl ? 'right' : 'left'}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: chart.cursor }} animationDuration={120} />
        <Bar
          dataKey="count"
          fill={chart.series}
          barSize={BAR_SIZE}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 0.82 }}
        >
          <LabelList
            dataKey="peak"
            position="top"
            offset={6}
            fill={chart.inkMuted}
            fontSize={11}
            formatter={(value: unknown) => (typeof value === 'number' ? formatNumber(value) : '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

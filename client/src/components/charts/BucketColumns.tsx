import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import ChartTooltip from './ChartTooltip';
import { AXIS_TICK, BAR_SIZE, CHART } from './theme';

/**
 * Columns for an ordered scale with short labels. Only the tallest column is
 * direct-labelled - a number on every cap goes unread - and the y-axis ticks carry
 * the rest.
 */
export default function BucketColumns({
  rows,
  unit = 'profiles',
  height = 220,
  total,
}: {
  rows: Bucket[];
  unit?: string;
  height?: number;
  /** Share denominator; defaults to the sum of the rows. Matches ChartCard's. */
  total?: number;
}) {
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
      <BarChart data={data} margin={{ top: 18, right: 4, bottom: 4, left: -18 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => value.toLocaleString('en-US')}
        />
        <Tooltip
          content={<ChartTooltip unit={unit} />}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          animationDuration={120}
        />
        <Bar
          dataKey="count"
          fill={CHART.series}
          barSize={BAR_SIZE}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 0.82 }}
        >
          <LabelList
            dataKey="peak"
            position="top"
            offset={6}
            fill={CHART.inkMuted}
            fontSize={11}
            formatter={(value: unknown) => (typeof value === 'number' ? value.toLocaleString('en-US') : '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

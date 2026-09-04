import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import ChartTooltip from './ChartTooltip';
import { AXIS_TICK, BAR_SIZE, CHART } from './theme';

const ROW_HEIGHT = 26;
/** Rough advance width of the 12px UI sans, used to fit a tick on one line. */
const CHAR_WIDTH = 6.4;

interface Tick {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

/**
 * Recharts wraps a long tick onto a second line, which collides with the next row,
 * so the category axis draws its own single-line text instead.
 */
function CategoryTick({ x = 0, y = 0, payload }: Tick) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={AXIS_TICK.fill} fontSize={AXIS_TICK.fontSize}>
      {payload?.value ?? ''}
    </text>
  );
}

/**
 * Horizontal bars for magnitude across named categories: one hue for every bar,
 * because the length already carries the value and a second encoding would only
 * repeat it. Long category names read better down the left edge than under an axis.
 *
 * Every bar is direct-labelled, so the chart needs no gridlines behind it.
 */
export default function BucketBars({
  rows,
  format,
  unit = 'profiles',
  labelWidth = 150,
  total,
}: {
  rows: Bucket[];
  format: (label: string) => string;
  unit?: string;
  labelWidth?: number;
  /** Share denominator; defaults to the sum of the rows. Matches ChartCard's. */
  total?: number;
}) {
  const whole = total ?? rows.reduce((sum, row) => sum + row.count, 0);
  const fit = Math.max(8, Math.floor((labelWidth - 10) / CHAR_WIDTH));
  const data = rows.map((row) => {
    const full = format(row.label);
    return {
      label: full.length > fit ? `${full.slice(0, fit - 1).trimEnd()}…` : full,
      full,
      count: row.count,
      share: whole === 0 ? 0 : row.count / whole,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={<CategoryTick />}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          interval={0}
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
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 0.82 }}
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            fill={CHART.inkMuted}
            fontSize={11}
            formatter={(value: unknown) => (typeof value === 'number' ? value.toLocaleString('en-US') : '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../../lib/api-types';
import { formatNumber } from '../../lib/format';
import ChartTooltip from './ChartTooltip';
import { BAR_SIZE, useChart } from './theme';

const ROW_HEIGHT = 26;
/** Rough advance width of the 12px UI sans, used to fit a tick on one line. */
const CHAR_WIDTH = 6.4;

interface Tick {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

/**
 * Horizontal bars for magnitude across named categories: one hue for every bar,
 * because the length already carries the value and a second encoding would only
 * repeat it. Long category names read better down the label edge than under an axis.
 *
 * Every bar is direct-labelled, so the chart needs no gridlines behind it.
 *
 * In Persian the whole plot mirrors: bars grow leftwards from a right-hand baseline,
 * the labels sit on the right and the values on the left. Recharts has no RTL mode -
 * it positions marks from an axis domain - so the mirroring is done by reversing the
 * value axis and swapping the two axes' orientations, which moves the marks
 * themselves rather than just their text.
 */
export default function BucketBars({
  rows,
  format,
  unit,
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
  const { chart, rtl, axisTick } = useChart();
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

  /**
   * Recharts wraps a long tick onto a second line, which collides with the next row,
   * so the category axis draws its own single-line text - anchored at the edge the
   * bars grow away from.
   *
   * The anchor is geometric, not linguistic: the wrapper is pinned to `direction: ltr`
   * so that `start` means the left edge in both languages, and the mirroring comes
   * from which edge the axis itself sits on. Setting `direction: rtl` here instead
   * would flip the anchor a second time and lay the labels back over the bars.
   */
  const CategoryTick = ({ x = 0, y = 0, payload }: Tick) => (
    <text x={x} y={y} dy={4} textAnchor={rtl ? 'start' : 'end'} fill={axisTick.fill} fontSize={axisTick.fontSize}>
      {payload?.value ?? ''}
    </text>
  );

  return (
    <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 20}>
      <BarChart
        data={data}
        layout="vertical"
        margin={rtl ? { top: 4, right: 0, bottom: 4, left: 44 } : { top: 4, right: 44, bottom: 4, left: 0 }}
      >
        <XAxis type="number" hide reversed={rtl} />
        <YAxis
          type="category"
          dataKey="label"
          orientation={rtl ? 'right' : 'left'}
          width={labelWidth}
          tick={<CategoryTick />}
          tickLine={false}
          axisLine={{ stroke: chart.grid }}
          interval={0}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: chart.cursor }} animationDuration={120} />
        <Bar
          dataKey="count"
          fill={chart.series}
          barSize={BAR_SIZE}
          radius={rtl ? [4, 0, 0, 4] : [0, 4, 4, 0]}
          isAnimationActive={false}
          activeBar={{ fillOpacity: 0.82 }}
        >
          <LabelList
            dataKey="count"
            /*
             * A reversed value axis swaps what Recharts means by `left` and `right`
             * here - both are read in value space, not screen space - so `right` is
             * the growing end of the bar in either direction, which is where the
             * number belongs.
             */
            position="right"
            offset={8}
            fill={chart.inkMuted}
            fontSize={11}
            formatter={(value: unknown) => (typeof value === 'number' ? formatNumber(value) : '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

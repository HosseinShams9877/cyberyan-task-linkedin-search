import { usePrefs, type Theme } from '../../i18n';

/**
 * Recharts paints SVG attributes, which cannot read a CSS custom property that is
 * redefined per theme, so the chart colors are duplicated here as concrete hex and
 * selected by the active theme.
 *
 * Both sets are *selected*, not derived: each is the reference palette's own steps
 * for its own surface, validated against that surface. Flipping one set's lightness
 * would put marks outside the band for the surface they actually render on.
 *
 * Validated with the dataviz validator, adjacent pairlist (bars, columns, a donut
 * ring - never a scatter, so all-pairs does not apply):
 *
 *   dark  (surface #181e27): worst adjacent CVD dE 8.4, normal-vision dE 19.3,
 *         all five >= 3:1 contrast, including the wrap pair that closes the ring.
 *   light (surface #ffffff): worst adjacent CVD dE 9.1, normal-vision dE 19.6.
 *         Three slots (green, yellow, pink) fall below 3:1 on white - the
 *         documented relief applies and is already in place: every bar is
 *         direct-labelled, the donut has a naming legend with counts, and every
 *         chart carries a table twin.
 */
interface ChartTheme {
  /** Slice stroke: the gap between marks is the surface showing through. */
  surface: string;
  grid: string;
  axis: string;
  ink: string;
  inkMuted: string;
  /** The one hue for single-series magnitude. */
  series: string;
  /** Fixed-order categorical slots. Never cycled past the fifth. */
  categorical: readonly string[];
  /** Hover wash behind a mark - dark on light, light on dark. */
  cursor: string;
}

const DARK: ChartTheme = {
  surface: '#181e27',
  grid: '#373d48',
  axis: '#979fab',
  ink: '#f1f5f9',
  inkMuted: '#979fab',
  series: '#3987e5',
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
  cursor: 'rgba(255,255,255,0.05)',
};

const LIGHT: ChartTheme = {
  surface: '#ffffff',
  grid: '#e2e6ee',
  axis: '#64707f',
  ink: '#1c232e',
  inkMuted: '#64707f',
  series: '#2a78d6',
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  cursor: 'rgba(15,23,42,0.05)',
};

export const chartTheme = (theme: Theme): ChartTheme => (theme === 'dark' ? DARK : LIGHT);

export const BAR_SIZE = 18;

/**
 * Everything a chart needs from the preferences: its palette, the axis tick style,
 * and `rtl` - which the charts consume as a value because Recharts positions text
 * and bars with absolute SVG coordinates that no CSS direction can mirror.
 */
export function useChart() {
  const { theme, rtl } = usePrefs();
  const chart = chartTheme(theme);
  return {
    chart,
    rtl,
    axisTick: { fill: chart.axis, fontSize: 12 } as const,
  };
}

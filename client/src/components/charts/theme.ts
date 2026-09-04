/**
 * Chart tokens.
 *
 * Hex, not the CSS custom properties, because Recharts needs concrete fill values
 * for its SVG marks. These are the app's own dark surfaces converted from the
 * `@theme` oklch tokens in index.css, so the two stay in step.
 *
 * The categorical slots are assigned in fixed order and never cycled. Validated on
 * this surface (#181e27) for the five slots used here: worst adjacent CVD dE 8.4,
 * worst adjacent normal-vision dE 19.3, all >= 3:1 contrast, including the wrap
 * pair that closes a donut ring.
 */
export const CHART = {
  surface: '#181e27',
  grid: '#373d48',
  axis: '#979fab',
  ink: '#f1f5f9',
  inkMuted: '#979fab',
  /** Single-series marks: one hue for every bar. */
  series: '#3987e5',
  /** Fixed categorical order, used only where the slices ARE the subject. */
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
} as const;

export const AXIS_TICK = { fill: CHART.axis, fontSize: 12 } as const;

/** Bars stay thin: the band's leftover width is air, not mark. */
export const BAR_SIZE = 18;

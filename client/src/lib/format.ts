/**
 * Display helpers. The dataset stores everything lowercase, so most of this is casing.
 *
 * Numbers and dates follow the active locale, which the preferences provider
 * pushes in here with `setActiveLocale`. It is a module variable rather than a hook
 * argument because these helpers are called from Recharts formatters and tick
 * renderers, where there is no component to read context from - and because a
 * language switch re-renders the whole tree anyway, so the value is never stale on
 * screen.
 */

let locale = 'en-US';

export const setActiveLocale = (next: string): void => {
  locale = next;
};

export const activeLocale = (): string => locale;

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const ACRONYMS = new Set([
  '3pl', 'api', 'aws', 'cdl', 'ceo', 'cfo', 'cio', 'ciso', 'coo', 'cpr', 'crm', 'cto', 'dod', 'emt',
  'erp', 'evp', 'gis', 'hr', 'it', 'llc', 'md', 'nato', 'osha', 'phd', 'pmp', 'qa', 'r&d', 'sap',
  'sql', 'svp', 'ui', 'us', 'u.s.', 'usa', 'usmc', 'uk', 'uae', 'vp',
]);

/**
 * Dataset values are English regardless of the interface language - they come from the
 * source file, not from a catalogue - so this stays English-cased in both languages.
 */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split(/(\s+|[/|-])/)
    .map((part, index) => {
      const word = part.toLowerCase();
      if (/^\s+$/.test(part) || /^[/|-]$/.test(part)) return part;
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/** job_title_role values are snake_case ("human_resources"). */
export const humanize = (value: string | null | undefined): string =>
  value ? titleCase(value.replace(/_/g, ' ')) : '';

/** Locale digits and grouping: 12,345 in English, ۱۲٬۳۴۵ in Persian. */
export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '-' : value.toLocaleString(locale);

/** How much of a date the source value actually carries. */
type Precision = 'year' | 'month' | 'day';

/**
 * `long` spells the month out, for a date standing on its own. `short` abbreviates it,
 * for a date sharing a line with a range partner and a location.
 */
type DateStyle = 'long' | 'short';

const DATE_FIELDS: Record<Precision, Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  day: {
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    short: { year: 'numeric', month: 'short', day: 'numeric' },
  },
  month: {
    long: { year: 'numeric', month: 'long' },
    short: { year: 'numeric', month: 'short' },
  },
  year: {
    long: { year: 'numeric' },
    short: { year: 'numeric' },
  },
};

/** Intl instances are expensive to build and these are re-created on every render. */
const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Persian reads the Jalali calendar, so `fa-IR` gets the explicit `persian` calendar
 * (its ICU default already, stated here so the intent survives a locale change) and the
 * Gregorian instant is converted rather than relabelled.
 *
 * It also always takes the `short` skeleton. Persian month names have no abbreviated
 * form - `MMM` and `MMMM` both give `مهر` - so the two styles differ only in field
 * order, and only `short` puts the month before the year the way a Persian date is
 * written. `long` renders `۱۳۹۸ مهر`, year first.
 */
function dateFormatter(precision: Precision, style: DateStyle): Intl.DateTimeFormat {
  const persian = locale.startsWith('fa');
  const tag = persian ? 'fa-IR-u-ca-persian' : locale;
  const used = persian ? 'short' : style;
  const key = `${tag}|${precision}|${used}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, { ...DATE_FIELDS[precision][used], timeZone: 'UTC' });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * A year-only value has no month to convert, and a Jalali year straddles two Gregorian
 * ones - 2001 is 1379 until 20 March and 1380 after it. Anchoring on 1 July picks the
 * Jalali year that covers most of the Gregorian one (286 days of 2001 fall in 1380);
 * anchoring on 1 January would pick the other, and report 2001 as 1379.
 *
 * A month-only value is anchored on the 1st for the same reason: a Gregorian month
 * begins around the 10th of a Jalali one, so most of its days belong to the Jalali
 * month that the 1st lands in.
 */
const anchor = (year: number, month: number, day: number, precision: Precision): Date =>
  new Date(Date.UTC(year, precision === 'year' ? 6 : month - 1, precision === 'day' ? day : 1));

/**
 * "2019-10-08" / "2019-10" / "2019" / null -> a date at the precision the source gives,
 * in the active calendar, or the caller's fallback. Anything unparseable is passed
 * through untouched rather than guessed at - the dataset is a dump, and a field holding
 * a phone number should look wrong, not plausible.
 *
 * English, `long`: "October 8, 2019" / "October 2019" / "2019"; `short` abbreviates the
 * month. Persian: "۱۶ مهر ۱۳۹۸" / "مهر ۱۳۹۸" / "۱۳۹۸", the same in either style.
 */
export function formatDate(
  value: string | null | undefined,
  fallback: string,
  style: DateStyle = 'short',
): string {
  if (!value) return fallback;
  const match = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(value.trim());
  if (!match?.[1]) return value;

  const year = Number(match[1]);
  const month = match[2] === undefined ? 0 : Number(match[2]);
  const day = match[3] === undefined ? 0 : Number(match[3]);

  // Degrade rather than reject: a broken day still leaves a usable month, and a broken
  // month still leaves a usable year.
  let precision: Precision = 'year';
  if (month >= 1 && month <= 12) precision = day >= 1 && day <= 31 ? 'day' : 'month';
  let date = anchor(year, month, day, precision);

  // Date.UTC rolls a day past the end of its month into the next one (31 April -> 1 May),
  // which would print a date the source never gave.
  if (precision === 'day' && date.getUTCDate() !== day) {
    precision = 'month';
    date = anchor(year, month, day, precision);
  }
  return dateFormatter(precision, style).format(date);
}

/**
 * A bare year, as a number: birth years arrive that way. Not `formatNumber`, which
 * groups thousands and turns 1958 into "1,958".
 */
export const formatYear = (value: number | null | undefined, fallback = '-'): string =>
  value === null || value === undefined || !Number.isFinite(value) || value <= 0
    ? fallback
    : formatDate(String(Math.trunc(value)).padStart(4, '0'), fallback);

/**
 * A date range. `present` is the word for an open end, and the separator is an en dash
 * with spaces - a neutral character between two dates, so the pair reads start-to-end in
 * the reading order of the page in either direction.
 */
export const formatRange = (start: string | null, end: string | null, present: string): string => {
  const from = formatDate(start, '');
  const to = formatDate(end, present);
  if (!from) return to === present ? '' : to;
  return `${from} – ${to}`;
};

export const initials = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/** A percentage in locale digits: "43%" / "۴۳٪". */
export const formatPercent = (part: number, whole: number, digits = 0): string =>
  whole === 0
    ? '-'
    : (part / whole).toLocaleString(locale, {
        style: 'percent',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

/**
 * Salary bands come as "45,000-55,000", "<20,000" or ">250,000". An open-ended band
 * has to keep its operator outside the currency symbol - "$>250,000" reads as a
 * broken price rather than "more than $250,000".
 *
 * The figures are re-parsed rather than passed through, so Persian shows Persian
 * digits, and the currency stays USD in both languages because the source values are
 * US dollars.
 */
export const formatSalary = (value: string | null | undefined): string => {
  if (!value) return '-';
  const operator = value.startsWith('<') || value.startsWith('>') ? value.slice(0, 1) : '';
  const body = operator ? value.slice(1) : value;
  const money = body
    .split('-')
    .map((part) => {
      const n = Number(part.replace(/,/g, ''));
      return Number.isFinite(n) ? formatNumber(n) : part;
    })
    .join('-');
  const amount = `$${money}`;
  return operator ? `${operator} ${amount}` : amount;
};

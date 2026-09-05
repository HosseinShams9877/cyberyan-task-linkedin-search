/**
 * Display helpers. The dataset stores everything lowercase, so most of this is casing.
 *
 * Numbers and month names follow the active locale, which the preferences provider
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

/** Zero-padded two-digit form, for the fallback path in formatMonth. */
const pad = (value: number): string => value.toLocaleString(locale, { minimumIntegerDigits: 2 });

/**
 * "2019-10" / "2019" / null -> "Oct 2019" / "2019" / the caller's fallback.
 *
 * Month names come from Intl rather than a hardcoded array, so Persian gets Persian
 * month names. The year stays Gregorian - the dataset's years are Gregorian, and
 * converting them to the Jalali calendar would misreport the source data.
 */
export function formatMonth(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value);
  if (!match?.[1]) return value;
  const year = Number(match[1]).toLocaleString(locale, { useGrouping: false });
  if (!match[2]) return year;
  const month = Number(match[2]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return `${pad(month)} ${year}`;
  const name = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2020, month - 1, 1)),
  );
  return `${name} ${year}`;
}

/**
 * A date range. `present` is the word for an open end, and the dash is a plain
 * en dash - the surrounding text direction is set by the document, and both start
 * and end are read in the reading order of the page.
 */
export const formatRange = (start: string | null, end: string | null, present: string): string => {
  const from = formatMonth(start, '');
  const to = formatMonth(end, present);
  if (!from) return to === present ? '' : to;
  return `${from} - ${to}`;
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

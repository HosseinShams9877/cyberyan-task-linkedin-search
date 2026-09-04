/** Display helpers. The dataset stores everything lowercase, so most of this is casing. */

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const ACRONYMS = new Set([
  '3pl', 'api', 'aws', 'cdl', 'ceo', 'cfo', 'cio', 'ciso', 'coo', 'cpr', 'crm', 'cto', 'dod', 'emt',
  'erp', 'evp', 'gis', 'hr', 'it', 'llc', 'md', 'nato', 'osha', 'phd', 'pmp', 'qa', 'r&d', 'sap',
  'sql', 'svp', 'ui', 'us', 'u.s.', 'usa', 'usmc', 'uk', 'uae', 'vp',
]);

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

export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '-' : value.toLocaleString('en-US');

export const formatCount = (value: number, singular: string, plural = `${singular}s`): string =>
  `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`;

/** "2019-10" / "2019" / null -> "Oct 2019" / "2019" / "Present". */
export function formatMonth(value: string | null | undefined, fallback = 'Present'): string {
  if (!value) return fallback;
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value);
  if (!match?.[1]) return value;
  if (!match[2]) return match[1];
  const month = Number(match[2]);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1] ?? match[2]} ${match[1]}`;
}

export const formatRange = (start: string | null, end: string | null): string => {
  const from = formatMonth(start, '');
  const to = formatMonth(end, 'Present');
  if (!from) return to === 'Present' ? '' : to;
  return `${from} - ${to}`;
};

export const initials = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/**
 * Salary bands come as "45,000-55,000", "<20,000" or ">250,000". An open-ended band
 * has to keep its operator outside the currency symbol - "$>250,000" reads as a
 * broken price rather than "more than $250,000".
 */
export const formatSalary = (value: string | null | undefined): string => {
  if (!value) return '-';
  const operator = value.startsWith('<') || value.startsWith('>') ? value.slice(0, 1) : '';
  return operator ? `${operator} $${value.slice(1)}` : `$${value}`;
};

/**
 * Turns raw dump rows into profile records.
 *
 * The shards do not share a column order, so positional mapping against the
 * header is unusable. What *is* stable in every shard:
 *
 *  - the 14 structured columns (phone_numbers … version_status) always appear as
 *    one contiguous group in the same internal order, and their Python payloads
 *    are self-describing, so the group can be located by fingerprint;
 *  - `experience` carries the primary job with its full company object, so every
 *    job_* / job_company_* scalar is derivable from it;
 *  - the remaining scalars (name, gender, geo, salary, connections, summary,
 *    industry, the person's location) are identifiable by content, and the
 *    location cell can be cross-checked against location_names/regions/countries.
 *
 * Everything below therefore reads content, never column offsets.
 */
import type { RawRecord } from './profiles-reader';
import {
  asNumber,
  asRecordArray,
  asString,
  asStringArray,
  isRecord,
  tryParsePythonLiteral,
  type PyValue,
} from './python-literal';

/** Structured columns, in the order they appear in every shard. */
const BLOCK = [
  'phone_numbers',
  'emails',
  'interests',
  'skills',
  'location_names',
  'regions',
  'countries',
  'street_addresses',
  'experience',
  'education',
  'profiles',
  'certifications',
  'languages',
  'version_status',
] as const;

type BlockKey = (typeof BLOCK)[number];

const keysOf = (v: PyValue | undefined): string[] | null => (isRecord(v) ? Object.keys(v) : null);
const listOf = (v: PyValue | undefined, test: (first: PyValue) => boolean): boolean =>
  Array.isArray(v) && (v.length === 0 || test(v[0] as PyValue));
const dictList = (key: string) => (v: PyValue | undefined) =>
  listOf(v, (first) => (keysOf(first) ?? []).includes(key));
const stringList = (v: PyValue | undefined): boolean => listOf(v, (first) => typeof first === 'string');

const FINGERPRINT: Record<BlockKey, (v: PyValue | undefined) => boolean> = {
  phone_numbers: (v) => listOf(v, (f) => typeof f === 'string' && /^\+?\d/.test(f)),
  emails: dictList('address'),
  interests: stringList,
  skills: stringList,
  location_names: stringList,
  regions: stringList,
  countries: stringList,
  street_addresses: dictList('street_address'),
  experience: dictList('title'),
  education: dictList('school'),
  profiles: dictList('network'),
  certifications: dictList('name'),
  languages: dictList('name'),
  version_status: (v) => (keysOf(v) ?? []).includes('status'),
};

/** Columns whose payload shape is unique enough to trust on its own. */
const STRONG = new Set<BlockKey>([
  'phone_numbers',
  'emails',
  'street_addresses',
  'experience',
  'education',
  'profiles',
  'version_status',
]);

const MIN_BLOCK_SCORE = 24;

/** Sliding window over the row; returns the best offset of the structured group. */
function locateBlock(parsed: (PyValue | undefined)[], width: number): { offset: number; score: number } {
  let offset = -1;
  let score = Number.NEGATIVE_INFINITY;
  for (let p = 0; p + BLOCK.length <= width + 3; p += 1) {
    let s = 0;
    for (let k = 0; k < BLOCK.length; k += 1) {
      const value = parsed[p + k];
      const key = BLOCK[k] as BlockKey;
      if (value === undefined) {
        s -= 3; // scalar cell or outside the row
        continue;
      }
      if (value === null) {
        s -= 1; // empty cell: neutral-ish, the column may legitimately be blank
        continue;
      }
      s += FINGERPRINT[key](value) ? (STRONG.has(key) ? 6 : 2) : -6;
    }
    if (s > score) {
      score = s;
      offset = p;
    }
  }
  return { offset, score };
}

export interface EmailEntry {
  address: string;
  type: string | null;
}
export interface LanguageEntry {
  name: string;
  proficiency: number | null;
}
export interface CertificationEntry {
  name: string;
  organization: string | null;
  startDate: string | null;
  endDate: string | null;
}
export interface SocialProfileEntry {
  network: string;
  url: string | null;
  username: string | null;
  id: string | null;
}
export interface ExperienceEntry {
  title: string | null;
  titleRole: string | null;
  titleLevels: string[];
  companyName: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  companyWebsite: string | null;
  locationName: string | null;
  startDate: string | null;
  endDate: string | null;
  isPrimary: boolean;
  isCurrent: boolean;
  summary: string | null;
}
export interface EducationEntry {
  school: string | null;
  schoolType: string | null;
  locationName: string | null;
  degrees: string[];
  majors: string[];
  minors: string[];
  gpa: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ExtractedProfile {
  sourceId: string | null;
  sourceLine: number;
  partial: boolean;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  linkedinUrl: string;
  linkedinUsername: string | null;
  linkedinId: string | null;
  industry: string | null;
  summary: string | null;
  jobTitle: string | null;
  jobTitleRole: string | null;
  jobTitleSubRole: string | null;
  jobTitleLevels: string[];
  jobStartDate: string | null;
  jobSummary: string | null;
  companyName: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  companyFounded: number | null;
  companyLocation: string | null;
  locationName: string | null;
  locality: string | null;
  metro: string | null;
  region: string | null;
  country: string | null;
  continent: string | null;
  geo: string | null;
  connections: number | null;
  inferredSalary: string | null;
  inferredYears: number | null;
  birthYear: number | null;
  skills: string[];
  interests: string[];
  phoneNumbers: string[];
  emails: EmailEntry[];
  languages: LanguageEntry[];
  certifications: CertificationEntry[];
  socialProfiles: SocialProfileEntry[];
  locationNames: string[];
  regions: string[];
  countries: string[];
  experiences: ExperienceEntry[];
  educations: EducationEntry[];
  dataVersion: string | null;
}

export interface ExtractStats {
  rows: number;
  extracted: number;
  unique: number;
  droppedNoBlock: number;
  droppedNoUrl: number;
  headless: number;
  truncated: number;
  industryVocabulary: number;
}

const LITERAL = /^[[{]/;
const GEO = /^-?\d{1,3}\.\d+,\s?-?\d{1,3}\.\d+$/;
/** PDL inferred_salary buckets: "50,000-60,000", "<20,000", ">250,000". */
const SALARY = /^(?:[<>]\s?\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{3})+\s?-\s?\d{1,3}(?:,\d{3})+)$/;
const FLOAT = /^\d{1,6}\.\d+$/;
const NAMEISH = /^[\p{L}][\p{L}\p{M}.'’\- ]{1,58}$/u;
const SLUG_NOISE = /^(?:\d+|[0-9a-f]{6,}|[a-z]?\d[a-z\d]*)$/i;
const CONTINENTS = new Set([
  'north america',
  'south america',
  'europe',
  'asia',
  'africa',
  'oceania',
  'antarctica',
]);
const GENDERS = new Set(['male', 'female']);

const commas = (v: string): number => (v.match(/,/g) ?? []).length;

/** Cell → literal, `null` for an empty cell, `undefined` for a scalar. */
function parseCells(fields: string[]): (PyValue | undefined)[] {
  return fields.map((f) => {
    const t = f.trim();
    if (t === '') return null;
    if (!LITERAL.test(t)) return undefined;
    return tryParsePythonLiteral(t);
  });
}

/** The job the flat job_* columns describe. */
function primaryExperience(experiences: Record<string, PyValue>[]): Record<string, PyValue> | undefined {
  return (
    experiences.find((e) => e['is_primary'] === true) ??
    experiences.find((e) => e['end_date'] === null || e['end_date'] === undefined) ??
    experiences[0]
  );
}

const titleOf = (exp: Record<string, PyValue> | undefined): Record<string, PyValue> | null => {
  const t = exp?.['title'];
  return isRecord(t) ? t : null;
};
const companyOf = (exp: Record<string, PyValue> | undefined): Record<string, PyValue> | null => {
  const c = exp?.['company'];
  return isRecord(c) ? c : null;
};
const locationNameOf = (holder: Record<string, PyValue> | null): string | null => {
  const l = holder?.['location'];
  return isRecord(l) ? asString(l['name']) : null;
};

type Block = Partial<Record<BlockKey, PyValue>>;

interface Row {
  fields: string[];
  block: Block;
  /** Index of the first cell of the structured group. */
  blockOffset: number;
  /** Indices of non-empty scalar cells outside the structured group. */
  scalars: number[];
  at: (i: number) => string;
}

function buildRow(record: RawRecord): Row | null {
  const { fields } = record;
  const parsed = parseCells(fields);
  const { offset, score } = locateBlock(parsed, fields.length);
  if (offset < 0 || score < MIN_BLOCK_SCORE) return null;

  const block: Block = {};
  BLOCK.forEach((key, k) => {
    const value = parsed[offset + k];
    if (value !== undefined && value !== null) block[key] = value;
  });

  const scalars: number[] = [];
  for (let i = 0; i < fields.length; i += 1) {
    if (i >= offset && i < offset + BLOCK.length) continue;
    if (parsed[i] !== undefined) continue; // literal or empty cell
    if ((fields[i] ?? '').trim() === '') continue;
    scalars.push(i);
  }

  return { fields, block, blockOffset: offset, scalars, at: (i) => (fields[i] ?? '').trim() };
}

const slugOf = (url: string): string | null => {
  const m = /linkedin\.com\/in\/([^/?#\s,"]+)/i.exec(url);
  return m?.[1] ? decodeURIComponent(m[1]).toLowerCase() : null;
};

const slugTokens = (slug: string | null): string[] =>
  (slug ?? '')
    .split(/[-_.]+/)
    .filter((t) => t.length > 1 && !SLUG_NOISE.test(t));

const titleCase = (words: string[]): string =>
  words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const PROFILE_URL = /linkedin\.com\/in\//i;

/** `https://www.linkedin.com/in/Foo/` → `linkedin.com/in/foo` (dedupe key). */
const normalizeUrl = (raw: string): string =>
  raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#]+$/, '')
    .toLowerCase();

function resolveUrl(row: Row, socials: SocialProfileEntry[]): { url: string | null; index: number } {
  const index = row.scalars.find((i) => PROFILE_URL.test(row.at(i)));
  if (index !== undefined) return { url: normalizeUrl(row.at(index)), index };
  const fromSocial = socials.find((s) => s.network === 'linkedin' && s.url);
  return { url: fromSocial?.url ? normalizeUrl(fromSocial.url) : null, index: -1 };
}

/**
 * The name columns are not positionally identifiable, but the LinkedIn slug is
 * built from the name, so slug-token overlap picks the right cell (and lets a
 * headless record fall back to the slug itself).
 */
function resolveName(
  row: Row,
  urlIndex: number,
  slug: string | null,
): { fullName: string; firstName: string | null; lastName: string | null } {
  const tokens = slugTokens(slug);
  // Slugs are not always hyphenated ("joeyholland" for joseph holland), so a
  // name word also counts when it appears inside the letters of the slug.
  const flat = (slug ?? '').replace(/[^a-z]+/gi, '').toLowerCase();
  const isHit = (word: string): boolean =>
    tokens.includes(word) || (word.length >= 4 && flat.includes(word));
  let best: { value: string; score: number } | null = null;

  for (const i of row.scalars) {
    const value = row.at(i);
    if (value.length > 60 || commas(value) > 0 || /\d/.test(value) || !NAMEISH.test(value)) continue;
    const words = value.split(/\s+/);
    if (words.length > 4) continue;
    const hits = words.filter((w) => isHit(w.toLowerCase())).length;
    if (hits === 0) continue;
    let score = hits * 6;
    if (hits === words.length) score += 4;
    if (words.length >= 2) score += 5; // full_name beats the first_name/last_name cells
    if (urlIndex >= 0) score -= Math.abs(i - urlIndex) * 0.05;
    if (!best || score > best.score) best = { value, score };
  }

  const full = best?.value ?? (tokens.length >= 2 ? titleCase(tokens) : (slug ?? ''));
  const words = full.split(/\s+/).filter(Boolean);
  return {
    fullName: full,
    firstName: words[0] ?? null,
    lastName: words.length > 1 ? (words[words.length - 1] as string) : null,
  };
}

/**
 * `location_names` is unordered, so its last element is not "the" location.
 * Instead: score every comma-rich scalar against the row's own location lists.
 */
function resolveLocation(row: Row, block: Block, companyLocation: string | null): { name: string | null; index: number } {
  const locations = asStringArray(block.location_names);
  const regions = asStringArray(block.regions);
  const countries = asStringArray(block.countries);
  const addresses = asRecordArray(block.street_addresses);
  let best: { name: string; index: number; score: number } | null = null;

  for (const i of row.scalars) {
    const value = row.at(i);
    if (commas(value) < 1 || value.length > 80 || /[\dA-Z:]/.test(value) || value.endsWith('.')) continue;
    const parts = value.split(',').map((p) => p.trim());
    let score = 0;
    if (locations.includes(value)) score += 12;
    if (companyLocation && value === companyLocation) score -= 10;
    if (commas(value) >= 2) score += 3;
    const region = parts[parts.length - 2];
    if (region && regions.some((r) => r.startsWith(`${region},`))) score += 4;
    const country = parts[parts.length - 1];
    if (country && countries.includes(country)) score += 4;
    if (addresses.some((a) => asString(a['name']) === value)) score += 6;
    // 2+ commas alone is not enough: prose ("specialties: x, y, and z") has commas too.
    if (score < 4) continue;
    if (!best || score > best.score) best = { name: value, index: i, score };
  }
  if (best) return { name: best.name, index: best.index };

  // Country-only people ("iraq") have no comma at all, so they only qualify when a
  // location list vouches for the value — and only outside the company's own
  // location group, whose country cell would otherwise win by sitting first.
  const companyAt = companyLocation ? row.scalars.find((i) => row.at(i) === companyLocation) : undefined;
  for (const i of row.scalars) {
    if (companyAt !== undefined && i >= companyAt && i <= companyAt + 6) continue;
    const value = row.at(i);
    if (value.length > 60 || /[\dA-Z:]/.test(value)) continue;
    if (!countries.includes(value) && !locations.includes(value)) continue;
    return { name: value, index: i };
  }
  return { name: null, index: -1 };
}

/**
 * location_locality / location_metro sit directly after location_name in every
 * layout (verified: 314/322 rows), which is the only reliable way to pick the
 * metro out — it is shaped like any other place name.
 */
function resolveMetro(row: Row, locationIndex: number, exclude: Set<string>, countries: string[]): string | null {
  if (locationIndex < 0) return null;
  const usable = (v: string): boolean =>
    v !== '' &&
    v.length < 50 &&
    commas(v) <= 1 &&
    !/[\dA-Z:]/.test(v) &&
    !exclude.has(v) &&
    !CONTINENTS.has(v) &&
    !GEO.test(v);

  const direct = row.at(locationIndex + 2);
  if (usable(direct)) return direct;

  for (let k = 1; k <= 5; k += 1) {
    const value = row.at(locationIndex + k);
    if (!usable(value) || commas(value) !== 1) continue;
    const tail = value.split(',')[1]?.trim() ?? '';
    if (countries.includes(tail)) continue; // "region, country", not a metro
    return value;
  }
  return null;
}

/**
 * connections / inferred_years_experience are bare floats ("90.0") and cannot be
 * told apart by shape — but in every shard they sit on either side of
 * inferred_salary, so that cell anchors them.
 */
function resolveNumbers(row: Row): {
  connections: number | null;
  inferredSalary: string | null;
  inferredYears: number | null;
} {
  const floats: { i: number; n: number }[] = [];
  let salaryIndex = -1;
  let inferredSalary: string | null = null;

  for (const i of row.scalars) {
    const value = row.at(i);
    if (salaryIndex < 0 && SALARY.test(value)) {
      salaryIndex = i;
      inferredSalary = value;
      continue;
    }
    if (FLOAT.test(value)) floats.push({ i, n: Number(value) });
  }

  const before = floats.filter((f) => salaryIndex < 0 || f.i < salaryIndex).sort((a, b) => b.i - a.i);
  const after = floats.filter((f) => salaryIndex >= 0 && f.i > salaryIndex && f.n <= 70).sort((a, b) => a.i - b.i);

  return {
    connections: before[0] ? Math.round(before[0].n) : null,
    inferredSalary,
    inferredYears: after[0] ? Math.round(after[0].n) : null,
  };
}

/** Some payload scalars arrive as numbers (ids, gpa, founded). */
const str = (v: PyValue | undefined): string | null =>
  typeof v === 'number' && Number.isFinite(v) ? String(v) : asString(v);
const int = (v: PyValue | undefined): number | null => {
  const n = asNumber(v);
  if (n !== null) return Math.round(n);
  const s = asString(v);
  return s && /^-?\d+(\.\d+)?$/.test(s) ? Math.round(Number(s)) : null;
};

const emailEntries = (v: PyValue | undefined): EmailEntry[] =>
  asRecordArray(v)
    .map((e) => ({ address: asString(e['address']) ?? '', type: asString(e['type']) }))
    .filter((e) => e.address !== '');

const languageEntries = (v: PyValue | undefined): LanguageEntry[] =>
  asRecordArray(v)
    .map((l) => ({ name: asString(l['name']) ?? '', proficiency: asNumber(l['proficiency']) }))
    .filter((l) => l.name !== '');

const certificationEntries = (v: PyValue | undefined): CertificationEntry[] =>
  asRecordArray(v)
    .map((c) => ({
      name: asString(c['name']) ?? '',
      organization: asString(c['organization']),
      startDate: asString(c['start_date']),
      endDate: asString(c['end_date']),
    }))
    .filter((c) => c.name !== '');

const socialEntries = (v: PyValue | undefined): SocialProfileEntry[] =>
  asRecordArray(v)
    .map((p) => ({
      network: (asString(p['network']) ?? '').toLowerCase(),
      url: asString(p['url']),
      username: asString(p['username']),
      id: str(p['id']),
    }))
    .filter((p) => p.network !== '');

const experienceEntries = (v: PyValue | undefined): ExperienceEntry[] =>
  asRecordArray(v)
    .map((e) => {
      const title = titleOf(e);
      const company = companyOf(e);
      return {
        title: title ? asString(title['name']) : null,
        titleRole: title ? asString(title['role']) : null,
        titleLevels: title ? asStringArray(title['levels']) : [],
        companyName: company ? asString(company['name']) : null,
        companySize: company ? asString(company['size']) : null,
        companyIndustry: company ? asString(company['industry']) : null,
        companyWebsite: company ? asString(company['website']) : null,
        locationName: locationNameOf(company),
        startDate: asString(e['start_date']),
        endDate: asString(e['end_date']),
        isPrimary: e['is_primary'] === true,
        isCurrent: e['end_date'] === null || e['end_date'] === undefined,
        summary: asString(e['summary']),
      };
    })
    .filter((e) => e.title !== null || e.companyName !== null);

const educationEntries = (v: PyValue | undefined): EducationEntry[] =>
  asRecordArray(v)
    .map((e) => {
      const school = isRecord(e['school']) ? e['school'] : null;
      return {
        school: school ? asString(school['name']) : asString(e['school']),
        schoolType: school ? asString(school['type']) : null,
        locationName: locationNameOf(school),
        degrees: asStringArray(e['degrees']),
        majors: asStringArray(e['majors']),
        minors: asStringArray(e['minors']),
        gpa: str(e['gpa']),
        startDate: asString(e['start_date']),
        endDate: asString(e['end_date']),
      };
    })
    .filter((e) => e.school !== null);

const YEAR = /^(19[2-9]\d|20[0-1]\d)$/;

/**
 * A bare year is ambiguous (company founded, a linkedin id, a graduation year),
 * but birth_year and birth_date are adjacent columns describing the same date,
 * so an equal-prefixed pair identifies them without needing a fixed offset.
 */
function resolveBirthYear(row: Row): number | null {
  for (let i = 0; i + 1 < row.fields.length; i += 1) {
    const value = row.at(i);
    if (!YEAR.test(value)) continue;
    if (!row.at(i + 1).startsWith(value)) continue;
    return Number(value);
  }
  return null;
}

function extractOne(record: RawRecord, row: Row, vocabulary: Set<string>): ExtractedProfile | null {
  const { block } = row;
  const rawExperience = asRecordArray(block.experience);
  const primary = primaryExperience(rawExperience);
  const title = titleOf(primary);
  const company = companyOf(primary);
  const companyLocation = locationNameOf(company);
  const companyIndustry = company ? asString(company['industry']) : null;

  const socialProfiles = socialEntries(block.profiles);
  const { url, index: urlIndex } = resolveUrl(row, socialProfiles);
  if (!url) return null;
  const slug = slugOf(url);

  const { fullName, firstName, lastName } = resolveName(row, urlIndex, slug);
  if (fullName === '') return null;

  const location = resolveLocation(row, block, companyLocation);
  const parts = location.name ? location.name.split(',').map((p) => p.trim()) : [];
  const numbers = resolveNumbers(row);

  const values = row.scalars.map((i) => row.at(i));
  const gender = values.find((v) => GENDERS.has(v)) ?? null;

  const vocabularyHits = values.filter((v) => vocabulary.has(v));
  const industry = vocabularyHits.find((v) => v !== companyIndustry) ?? vocabularyHits[0] ?? null;

  // The flat summary is the cell immediately before the structured group in every
  // layout (verified: prose in 318/345 rows, empty in 22), which is the only way
  // to catch the short ones ("Transportation Foreman at KBR"). job_summary is a
  // copy of the primary experience's summary, which the payload gives us exactly.
  const jobSummary = primary ? asString(primary['summary']) : null;
  const head = (v: string): string => v.slice(0, 60);
  const isJobSummary = (v: string): boolean =>
    jobSummary !== null && (jobSummary.startsWith(head(v)) || v.startsWith(head(jobSummary)));
  const adjacent = row.blockOffset > 0 ? row.at(row.blockOffset - 1) : '';
  let summary: string | null = null;
  if (adjacent.length >= 12 && /\s/.test(adjacent) && !PROFILE_URL.test(adjacent) && !isJobSummary(adjacent)) {
    summary = adjacent;
  } else {
    // Reordered shards can put something else there; fall back to the longest prose.
    let anySummary: string | null = null;
    for (const value of values) {
      if (value.length < 60 || !/\s/.test(value) || PROFILE_URL.test(value)) continue;
      if (!anySummary || value.length > anySummary.length) anySummary = value;
      if (isJobSummary(value)) continue;
      if (!summary || value.length > summary.length) summary = value;
    }
    summary = summary ?? anySummary;
  }

  const locality = parts.length >= 3 ? (parts[0] as string) : null;
  const region = parts.length >= 2 ? (parts[parts.length - 2] as string) : null;
  const country = parts.length >= 1 ? (parts[parts.length - 1] as string) : null;
  const metro = resolveMetro(
    row,
    location.index,
    new Set(
      [location.name, locality, region, country, companyLocation].filter((v): v is string => v !== null),
    ),
    asStringArray(block.countries),
  );

  // The company's geo/continent usually appear in the same row, so stay inside the
  // person's location group; a person without one must not inherit the company's.
  const nearLocation = (test: (v: string) => boolean): string | null => {
    for (let k = 1; k <= 6; k += 1) {
      const value = row.at(location.index + k);
      if (test(value)) return value;
    }
    return null;
  };
  const isGeo = (v: string): boolean => GEO.test(v);
  const isContinent = (v: string): boolean => CONTINENTS.has(v);
  const geo = location.index < 0 ? (values.find(isGeo) ?? null) : nearLocation(isGeo);
  const continent = location.index < 0 ? (values.find(isContinent) ?? null) : nearLocation(isContinent);

  const linkedin = socialProfiles.find((s) => s.network === 'linkedin');
  const nearUrlId =
    urlIndex < 0
      ? undefined
      : row.scalars.filter((i) => Math.abs(i - urlIndex) <= 3 && /^\d{5,12}$/.test(row.at(i))).map((i) => row.at(i))[0];

  const versionStatus = isRecord(block.version_status) ? block.version_status : null;

  return {
    sourceId: record.sourceId,
    sourceLine: record.shardLine ?? record.line,
    partial: record.truncated || record.headless,
    fullName,
    firstName,
    lastName,
    gender,
    linkedinUrl: url,
    linkedinUsername: slug ?? linkedin?.username ?? null,
    linkedinId: linkedin?.id ?? nearUrlId ?? null,
    industry,
    summary,
    jobTitle: title ? asString(title['name']) : null,
    jobTitleRole: title ? asString(title['role']) : null,
    jobTitleSubRole: title ? asString(title['sub_role']) : null,
    jobTitleLevels: title ? asStringArray(title['levels']) : [],
    jobStartDate: primary ? asString(primary['start_date']) : null,
    jobSummary,
    companyName: company ? asString(company['name']) : null,
    companySize: company ? asString(company['size']) : null,
    companyIndustry,
    companyWebsite: company ? asString(company['website']) : null,
    companyLinkedinUrl: company ? asString(company['linkedin_url']) : null,
    companyFounded: company ? int(company['founded']) : null,
    companyLocation,
    locationName: location.name,
    locality,
    metro,
    region,
    country,
    continent,
    geo,
    connections: numbers.connections,
    inferredSalary: numbers.inferredSalary,
    inferredYears: numbers.inferredYears,
    birthYear: resolveBirthYear(row),
    skills: asStringArray(block.skills),
    interests: asStringArray(block.interests),
    phoneNumbers: asStringArray(block.phone_numbers),
    emails: emailEntries(block.emails),
    languages: languageEntries(block.languages),
    certifications: certificationEntries(block.certifications),
    socialProfiles,
    locationNames: asStringArray(block.location_names),
    regions: asStringArray(block.regions),
    countries: asStringArray(block.countries),
    experiences: experienceEntries(block.experience),
    educations: educationEntries(block.education),
    dataVersion: versionStatus
      ? (str(versionStatus['current_version']) ?? str(versionStatus['previous_version']))
      : null,
  };
}

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** How much of the record survived the dump — used to pick the better duplicate. */
const richness = (p: ExtractedProfile): number =>
  Object.values(p).reduce<number>((n, v) => n + (isEmpty(v) ? 0 : 1), 0) - (p.partial ? 10 : 0);

/** Same person emitted twice by grep: keep the richer row, backfill its gaps. */
function dedupe(profiles: ExtractedProfile[]): ExtractedProfile[] {
  const byUrl = new Map<string, ExtractedProfile>();
  for (const profile of profiles) {
    const existing = byUrl.get(profile.linkedinUrl);
    if (!existing) {
      byUrl.set(profile.linkedinUrl, profile);
      continue;
    }
    const [keep, drop] =
      richness(profile) > richness(existing) ? [profile, existing] : [existing, profile];
    for (const key of Object.keys(keep) as (keyof ExtractedProfile)[]) {
      if (isEmpty(keep[key]) && !isEmpty(drop[key])) {
        (keep as unknown as Record<string, unknown>)[key] = drop[key];
      }
    }
    keep.partial = keep.partial && drop.partial;
    byUrl.set(keep.linkedinUrl, keep);
  }
  return [...byUrl.values()];
}

export function extractProfiles(records: RawRecord[]): { profiles: ExtractedProfile[]; stats: ExtractStats } {
  const rows: { record: RawRecord; row: Row }[] = [];
  let droppedNoBlock = 0;

  for (const record of records) {
    const row = buildRow(record);
    if (row) rows.push({ record, row });
    else droppedNoBlock += 1;
  }

  // The dataset is its own industry dictionary: company.industry inside the
  // experience payloads uses exactly the vocabulary of the flat industry column.
  const vocabulary = new Set<string>();
  for (const { row } of rows) {
    for (const entry of asRecordArray(row.block.experience)) {
      const industry = asString(companyOf(entry)?.['industry']);
      if (industry) vocabulary.add(industry);
    }
  }

  const extracted: ExtractedProfile[] = [];
  let droppedNoUrl = 0;
  let headless = 0;
  let truncated = 0;

  for (const { record, row } of rows) {
    const profile = extractOne(record, row, vocabulary);
    if (!profile) {
      droppedNoUrl += 1;
      continue;
    }
    extracted.push(profile);
    if (record.headless) headless += 1;
    if (record.truncated) truncated += 1;
  }

  const profiles = dedupe(extracted);
  return {
    profiles,
    stats: {
      rows: records.length,
      extracted: extracted.length,
      unique: profiles.length,
      droppedNoBlock,
      droppedNoUrl,
      headless,
      truncated,
      industryVocabulary: vocabulary.size,
    },
  };
}

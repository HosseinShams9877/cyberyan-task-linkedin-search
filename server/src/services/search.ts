/**
 * Search, filter and profile queries.
 *
 * Case-insensitivity: every string the dataset provides is already lowercase, and
 * `searchText` is a lowercased haystack built at seed time, so lowercasing the
 * needle is enough. That avoids `mode: "insensitive"`, which SQLite does not
 * support — the same query therefore runs unchanged on dev.db and on Neon.
 */
import type { Prisma } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import type {
  Bucket,
  EducationView,
  ExperienceView,
  FiltersResponse,
  ProfileDetail,
  ProfileSummary,
  SearchResponse,
} from '../types/api';
import { parseJsonArray, parseStringArray } from '../lib/json';

export interface SearchQuery {
  keyword?: string;
  jobTitle?: string;
  skill?: string;
  industry?: string;
  country?: string;
  company?: string;
  role?: string;
  minConnections?: number;
  minYears?: number;
  hasEmail?: boolean;
  sort: 'relevance' | 'name' | 'connections' | 'experience';
  page: number;
  pageSize: number;
}

const SUMMARY_SELECT = {
  id: true,
  fullName: true,
  jobTitle: true,
  jobTitleRole: true,
  companyName: true,
  companyIndustry: true,
  industry: true,
  locationName: true,
  country: true,
  connections: true,
  inferredYears: true,
  inferredSalary: true,
  linkedinUrl: true,
  summary: true,
  _count: { select: { skills: true } },
  skills: { select: { skill: { select: { name: true } } }, orderBy: { skill: { name: 'asc' } } },
} satisfies Prisma.ProfileSelect;

type SummaryRow = Prisma.ProfileGetPayload<{ select: typeof SUMMARY_SELECT }>;

const toSummary = (row: SummaryRow): ProfileSummary => ({
  id: row.id,
  fullName: row.fullName,
  jobTitle: row.jobTitle,
  jobTitleRole: row.jobTitleRole,
  companyName: row.companyName,
  companyIndustry: row.companyIndustry,
  industry: row.industry,
  locationName: row.locationName,
  country: row.country,
  connections: row.connections,
  inferredYears: row.inferredYears,
  inferredSalary: row.inferredSalary,
  linkedinUrl: row.linkedinUrl,
  summary: row.summary,
  skills: row.skills.map((s) => s.skill.name),
  skillCount: row._count.skills,
});

/** Splits a keyword into terms that must all appear somewhere in the haystack. */
const terms = (keyword: string): string[] =>
  keyword
    .toLowerCase()
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .slice(0, 8);

export function buildWhere(query: SearchQuery): Prisma.ProfileWhereInput {
  const and: Prisma.ProfileWhereInput[] = [];

  if (query.keyword) {
    for (const term of terms(query.keyword)) and.push({ searchText: { contains: term } });
  }
  if (query.jobTitle) {
    const needle = query.jobTitle.toLowerCase();
    and.push({
      OR: [
        { jobTitle: { contains: needle } },
        { experiences: { some: { title: { contains: needle } } } },
      ],
    });
  }
  if (query.skill) {
    and.push({ skills: { some: { skill: { name: { contains: query.skill.toLowerCase() } } } } });
  }
  if (query.industry) {
    const needle = query.industry.toLowerCase();
    and.push({ OR: [{ industry: { contains: needle } }, { companyIndustry: { contains: needle } }] });
  }
  if (query.country) and.push({ country: { contains: query.country.toLowerCase() } });
  if (query.company) and.push({ companyName: { contains: query.company.toLowerCase() } });
  if (query.role) and.push({ jobTitleRole: { contains: query.role.toLowerCase() } });
  if (query.minConnections !== undefined) and.push({ connections: { gte: query.minConnections } });
  if (query.minYears !== undefined) and.push({ inferredYears: { gte: query.minYears } });
  if (query.hasEmail === true) and.push({ NOT: { emailsJson: null } });
  if (query.hasEmail === false) and.push({ emailsJson: null });

  return and.length === 0 ? {} : { AND: and };
}

/**
 * NULL ordering differs between SQLite and PostgreSQL, so every sort ends with a
 * non-null tiebreaker to keep pagination stable on both.
 */
function buildOrderBy(sort: SearchQuery['sort']): Prisma.ProfileOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ fullName: 'asc' }, { id: 'asc' }];
    case 'connections':
      return [{ connections: 'desc' }, { fullName: 'asc' }, { id: 'asc' }];
    case 'experience':
      return [{ inferredYears: 'desc' }, { fullName: 'asc' }, { id: 'asc' }];
    default:
      // "relevance": complete records first, then the best-connected profiles.
      return [{ partial: 'asc' }, { connections: 'desc' }, { fullName: 'asc' }, { id: 'asc' }];
  }
}

export async function searchProfiles(query: SearchQuery): Promise<SearchResponse> {
  const startedAt = Date.now();
  const where = buildWhere(query);
  const [total, rows] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: buildOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    tookMs: Date.now() - startedAt,
    query: {
      keyword: query.keyword ?? null,
      jobTitle: query.jobTitle ?? null,
      skill: query.skill ?? null,
      industry: query.industry ?? null,
      country: query.country ?? null,
      company: query.company ?? null,
      minConnections: query.minConnections ?? null,
      minYears: query.minYears ?? null,
      hasEmail: query.hasEmail ?? null,
      sort: query.sort,
    },
    results: rows.map(toSummary),
  };
}

/** Values for the filter dropdowns, ordered by how many profiles they match. */
export async function getFilters(): Promise<FiltersResponse> {
  const [jobTitles, industries, countries, roles, skills] = await Promise.all([
    prisma.profile.groupBy({
      by: ['jobTitle'],
      where: { NOT: { jobTitle: null } },
      _count: { _all: true },
      orderBy: { _count: { jobTitle: 'desc' } },
      take: 60,
    }),
    prisma.profile.groupBy({
      by: ['industry'],
      where: { NOT: { industry: null } },
      _count: { _all: true },
      orderBy: { _count: { industry: 'desc' } },
      take: 40,
    }),
    prisma.profile.groupBy({
      by: ['country'],
      where: { NOT: { country: null } },
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 40,
    }),
    prisma.profile.groupBy({
      by: ['jobTitleRole'],
      where: { NOT: { jobTitleRole: null } },
      _count: { _all: true },
      orderBy: { _count: { jobTitleRole: 'desc' } },
      take: 30,
    }),
    topSkills(60),
  ]);

  return {
    jobTitles: jobTitles.map((row) => ({ label: row.jobTitle ?? '', count: row._count._all })),
    skills,
    industries: industries.map((row) => ({ label: row.industry ?? '', count: row._count._all })),
    countries: countries.map((row) => ({ label: row.country ?? '', count: row._count._all })),
    roles: roles.map((row) => ({ label: row.jobTitleRole ?? '', count: row._count._all })),
  };
}

/**
 * Skills live in a join table, so the ranking is a groupBy on the ids followed by
 * one lookup for the names (two indexed queries instead of loading every profile).
 */
export async function topSkills(take: number): Promise<Bucket[]> {
  const grouped = await prisma.profileSkill.groupBy({
    by: ['skillId'],
    _count: { skillId: true },
    orderBy: { _count: { skillId: 'desc' } },
    take,
  });
  if (grouped.length === 0) return [];
  const names = await prisma.skill.findMany({
    where: { id: { in: grouped.map((row) => row.skillId) } },
    select: { id: true, name: true },
  });
  const byId = new Map(names.map((skill) => [skill.id, skill.name]));
  return grouped.map((row) => ({ label: byId.get(row.skillId) ?? '', count: row._count.skillId }));
}

interface LanguageJson {
  name?: string | null;
  proficiency?: string | null;
}
interface CertificationJson {
  name?: string | null;
  organization?: string | null;
}
interface SocialJson {
  network?: string | null;
  url?: string | null;
  username?: string | null;
}

/** Full record for the detail panel, including relations and the JSON columns. */
export async function getProfile(id: number): Promise<ProfileDetail | null> {
  const row = await prisma.profile.findUnique({
    where: { id },
    include: {
      skills: { select: { skill: { select: { name: true } } }, orderBy: { skill: { name: 'asc' } } },
      experiences: { orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }] },
      educations: { orderBy: [{ endDate: 'desc' }] },
      _count: { select: { skills: true } },
    },
  });
  if (!row) return null;

  const experiences: ExperienceView[] = row.experiences.map((e) => ({
    title: e.title,
    companyName: e.companyName,
    companyIndustry: e.companyIndustry,
    locationName: e.locationName,
    startDate: e.startDate,
    endDate: e.endDate,
    isPrimary: e.isPrimary,
    isCurrent: e.isCurrent,
    summary: e.summary,
  }));
  const educations: EducationView[] = row.educations.map((e) => ({
    school: e.school,
    locationName: e.locationName,
    degrees: parseStringArray(e.degrees),
    majors: parseStringArray(e.majors),
    startDate: e.startDate,
    endDate: e.endDate,
  }));

  return {
    id: row.id,
    fullName: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender,
    jobTitle: row.jobTitle,
    jobTitleRole: row.jobTitleRole,
    jobTitleSubRole: row.jobTitleSubRole,
    jobTitleLevels: parseStringArray(row.jobTitleLevels),
    jobStartDate: row.jobStartDate,
    companyName: row.companyName,
    companyIndustry: row.companyIndustry,
    companySize: row.companySize,
    companyWebsite: row.companyWebsite,
    companyLinkedinUrl: row.companyLinkedinUrl,
    companyLocation: row.companyLocation,
    industry: row.industry,
    locationName: row.locationName,
    locality: row.locality,
    metro: row.metro,
    region: row.region,
    country: row.country,
    continent: row.continent,
    geo: row.geo,
    connections: row.connections,
    inferredYears: row.inferredYears,
    inferredSalary: row.inferredSalary,
    birthYear: row.birthYear,
    linkedinUrl: row.linkedinUrl,
    linkedinUsername: row.linkedinUsername,
    summary: row.summary,
    interests: parseStringArray(row.interestsJson),
    languages: parseJsonArray<LanguageJson>(row.languagesJson).map((l) => ({
      name: l.name ?? null,
      proficiency: l.proficiency ?? null,
    })),
    certifications: parseJsonArray<CertificationJson>(row.certificationsJson).map((c) => ({
      name: c.name ?? null,
      organization: c.organization ?? null,
    })),
    socialProfiles: parseJsonArray<SocialJson>(row.socialProfilesJson).map((s) => ({
      network: s.network ?? null,
      url: s.url ?? null,
      username: s.username ?? null,
    })),
    // Contact details stay out of the API: only how many the record holds.
    emailCount: parseJsonArray<unknown>(row.emailsJson).length,
    phoneCount: parseJsonArray<unknown>(row.phoneNumbersJson).length,
    skills: row.skills.map((s) => s.skill.name),
    skillCount: row._count.skills,
    experiences,
    educations,
    partial: row.partial,
    sourceLine: row.sourceLine,
  };
}

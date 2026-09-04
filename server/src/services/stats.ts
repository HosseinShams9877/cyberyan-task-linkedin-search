/**
 * Dashboard aggregates.
 *
 * Everything is computed with groupBy/count/aggregate so the work stays in the
 * database — no full table scan into Node — and the queries are identical on
 * SQLite and PostgreSQL.
 */
import { prisma } from '../lib/prisma';
import type { Bucket, StatsResponse } from '../types/api';
import { topSkills } from './search';

const CONNECTION_BANDS: { label: string; gte: number; lt?: number }[] = [
  { label: '0-99', gte: 0, lt: 100 },
  { label: '100-499', gte: 100, lt: 500 },
  { label: '500-999', gte: 500, lt: 1000 },
  { label: '1000-4999', gte: 1000, lt: 5000 },
  { label: '5000+', gte: 5000 },
];

/** Salary bands sort by their lower bound ("<20,000" before "20,000-25,000"). */
const bandValue = (label: string): number => {
  const first = /\d[\d,]*/.exec(label);
  const value = first ? Number(first[0].replace(/,/g, '')) : 0;
  return label.startsWith('<') ? value - 0.5 : value;
};

export async function getStats(): Promise<StatsResponse> {
  const [
    profiles,
    skills,
    companies,
    countries,
    withEmail,
    averages,
    byCountry,
    byIndustry,
    byRole,
    byCompany,
    bySalary,
    connectionBands,
    skillBuckets,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.skill.count(),
    prisma.profile.groupBy({ by: ['companyName'], where: { NOT: { companyName: null } } }),
    prisma.profile.groupBy({ by: ['country'], where: { NOT: { country: null } } }),
    prisma.profile.count({ where: { NOT: { emailsJson: null } } }),
    prisma.profile.aggregate({ _avg: { connections: true, inferredYears: true } }),
    prisma.profile.groupBy({
      by: ['country'],
      where: { NOT: { country: null } },
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    }),
    prisma.profile.groupBy({
      by: ['industry'],
      where: { NOT: { industry: null } },
      _count: { _all: true },
      orderBy: { _count: { industry: 'desc' } },
      take: 10,
    }),
    prisma.profile.groupBy({
      by: ['jobTitleRole'],
      where: { NOT: { jobTitleRole: null } },
      _count: { _all: true },
      orderBy: { _count: { jobTitleRole: 'desc' } },
      take: 10,
    }),
    prisma.profile.groupBy({
      by: ['companyName'],
      where: { NOT: { companyName: null } },
      _count: { _all: true },
      orderBy: { _count: { companyName: 'desc' } },
      take: 10,
    }),
    prisma.profile.groupBy({
      by: ['inferredSalary'],
      where: { NOT: { inferredSalary: null } },
      _count: { _all: true },
    }),
    Promise.all(
      CONNECTION_BANDS.map(async (band) => ({
        label: band.label,
        count: await prisma.profile.count({
          where: { connections: { gte: band.gte, ...(band.lt === undefined ? {} : { lt: band.lt }) } },
        }),
      })),
    ),
    topSkills(15),
  ]);

  const round = (value: number | null): number | null =>
    value === null ? null : Math.round(value * 10) / 10;

  const salaryBuckets: Bucket[] = bySalary
    .map((row) => ({ label: row.inferredSalary ?? '', count: row._count._all }))
    .sort((a, b) => bandValue(a.label) - bandValue(b.label));

  return {
    totals: {
      profiles,
      skills,
      companies: companies.length,
      countries: countries.length,
      withEmail,
      avgConnections: round(averages._avg.connections),
      avgYearsExperience: round(averages._avg.inferredYears),
    },
    byCountry: byCountry.map((row) => ({ label: row.country ?? '', count: row._count._all })),
    byIndustry: byIndustry.map((row) => ({ label: row.industry ?? '', count: row._count._all })),
    byRole: byRole.map((row) => ({ label: row.jobTitleRole ?? '', count: row._count._all })),
    byCompany: byCompany.map((row) => ({ label: row.companyName ?? '', count: row._count._all })),
    bySalaryBand: salaryBuckets,
    byConnectionBand: connectionBands.filter((band) => band.count > 0),
    topSkills: skillBuckets,
  };
}

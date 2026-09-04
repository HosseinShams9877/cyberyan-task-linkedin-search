/**
 * Seeds the database from the dataset in ./data.
 *
 * Idempotent by design: it does nothing when profiles already exist, because the
 * same script runs during the Vercel build (see scripts/postinstall.mjs) on every
 * deployment. Pass --force (or SEED_FORCE=1) to wipe and reload.
 */
import { PrismaClient } from '../src/generated/prisma';
import { buildSearchText, loadDataset } from '../src/ingest';
import type { ExtractedProfile } from '../src/ingest/extract';

const prisma = new PrismaClient();
const force = process.argv.includes('--force') || process.env.SEED_FORCE === '1';

/** JSON columns keep the source payloads verbatim; empty ones stay NULL. */
const json = (value: unknown[]): string | null => (value.length === 0 ? null : JSON.stringify(value));

function profileData(profile: ExtractedProfile, skillIds: number[]) {
  return {
    sourceId: profile.sourceId,
    sourceLine: profile.sourceLine,
    partial: profile.partial,
    fullName: profile.fullName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    linkedinUrl: profile.linkedinUrl,
    linkedinUsername: profile.linkedinUsername,
    linkedinId: profile.linkedinId,
    industry: profile.industry,
    summary: profile.summary,
    jobTitle: profile.jobTitle,
    jobTitleRole: profile.jobTitleRole,
    jobTitleSubRole: profile.jobTitleSubRole,
    jobTitleLevels: json(profile.jobTitleLevels),
    jobStartDate: profile.jobStartDate,
    jobSummary: profile.jobSummary,
    companyName: profile.companyName,
    companySize: profile.companySize,
    companyIndustry: profile.companyIndustry,
    companyWebsite: profile.companyWebsite,
    companyLinkedinUrl: profile.companyLinkedinUrl,
    companyFounded: profile.companyFounded,
    companyLocation: profile.companyLocation,
    locationName: profile.locationName,
    locality: profile.locality,
    metro: profile.metro,
    region: profile.region,
    country: profile.country,
    continent: profile.continent,
    geo: profile.geo,
    connections: profile.connections,
    inferredSalary: profile.inferredSalary,
    inferredYears: profile.inferredYears,
    birthYear: profile.birthYear,
    emailsJson: json(profile.emails),
    phoneNumbersJson: json(profile.phoneNumbers),
    interestsJson: json(profile.interests),
    languagesJson: json(profile.languages),
    certificationsJson: json(profile.certifications),
    socialProfilesJson: json(profile.socialProfiles),
    locationNamesJson: json(profile.locationNames),
    regionsJson: json(profile.regions),
    countriesJson: json(profile.countries),
    searchText: buildSearchText(profile),
    dataVersion: profile.dataVersion,
    skills: { create: skillIds.map((skillId) => ({ skillId })) },
    experiences: {
      create: profile.experiences.map((e) => ({
        title: e.title,
        titleRole: e.titleRole,
        titleLevels: json(e.titleLevels),
        companyName: e.companyName,
        companySize: e.companySize,
        companyIndustry: e.companyIndustry,
        companyWebsite: e.companyWebsite,
        locationName: e.locationName,
        startDate: e.startDate,
        endDate: e.endDate,
        isPrimary: e.isPrimary,
        isCurrent: e.isCurrent,
        summary: e.summary,
      })),
    },
    educations: {
      create: profile.educations.map((e) => ({
        school: e.school,
        schoolType: e.schoolType,
        locationName: e.locationName,
        degrees: json(e.degrees),
        majors: json(e.majors),
        minors: json(e.minors),
        gpa: e.gpa,
        startDate: e.startDate,
        endDate: e.endDate,
      })),
    },
  };
}

async function main(): Promise<void> {
  const existing = await prisma.profile.count();
  if (existing > 0 && !force) {
    console.log(`seed: ${existing} profiles already present, nothing to do (use --force to reload)`);
    return;
  }
  if (existing > 0) {
    console.log(`seed: --force, deleting ${existing} profiles`);
    // Profile children cascade; skills are shared, so clear the join table first.
    await prisma.profileSkill.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.skill.deleteMany();
  }

  const { file, profiles, stats } = loadDataset();
  console.log(`seed: ${file}`);
  console.log(`seed: ${stats.rows} dataset rows -> ${profiles.length} unique profiles`);

  const names = [...new Set(profiles.flatMap((p) => p.skills))].sort();
  // Names are already unique and the table is empty here, so no skipDuplicates
  // (which Prisma does not support on SQLite).
  for (let i = 0; i < names.length; i += 500) {
    await prisma.skill.createMany({ data: names.slice(i, i + 500).map((name) => ({ name })) });
  }
  const skills = await prisma.skill.findMany({ select: { id: true, name: true } });
  const skillId = new Map(skills.map((s) => [s.name, s.id]));
  console.log(`seed: ${skills.length} distinct skills`);

  const CHUNK = 25;
  for (let i = 0; i < profiles.length; i += CHUNK) {
    const chunk = profiles.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map((profile) => {
        const ids = [...new Set(profile.skills.map((s) => skillId.get(s)).filter((v): v is number => !!v))];
        return prisma.profile.create({ data: profileData(profile, ids), select: { id: true } });
      }),
    );
    process.stdout.write(`\rseed: ${Math.min(i + CHUNK, profiles.length)}/${profiles.length} profiles`);
  }

  const [count, experiences, educations] = await Promise.all([
    prisma.profile.count(),
    prisma.experience.count(),
    prisma.education.count(),
  ]);
  console.log(`\nseed: done - ${count} profiles, ${experiences} experiences, ${educations} educations`);
}

main()
  .catch((error) => {
    console.error('seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

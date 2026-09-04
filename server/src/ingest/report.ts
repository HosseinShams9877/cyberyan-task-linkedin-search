/**
 * `npm run ingest:report` — parse the dataset without touching the database.
 *
 * Useful when the dump changes: it prints how many records were recovered and
 * how well each field is populated, so a regression in the content-driven
 * extraction is visible immediately.
 */
import { loadDataset, type ExtractedProfile } from './index';

const FIELDS: (keyof ExtractedProfile)[] = [
  'fullName',
  'firstName',
  'gender',
  'linkedinUrl',
  'linkedinId',
  'industry',
  'summary',
  'jobTitle',
  'jobTitleRole',
  'jobStartDate',
  'companyName',
  'companySize',
  'companyIndustry',
  'locationName',
  'locality',
  'metro',
  'region',
  'country',
  'geo',
  'connections',
  'inferredSalary',
  'inferredYears',
  'birthYear',
  'skills',
  'interests',
  'emails',
  'phoneNumbers',
  'languages',
  'certifications',
  'socialProfiles',
  'experiences',
  'educations',
];

const filled = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';

function main(): void {
  const { file, profiles, stats } = loadDataset();
  console.log(`dataset: ${file}`);
  console.log(stats);
  console.log('\nfield coverage:');
  const total = profiles.length;
  for (const field of FIELDS) {
    const n = profiles.filter((p) => filled(p[field])).length;
    const pct = total ? Math.round((n / total) * 100) : 0;
    console.log(`  ${field.padEnd(16)} ${String(n).padStart(4)}/${total}  ${String(pct).padStart(3)}%`);
  }
  const partial = profiles.filter((p) => p.partial).length;
  console.log(`\npartial (truncated or headless) records: ${partial}`);
  console.log('sample:', JSON.stringify(profiles[0], null, 2).slice(0, 1200));
}

main();

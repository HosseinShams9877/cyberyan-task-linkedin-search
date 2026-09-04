/**
 * Dataset entry point: locate the dump, read it, extract profiles.
 *
 * The file name is only known by pattern ("300 user linkedin", extension may be
 * .txt/.csv/none), so it is discovered rather than hard-coded. `DATASET_FILE`
 * or `DATA_DIR` override the lookup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readDumpRecords } from './profiles-reader';
import { extractProfiles, type ExtractedProfile, type ExtractStats } from './extract';

export * from './extract';
export { readDumpRecords, splitCsvLine } from './profiles-reader';

const DATASET_NAME = /300\s*user\s*linkedin/i;

export const defaultDataDir = (): string =>
  process.env['DATA_DIR']
    ? path.resolve(process.env['DATA_DIR'])
    : path.resolve(__dirname, '..', '..', '..', 'data');

export function findDatasetFile(dir: string = defaultDataDir()): string | null {
  const configured = process.env['DATASET_FILE'];
  if (configured) return fs.existsSync(configured) ? path.resolve(configured) : null;
  if (!fs.existsSync(dir)) return null;
  const match = fs
    .readdirSync(dir)
    .filter((f) => DATASET_NAME.test(f))
    .sort((a, b) => b.length - a.length)[0];
  return match ? path.join(dir, match) : null;
}

export interface DatasetLoad {
  file: string;
  profiles: ExtractedProfile[];
  stats: ExtractStats & { skippedLines: number; repeatedHeaders: number; columns: number };
}

export function loadDataset(file?: string): DatasetLoad {
  const resolved = file ?? findDatasetFile();
  if (!resolved) {
    throw new Error(
      `Dataset not found. Put the dump in ${defaultDataDir()} (a file named like "300 user linkedin.txt") ` +
        'or set DATASET_FILE to its path.',
    );
  }

  const text = fs.readFileSync(resolved, 'utf8');
  const dump = readDumpRecords(text);
  const { profiles, stats } = extractProfiles(dump.records);

  return {
    file: resolved,
    profiles,
    stats: {
      ...stats,
      skippedLines: dump.skipped,
      repeatedHeaders: dump.repeatedHeaders,
      columns: dump.header.length,
    },
  };
}

/** Lowercased haystack for the case-insensitive `contains` search (SQLite has no ILIKE). */
export function buildSearchText(profile: ExtractedProfile): string {
  const parts: (string | null)[] = [
    profile.fullName,
    profile.firstName,
    profile.lastName,
    profile.linkedinUsername,
    profile.jobTitle,
    profile.jobTitleRole,
    profile.jobTitleSubRole,
    profile.companyName,
    profile.companyIndustry,
    profile.industry,
    profile.locationName,
    profile.metro,
    profile.summary,
    ...profile.skills,
    ...profile.interests,
    ...profile.jobTitleLevels,
    ...profile.experiences.flatMap((e) => [e.title, e.companyName]),
    ...profile.educations.flatMap((e) => [e.school, ...e.degrees, ...e.majors]),
  ];
  return parts
    .filter((p): p is string => !!p && p.trim() !== '')
    .join(' | ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 8000);
}

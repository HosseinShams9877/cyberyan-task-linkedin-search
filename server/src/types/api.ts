/**
 * Response contracts for the HTTP API.
 *
 * The client keeps a copy of this file (client/src/lib/api-types.ts); the two are
 * intentionally duplicated instead of shared through a workspace package, because
 * Vercel installs client/ and server/ as independent entrypoints.
 */

export interface ProfileSummary {
  id: number;
  fullName: string;
  jobTitle: string | null;
  jobTitleRole: string | null;
  companyName: string | null;
  companyIndustry: string | null;
  industry: string | null;
  locationName: string | null;
  country: string | null;
  connections: number | null;
  inferredYears: number | null;
  inferredSalary: string | null;
  linkedinUrl: string;
  summary: string | null;
  skills: string[];
  skillCount: number;
}

export interface SearchResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tookMs: number;
  query: {
    keyword: string | null;
    jobTitle: string | null;
    skill: string | null;
    industry: string | null;
    country: string | null;
    company: string | null;
    minConnections: number | null;
    minYears: number | null;
    hasEmail: boolean | null;
    sort: string;
  };
  results: ProfileSummary[];
}

export interface ExperienceView {
  title: string | null;
  companyName: string | null;
  companyIndustry: string | null;
  locationName: string | null;
  startDate: string | null;
  endDate: string | null;
  isPrimary: boolean;
  isCurrent: boolean;
  summary: string | null;
}

export interface EducationView {
  school: string | null;
  locationName: string | null;
  degrees: string[];
  majors: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface ProfileDetail extends ProfileSummary {
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  linkedinUsername: string | null;
  jobStartDate: string | null;
  jobTitleSubRole: string | null;
  jobTitleLevels: string[];
  companySize: string | null;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  companyLocation: string | null;
  locality: string | null;
  metro: string | null;
  region: string | null;
  continent: string | null;
  geo: string | null;
  birthYear: number | null;
  interests: string[];
  languages: { name: string | null; proficiency: string | null }[];
  certifications: { name: string | null; organization: string | null }[];
  socialProfiles: { network: string | null; url: string | null; username: string | null }[];
  emailCount: number;
  phoneCount: number;
  experiences: ExperienceView[];
  educations: EducationView[];
  partial: boolean;
  sourceLine: number | null;
}

export interface Bucket {
  label: string;
  count: number;
}

export interface StatsResponse {
  totals: {
    profiles: number;
    skills: number;
    companies: number;
    countries: number;
    withEmail: number;
    avgConnections: number | null;
    avgYearsExperience: number | null;
  };
  byCountry: Bucket[];
  byIndustry: Bucket[];
  byRole: Bucket[];
  byCompany: Bucket[];
  bySalaryBand: Bucket[];
  byConnectionBand: Bucket[];
  topSkills: Bucket[];
}

export interface FiltersResponse {
  jobTitles: Bucket[];
  skills: Bucket[];
  industries: Bucket[];
  countries: Bucket[];
  roles: Bucket[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

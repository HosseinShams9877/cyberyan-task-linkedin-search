import { useEffect } from 'react';
import type { ProfileDetail } from '../lib/api-types';
import {
  formatMonth,
  formatNumber,
  formatRange,
  formatSalary,
  humanize,
  initials,
  titleCase,
} from '../lib/format';
import { useSearchStore } from '../store/useSearchStore';
import Spinner from './Spinner';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line/60 px-5 py-4">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  const present = rows.filter(([, value]) => value !== '' && value !== '-');
  if (present.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {present.map(([label, value]) => (
        <div key={label} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted">{label}</dt>
          <dd className="break-words text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Body({ profile }: { profile: ProfileDetail }) {
  const salary = formatSalary(profile.inferredSalary);
  return (
    <>
      {profile.summary ? (
        <Section title="Summary">
          <p className="text-sm leading-relaxed text-slate-300">{profile.summary}</p>
        </Section>
      ) : null}

      <Section title="Profile">
        <Facts
          rows={[
            ['Role', humanize(profile.jobTitleRole)],
            ['Speciality', humanize(profile.jobTitleSubRole)],
            ['Seniority', profile.jobTitleLevels.map(humanize).join(', ')],
            ['Industry', titleCase(profile.industry)],
            ['Started', formatMonth(profile.jobStartDate, '')],
            ['Experience', profile.inferredYears === null ? '' : `${profile.inferredYears} years`],
            ['Salary band', salary],
            ['Connections', formatNumber(profile.connections)],
            ['Location', titleCase(profile.locationName)],
            ['Region', titleCase(profile.region)],
            ['Country', titleCase(profile.country)],
            ['Birth year', profile.birthYear === null ? '' : String(profile.birthYear)],
            ['Gender', titleCase(profile.gender)],
          ]}
        />
      </Section>

      {profile.companyName ? (
        <Section title="Current company">
          <Facts
            rows={[
              ['Name', titleCase(profile.companyName)],
              ['Industry', titleCase(profile.companyIndustry)],
              ['Size', profile.companySize ?? ''],
              ['Location', titleCase(profile.companyLocation)],
              ['Website', profile.companyWebsite ?? ''],
            ]}
          />
        </Section>
      ) : null}

      {profile.experiences.length > 0 ? (
        <Section title={`Experience (${profile.experiences.length})`}>
          <ol className="space-y-3">
            {profile.experiences.map((job, index) => (
              <li key={index} className="border-l-2 border-line pl-3">
                <p className="text-sm font-medium text-slate-100">
                  {titleCase(job.title) || 'Role not recorded'}
                  {job.isCurrent ? <span className="chip ml-2 align-middle">Current</span> : null}
                </p>
                {job.companyName ? (
                  <p className="text-sm text-slate-300">{titleCase(job.companyName)}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {[formatRange(job.startDate, job.endDate), titleCase(job.locationName)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {job.summary ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{job.summary}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {profile.educations.length > 0 ? (
        <Section title={`Education (${profile.educations.length})`}>
          <ol className="space-y-3">
            {profile.educations.map((school, index) => (
              <li key={index} className="border-l-2 border-line pl-3">
                <p className="text-sm font-medium text-slate-100">
                  {titleCase(school.school) || 'School not recorded'}
                </p>
                <p className="text-sm text-slate-300">
                  {[...school.degrees, ...school.majors].map(titleCase).join(', ')}
                </p>
                <p className="text-xs text-muted">{formatRange(school.startDate, school.endDate)}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {profile.skills.length > 0 ? (
        <Section title={`Skills (${profile.skillCount})`}>
          <ul className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <li key={skill} className="chip">
                {titleCase(skill)}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {profile.languages.length > 0 || profile.certifications.length > 0 || profile.interests.length > 0 ? (
        <Section title="Also on file">
          <Facts
            rows={[
              ['Languages', profile.languages.map((l) => titleCase(l.name)).join(', ')],
              ['Certifications', profile.certifications.map((c) => titleCase(c.name)).join(', ')],
              ['Interests', profile.interests.map(titleCase).join(', ')],
            ]}
          />
        </Section>
      ) : null}

      <Section title="Contact">
        {/*
          Counts only. The dataset holds real email addresses and phone numbers, and
          the API deliberately never returns them, so there is nothing to render here.
        */}
        <Facts
          rows={[
            ['Email addresses', profile.emailCount > 0 ? `${profile.emailCount} on file` : 'None on file'],
            ['Phone numbers', profile.phoneCount > 0 ? `${profile.phoneCount} on file` : 'None on file'],
          ]}
        />
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {profile.socialProfiles
            .filter((social) => social.url)
            .map((social) => (
              <li key={`${social.network}-${social.url}`}>
                <a
                  className="chip hover:border-brand/60 hover:text-brand"
                  href={social.url ?? undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {titleCase(social.network) || 'Link'}
                </a>
              </li>
            ))}
        </ul>
      </Section>

      {profile.partial ? (
        <Section title="Data quality">
          <p className="text-sm text-amber-300/90">
            This record was reconstructed from a partially malformed row in the source file, so some
            fields may be missing.
          </p>
        </Section>
      ) : null}
    </>
  );
}

/** Slide-over holding the full profile record. Escape closes it; the page behind is locked. */
export default function ProfileDrawer() {
  const detail = useSearchStore((s) => s.detail);
  const loading = useSearchStore((s) => s.detailLoading);
  const error = useSearchStore((s) => s.detailError);
  const close = useSearchStore((s) => s.closeProfile);
  const open = loading || error !== null || detail !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  if (!open) return null;
  const name = detail ? titleCase(detail.fullName) : 'Profile';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${name} profile`}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-canvas shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line/60 bg-canvas/95 px-5 py-4 backdrop-blur">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-strong/25 text-sm font-semibold text-brand"
            aria-hidden="true"
          >
            {detail ? initials(name) : '--'}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-50">{name}</h2>
            <p className="truncate text-sm text-slate-300">{titleCase(detail?.jobTitle)}</p>
            {detail ? (
              <a
                className="mt-1 inline-flex text-xs text-brand hover:underline"
                href={detail.linkedinUrl.startsWith('http') ? detail.linkedinUrl : `https://${detail.linkedinUrl}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {detail.linkedinUrl}
              </a>
            ) : null}
          </div>
          <button type="button" className="btn-ghost shrink-0 px-2.5" onClick={close} aria-label="Close profile">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <Spinner className="h-5 w-5 text-brand" />
            Loading profile...
          </div>
        ) : null}
        {error ? (
          <div className="m-5 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm" role="alert">
            <p className="font-medium text-red-300">Could not load this profile</p>
            <p className="mt-1 text-slate-300">{error}</p>
          </div>
        ) : null}
        {detail ? <Body profile={detail} /> : null}
      </aside>
    </div>
  );
}

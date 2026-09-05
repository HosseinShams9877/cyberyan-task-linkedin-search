import { useEffect } from 'react';
import { usePrefs, useT } from '../i18n';
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
          <dd className="break-words text-ink-body">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Body({ profile }: { profile: ProfileDetail }) {
  const t = useT();
  const salary = formatSalary(profile.inferredSalary);
  const present = t('value.present');
  return (
    <>
      {profile.summary ? (
        <Section title={t('section.summary')}>
          {/*
            Profile prose is English, from the dataset - so it keeps LTR even on a
            Persian page, or its punctuation lands on the wrong end of each line.
          */}
          <p className="text-sm leading-relaxed text-ink-body" dir="ltr">
            {profile.summary}
          </p>
        </Section>
      ) : null}

      <Section title={t('section.profile')}>
        <Facts
          rows={[
            [t('fact.role'), humanize(profile.jobTitleRole)],
            [t('fact.speciality'), humanize(profile.jobTitleSubRole)],
            [t('fact.seniority'), profile.jobTitleLevels.map(humanize).join(', ')],
            [t('fact.industry'), titleCase(profile.industry)],
            [t('fact.started'), formatMonth(profile.jobStartDate, '')],
            [
              t('fact.experience'),
              profile.inferredYears === null
                ? ''
                : t('value.years', { years: formatNumber(profile.inferredYears) }),
            ],
            [t('fact.salaryBand'), salary],
            [t('fact.connections'), formatNumber(profile.connections)],
            [t('fact.location'), titleCase(profile.locationName)],
            [t('fact.region'), titleCase(profile.region)],
            [t('fact.country'), titleCase(profile.country)],
            [t('fact.birthYear'), profile.birthYear === null ? '' : formatNumber(profile.birthYear)],
            [t('fact.gender'), titleCase(profile.gender)],
          ]}
        />
      </Section>

      {profile.companyName ? (
        <Section title={t('section.currentCompany')}>
          <Facts
            rows={[
              [t('fact.name'), titleCase(profile.companyName)],
              [t('fact.industry'), titleCase(profile.companyIndustry)],
              [t('fact.size'), profile.companySize ?? ''],
              [t('fact.location'), titleCase(profile.companyLocation)],
              [t('fact.website'), profile.companyWebsite ?? ''],
            ]}
          />
        </Section>
      ) : null}

      {profile.experiences.length > 0 ? (
        <Section title={t('section.experience', { count: formatNumber(profile.experiences.length) })}>
          <ol className="space-y-3">
            {profile.experiences.map((job, index) => (
              <li key={index} className="border-s-2 border-line ps-3">
                <p className="text-sm font-medium text-ink">
                  {titleCase(job.title) || t('value.roleNotRecorded')}
                  {job.isCurrent ? <span className="chip ms-2 align-middle">{t('badge.current')}</span> : null}
                </p>
                {job.companyName ? (
                  <p className="text-sm text-ink-body">{titleCase(job.companyName)}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {[formatRange(job.startDate, job.endDate, present), titleCase(job.locationName)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {job.summary ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted" dir="ltr">
                    {job.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {profile.educations.length > 0 ? (
        <Section title={t('section.education', { count: formatNumber(profile.educations.length) })}>
          <ol className="space-y-3">
            {profile.educations.map((school, index) => (
              <li key={index} className="border-s-2 border-line ps-3">
                <p className="text-sm font-medium text-ink">
                  {titleCase(school.school) || t('value.schoolNotRecorded')}
                </p>
                <p className="text-sm text-ink-body">
                  {[...school.degrees, ...school.majors].map(titleCase).join(', ')}
                </p>
                <p className="text-xs text-muted">{formatRange(school.startDate, school.endDate, present)}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {profile.skills.length > 0 ? (
        <Section title={t('section.skills', { count: formatNumber(profile.skillCount) })}>
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
        <Section title={t('section.alsoOnFile')}>
          <Facts
            rows={[
              [t('fact.languages'), profile.languages.map((l) => titleCase(l.name)).join(', ')],
              [t('fact.certifications'), profile.certifications.map((c) => titleCase(c.name)).join(', ')],
              [t('fact.interests'), profile.interests.map(titleCase).join(', ')],
            ]}
          />
        </Section>
      ) : null}

      <Section title={t('section.contact')}>
        {/*
          Counts only. The dataset holds real email addresses and phone numbers, and
          the API deliberately never returns them, so there is nothing to render here.
        */}
        <Facts
          rows={[
            [
              t('fact.emails'),
              profile.emailCount > 0
                ? t('value.onFile', { count: formatNumber(profile.emailCount) })
                : t('value.noneOnFile'),
            ],
            [
              t('fact.phones'),
              profile.phoneCount > 0
                ? t('value.onFile', { count: formatNumber(profile.phoneCount) })
                : t('value.noneOnFile'),
            ],
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
                  {titleCase(social.network) || t('value.link')}
                </a>
              </li>
            ))}
        </ul>
      </Section>

      {profile.partial ? (
        <Section title={t('section.dataQuality')}>
          <p className="text-sm text-warn">{t('drawer.partialWarning')}</p>
        </Section>
      ) : null}
    </>
  );
}

/** Slide-over holding the full profile record. Escape closes it; the page behind is locked. */
export default function ProfileDrawer() {
  const { t, dir } = usePrefs();
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
  const name = detail ? titleCase(detail.fullName) : t('drawer.fallbackName');

  return (
    // `justify-end` is logical in flexbox, so the panel slides in from the trailing
    // edge - right in English, left in Persian - and its border follows with `border-s`.
    <div className="fixed inset-0 z-50 flex justify-end" dir={dir}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('drawer.profileAria', { name })}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-s border-line bg-canvas shadow-2xl"
      >
        <header className="pane sticky top-0 z-10 flex items-start gap-3 border-b px-5 py-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand"
            aria-hidden="true"
          >
            {detail ? initials(name) : '--'}
          </span>
          <div className="min-w-0 flex-1">
            {/* Own direction per line, so a clipped English value loses its tail, not its head. */}
            <h2 dir="auto" className="truncate text-lg font-semibold text-ink rtl:text-right">{name}</h2>
            <p dir="auto" className="truncate text-sm text-ink-body rtl:text-right">{titleCase(detail?.jobTitle)}</p>
            {detail ? (
              <a
                className="mt-1 inline-flex text-xs text-brand hover:underline"
                href={detail.linkedinUrl.startsWith('http') ? detail.linkedinUrl : `https://${detail.linkedinUrl}`}
                target="_blank"
                rel="noreferrer noopener"
                dir="ltr"
              >
                {detail.linkedinUrl}
              </a>
            ) : null}
          </div>
          <button type="button" className="btn-ghost shrink-0 px-2.5" onClick={close} aria-label={t('drawer.close')}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <Spinner className="h-5 w-5 text-brand" />
            {t('drawer.loading')}
          </div>
        ) : null}
        {error ? (
          <div className="notice m-5 p-4 text-sm" role="alert">
            <p className="font-medium text-danger">{t('drawer.errorTitle')}</p>
            <p className="mt-1 text-ink-soft">{error}</p>
          </div>
        ) : null}
        {detail ? <Body profile={detail} /> : null}
      </aside>
    </div>
  );
}

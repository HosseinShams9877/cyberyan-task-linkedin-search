import type { ProfileSummary } from '../lib/api-types';
import { formatNumber, humanize, initials, titleCase } from '../lib/format';

/** Chips that fit on a card without pushing the skill row past two lines. */
const CHIP_LIMIT = 5;

/**
 * A profile's skills arrive alphabetically, so the first five are a poor sample:
 * filter by "leadership" and every card leads with "Afghanistan, Air Force, Army..."
 * while the skill that actually produced the hit hides behind "+45 more".
 *
 * So each search term promotes one chip to the front, tinted: the shortest match, so
 * "Leadership" wins over "Corporate Leadership", and a term already represented does
 * not claim a second slot. The remaining chips keep the alphabetical sample, which
 * stops a "leadership" search from filling every row with variants of one word.
 */
function pickSkills(skills: string[], terms: string[]) {
  const matched = new Set<string>();
  for (const term of terms) {
    let best: string | undefined;
    for (const skill of skills) {
      if (!skill.includes(term) || matched.has(skill)) continue;
      if (best === undefined || skill.length < best.length) best = skill;
    }
    if (best !== undefined) matched.add(best);
  }
  const shown = [...matched, ...skills.filter((s) => !matched.has(s))].slice(0, CHIP_LIMIT);
  return { shown, matched };
}

/** One search hit. The whole card is a button so keyboard users get a single stop. */
export default function ResultCard({
  profile,
  matchTerms,
  onOpen,
}: {
  profile: ProfileSummary;
  /** Lowercased needles from the query behind this page - see pickSkills. */
  matchTerms: string[];
  onOpen: (id: number) => void;
}) {
  const name = titleCase(profile.fullName);
  const location = titleCase(profile.locationName ?? profile.country);
  const { shown, matched } = pickSkills(profile.skills, matchTerms);

  return (
    <article className="card transition-colors hover:border-brand/60">
      <button
        type="button"
        className="w-full p-4 text-left"
        onClick={() => onOpen(profile.id)}
        aria-label={`Open profile for ${name}`}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-strong/25 text-sm font-semibold text-brand"
            aria-hidden="true"
          >
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-50">{name}</h3>
            <p className="truncate text-sm text-slate-300">{titleCase(profile.jobTitle) || 'Job title unknown'}</p>
            {profile.companyName ? (
              <p className="truncate text-sm text-muted">{titleCase(profile.companyName)}</p>
            ) : null}
          </div>
          {profile.connections !== null ? (
            <span className="shrink-0 text-right text-xs text-muted">
              {formatNumber(profile.connections)}
              <span className="block">connections</span>
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
          {location ? (
            <div className="col-span-2 truncate">
              <dt className="sr-only">Location</dt>
              <dd className="truncate">{location}</dd>
            </div>
          ) : null}
          {profile.jobTitleRole ? (
            <div className="truncate">
              <dt className="sr-only">Role</dt>
              <dd className="truncate">{humanize(profile.jobTitleRole)}</dd>
            </div>
          ) : null}
          {profile.inferredYears !== null ? (
            <div className="truncate">
              <dt className="sr-only">Experience</dt>
              <dd>{profile.inferredYears} yrs experience</dd>
            </div>
          ) : null}
        </dl>

        {profile.skills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {shown.map((skill) => (
              <li key={skill} className={matched.has(skill) ? 'chip chip-match' : 'chip'}>
                {titleCase(skill)}
                {matched.has(skill) ? <span className="sr-only"> (matches your search)</span> : null}
              </li>
            ))}
            {profile.skillCount > shown.length ? (
              <li className="chip border-dashed text-muted">+{profile.skillCount - shown.length} more</li>
            ) : null}
          </ul>
        ) : null}
      </button>
    </article>
  );
}

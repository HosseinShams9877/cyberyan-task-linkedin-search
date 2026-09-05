import { useT } from '../i18n';
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
  const t = useT();
  const name = titleCase(profile.fullName);
  const location = titleCase(profile.locationName ?? profile.country);
  const { shown, matched } = pickSkills(profile.skills, matchTerms);

  return (
    <article className="card transition-colors hover:border-brand/60">
      <button
        type="button"
        className="w-full p-4 text-start"
        onClick={() => onOpen(profile.id)}
        aria-label={t('card.open', { name })}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand"
            aria-hidden="true"
          >
            {initials(name)}
          </span>
          {/*
            Dataset values are English on a Persian page, so each line resolves its own
            direction and `truncate` clips the end of the string. Left to inherit the
            page's, an English line loses its head instead: "Vice President, Military
            and Civili…" comes out as "…ry and Civilian Debt Acquisition and Relief".
            The alignment is set back to the page direction, so the line still starts at
            the card's start edge next to the avatar.
          */}
          <div className="min-w-0 flex-1">
            <h3 dir="auto" className="truncate font-semibold text-ink rtl:text-right">{name}</h3>
            <p dir="auto" className="truncate text-sm text-ink-body rtl:text-right">
              {titleCase(profile.jobTitle) || t('card.noJobTitle')}
            </p>
            {profile.companyName ? (
              <p dir="auto" className="truncate text-sm text-muted rtl:text-right">{titleCase(profile.companyName)}</p>
            ) : null}
          </div>
          {profile.connections !== null ? (
            <span className="shrink-0 text-end text-xs text-muted">
              <span className="tabular-nums">{formatNumber(profile.connections)}</span>
              <span className="block">{t('card.connections')}</span>
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
          {location ? (
            <div className="col-span-2 truncate">
              <dt className="sr-only">{t('card.location')}</dt>
              <dd dir="auto" className="truncate rtl:text-right">{location}</dd>
            </div>
          ) : null}
          {profile.jobTitleRole ? (
            <div className="truncate">
              <dt className="sr-only">{t('card.role')}</dt>
              <dd dir="auto" className="truncate rtl:text-right">{humanize(profile.jobTitleRole)}</dd>
            </div>
          ) : null}
          {profile.inferredYears !== null ? (
            <div className="truncate">
              <dt className="sr-only">{t('card.experience')}</dt>
              <dd>{t('card.yearsExperience', { years: formatNumber(profile.inferredYears) })}</dd>
            </div>
          ) : null}
        </dl>

        {profile.skills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {shown.map((skill) => (
              <li key={skill} className={matched.has(skill) ? 'chip chip-match' : 'chip'}>
                {titleCase(skill)}
                {matched.has(skill) ? <span className="sr-only">{t('card.matchesSearch')}</span> : null}
              </li>
            ))}
            {profile.skillCount > shown.length ? (
              <li className="chip border-dashed text-muted">
                {t('card.moreSkills', { count: formatNumber(profile.skillCount - shown.length) })}
              </li>
            ) : null}
          </ul>
        ) : null}
      </button>
    </article>
  );
}

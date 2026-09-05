import { useMemo } from 'react';
import { useT } from '../i18n';
import { formatNumber } from '../lib/format';
import { useSearchStore } from '../store/useSearchStore';
import Pagination from './Pagination';
import ResultCard from './ResultCard';
import Spinner from './Spinner';

export default function ResultList() {
  const t = useT();
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const openProfile = useSearchStore((s) => s.openProfile);
  const resetFilters = useSearchStore((s) => s.resetFilters);

  // Needles for the skill chips. Taken from the echoed query so they describe the
  // page on screen, not a filter typed while the previous page is still showing.
  const matchTerms = useMemo(() => {
    if (!results) return [];
    const raw = [results.query.skill ?? '', ...(results.query.keyword ?? '').split(/[\s,]+/)];
    return [...new Set(raw.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3))];
  }, [results]);

  if (error) {
    return (
      <div className="notice p-6 text-sm" role="alert">
        <p className="font-medium text-danger">{t('results.errorTitle')}</p>
        <p className="mt-1 text-ink-soft">{error}</p>
      </div>
    );
  }

  // First load only: afterwards the previous page is held at reduced opacity so the
  // layout never jumps and the reader keeps their place.
  if (!results) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-sm text-muted">
        <Spinner className="h-5 w-5 text-brand" />
        {t('results.loading')}
      </div>
    );
  }

  if (results.results.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-medium text-ink">{t('results.emptyTitle')}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{t('results.emptyHint')}</p>
        <button type="button" className="btn-ghost mt-4" onClick={resetFilters}>
          {t('results.clearAll')}
        </button>
      </div>
    );
  }

  return (
    <section aria-label={t('results.aria')} className="space-y-4">
      <p className="text-sm text-muted" aria-live="polite">
        {/*
          Two keys rather than a plural rule: English needs one/other and Persian needs
          neither, so the catalogue carries both forms and the caller picks.
        */}
        {t(results.total === 1 ? 'results.foundOne' : 'results.foundMany', {
          count: formatNumber(results.total),
        })}
        <span className="text-muted/70">
          {' · '}
          {t('results.took', { ms: formatNumber(results.tookMs) })}
        </span>
      </p>

      {/*
        The only box on the page allowed to scroll sideways. A card's lines are
        `truncate`d, so `white-space: nowrap` gives them a min-content width in the
        hundreds of pixels; below the 18rem track floor the row outgrows a phone and
        that scroll stays here instead of dragging the sticky header with it.

        The tracks are spelled out rather than left to `grid-cols-1/2/3`, because a
        numeric count compiles to `minmax(0, 1fr)` - a floor of zero, which squeezes a
        card until its own content forces the overflow back onto the page.
      */}
      <div className="overflow-x-auto">
        <div
          className={`grid gap-3 transition-opacity grid-cols-[repeat(1,minmax(18rem,1fr))] sm:grid-cols-[repeat(2,minmax(18rem,1fr))] xl:grid-cols-[repeat(3,minmax(18rem,1fr))] ${
            loading ? 'opacity-60' : ''
          }`}
        >
          {results.results.map((profile) => (
            <ResultCard key={profile.id} profile={profile} matchTerms={matchTerms} onOpen={openProfile} />
          ))}
        </div>
      </div>

      <Pagination />
    </section>
  );
}

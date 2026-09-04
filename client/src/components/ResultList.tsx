import { useMemo } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { formatCount } from '../lib/format';
import Pagination from './Pagination';
import ResultCard from './ResultCard';
import Spinner from './Spinner';

export default function ResultList() {
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const openProfile = useSearchStore((s) => s.openProfile);
  const resetFilters = useSearchStore((s) => s.resetFilters);

  // Needles for the skill chips. Taken from the echoed query so they describe the
  // page on screen, not a filter typed while the previous page is still showing.
  const matchTerms = useMemo(() => {
    if (!results) return [];
    const raw = [results.query.skill ?? '', ...(results.query.keyword ?? '').split(/[s,]+/)];
    return [...new Set(raw.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3))];
  }, [results]);

  if (error) {
    return (
      <div className="card border-red-500/40 bg-red-500/5 p-6 text-sm" role="alert">
        <p className="font-medium text-red-300">Search failed</p>
        <p className="mt-1 text-slate-300">{error}</p>
      </div>
    );
  }

  // First load only: afterwards the previous page is held at reduced opacity so the
  // layout never jumps and the reader keeps their place.
  if (!results) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12 text-sm text-muted">
        <Spinner className="h-5 w-5 text-brand" />
        Loading profiles...
      </div>
    );
  }

  if (results.results.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-medium text-slate-100">No profiles match these filters</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Try a shorter keyword, or clear a filter to widen the search.
        </p>
        <button type="button" className="btn-ghost mt-4" onClick={resetFilters}>
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Search results" className="space-y-4">
      <p className="text-sm text-muted" aria-live="polite">
        {formatCount(results.total, 'profile')} found
        <span className="text-muted/70"> &middot; {results.tookMs} ms</span>
      </p>

      <div
        className={`grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
      >
        {results.results.map((profile) => (
          <ResultCard key={profile.id} profile={profile} matchTerms={matchTerms} onOpen={openProfile} />
        ))}
      </div>

      <Pagination />
    </section>
  );
}

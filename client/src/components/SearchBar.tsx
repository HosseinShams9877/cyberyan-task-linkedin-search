import { useSearchStore } from '../store/useSearchStore';
import Spinner from './Spinner';

/** Keyword box. Typing is debounced in the store, so there is no submit button. */
export default function SearchBar() {
  const keyword = useSearchStore((s) => s.filters.keyword);
  const loading = useSearchStore((s) => s.loading);
  const setFilter = useSearchStore((s) => s.setFilter);

  return (
    <div className="relative">
      <label htmlFor="keyword" className="sr-only">
        Search profiles
      </label>
      <svg
        className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id="keyword"
        type="search"
        className="field py-3 pr-11 pl-11 text-base"
        placeholder="Search by name, job title, company or skill"
        value={keyword}
        autoComplete="off"
        onChange={(event) => setFilter('keyword', event.target.value)}
      />
      {loading ? (
        <Spinner className="absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2 text-brand" />
      ) : null}
    </div>
  );
}

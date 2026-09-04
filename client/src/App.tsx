import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import FilterSelect from './components/FilterSelect';
import ProfileDrawer from './components/ProfileDrawer';
import ResultList from './components/ResultList';
import SearchBar from './components/SearchBar';
import { titleCase } from './lib/format';
import { activeFilterCount, useSearchStore, type SortKey } from './store/useSearchStore';

type Tab = 'search' | 'dashboard';

/** The view lives in the URL hash, so a dashboard link survives a refresh and back/forward. */
const tabFromHash = (): Tab => (window.location.hash === '#dashboard' ? 'dashboard' : 'search');


const YEAR_OPTIONS = [2, 5, 10, 15, 20];
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'connections', label: 'Most connections' },
  { value: 'experience', label: 'Most experience' },
];

/** One row of controls, above everything they scope. */
function Filters() {
  const filters = useSearchStore((s) => s.filters);
  const options = useSearchStore((s) => s.options);
  const setFilter = useSearchStore((s) => s.setFilter);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const count = activeFilterCount(filters);

  return (
    <div className="card space-y-3 p-4">
      <SearchBar />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          id="jobTitle"
          label="Job title"
          value={filters.jobTitle}
          options={options?.jobTitles}
          format={titleCase}
          placeholder="Any job title"
          onChange={(value) => setFilter('jobTitle', value)}
        />
        <FilterSelect
          id="skill"
          label="Skill"
          value={filters.skill}
          options={options?.skills}
          format={titleCase}
          placeholder="Any skill"
          onChange={(value) => setFilter('skill', value)}
        />
        <FilterSelect
          id="industry"
          label="Industry"
          value={filters.industry}
          options={options?.industries}
          format={titleCase}
          placeholder="Any industry"
          onChange={(value) => setFilter('industry', value)}
        />
        <FilterSelect
          id="country"
          label="Country"
          value={filters.country}
          options={options?.countries}
          format={titleCase}
          placeholder="Any country"
          onChange={(value) => setFilter('country', value)}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="minYears" className="mb-1.5 block text-xs font-medium text-muted">
            Minimum experience
          </label>
          <select
            id="minYears"
            className="field w-auto"
            value={filters.minYears}
            onChange={(event) => setFilter('minYears', event.target.value)}
          >
            <option value="">Any</option>
            {YEAR_OPTIONS.map((years) => (
              <option key={years} value={String(years)}>
                {years}+ years
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort" className="mb-1.5 block text-xs font-medium text-muted">
            Sort by
          </label>
          <select
            id="sort"
            className="field w-auto"
            value={filters.sort}
            onChange={(event) => setFilter('sort', event.target.value as SortKey)}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={filters.hasEmail}
            onChange={(event) => setFilter('hasEmail', event.target.checked)}
          />
          Has an email on file
        </label>

        <button
          type="button"
          className="btn-ghost ml-auto"
          onClick={resetFilters}
          disabled={count === 0 && filters.sort === 'relevance'}
        >
          Clear {count > 0 ? `(${count})` : 'filters'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const loadOptions = useSearchStore((s) => s.loadOptions);
  const search = useSearchStore((s) => s.search);

  useEffect(() => {
    void loadOptions();
    search(0);
  }, [loadOptions, search]);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const show = (value: Tab) => {
    setTab(value);
    window.location.hash = value === 'dashboard' ? '#dashboard' : '';
  };

  const tabClass = (value: Tab) =>
    `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
      tab === value ? 'bg-surface-2 text-slate-50' : 'text-muted hover:text-slate-200'
    }`;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="flex items-center gap-2 text-base font-semibold text-slate-50">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-strong text-xs font-bold text-white">
              in
            </span>
            LinkedIn Dataset Search
          </h1>
          <nav className="ml-auto flex gap-1 rounded-xl border border-line/60 bg-surface/60 p-1" aria-label="Views">
            <button type="button" className={tabClass('search')} aria-current={tab === 'search'} onClick={() => show('search')}>
              Search
            </button>
            <button
              type="button"
              className={tabClass('dashboard')}
              aria-current={tab === 'dashboard'}
              onClick={() => show('dashboard')}
            >
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {tab === 'search' ? (
          <>
            <Filters />
            <ResultList />
          </>
        ) : (
          <Dashboard />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted">
        <p>
          Records were parsed from the file in <code className="text-slate-300">./data</code>. Email addresses and
          phone numbers stay on the server and are only ever reported as counts.
        </p>
      </footer>

      <ProfileDrawer />
    </div>
  );
}

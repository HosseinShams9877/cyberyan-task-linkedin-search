import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import FilterSelect from './components/FilterSelect';
import PrefsToggles from './components/PrefsToggles';
import ProfileDrawer from './components/ProfileDrawer';
import ResultList from './components/ResultList';
import SearchBar from './components/SearchBar';
import { usePrefs, useT } from './i18n';
import type { MessageKey } from './i18n/en';
import { formatNumber, titleCase } from './lib/format';
import { activeFilterCount, useSearchStore, type SortKey } from './store/useSearchStore';

type Tab = 'search' | 'dashboard';

/** The view lives in the URL hash, so a dashboard link survives a refresh and back/forward. */
const tabFromHash = (): Tab => (window.location.hash === '#dashboard' ? 'dashboard' : 'search');


const YEAR_OPTIONS = [2, 5, 10, 15, 20];
const SORTS: { value: SortKey; label: MessageKey }[] = [
  { value: 'relevance', label: 'sort.relevance' },
  { value: 'name', label: 'sort.name' },
  { value: 'connections', label: 'sort.connections' },
  { value: 'experience', label: 'sort.experience' },
];

/**
 * The controls that scope everything below them. No surface of its own: it renders
 * inside the sticky bar under the header, which carries the glass and the border.
 *
 * Unless there is room for it (see `roomy` in index.css), everything but the keyword
 * box collapses behind a button. The bar is pinned, so its height is height the results
 * never get back - the four selects stack on a phone, and left standing open they
 * measured 480px of an 844px screen. Searching stays one tap away; narrowing it is one
 * more.
 *
 * The panel, not the bar, carries the height cap and the scroll: a scroll container
 * reserves a classic scrollbar's width from its children, and on the bar that left the
 * header 15px short of the page it is supposed to span.
 */
function Filters() {
  const t = useT();
  const filters = useSearchStore((s) => s.filters);
  const options = useSearchStore((s) => s.options);
  const setFilter = useSearchStore((s) => s.setFilter);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const count = activeFilterCount(filters);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 roomy:hidden"
          aria-expanded={open}
          aria-controls="filter-panel"
          onClick={() => setOpen((value) => !value)}
        >
          {count > 0 ? t('filters.toggleCount', { count: formatNumber(count) }) : t('filters.toggle')}
          {/* Chevron down when the panel is closed, up when it is open. */}
          <svg
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/*
        `-mx-4 px-4` cancels out: the panel bleeds to the strip's padding edge and puts
        the padding back inside, which costs nothing visually but keeps the clipping
        edge of `overflow-y-auto` clear of the focus ring on the outermost control.
      */}
      <div
        id="filter-panel"
        className={`-mx-4 max-h-[45svh] space-y-3 overflow-y-auto px-4 pb-1 roomy:block ${
          open ? '' : 'hidden'
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            id="jobTitle"
            label={t('filters.jobTitle')}
            value={filters.jobTitle}
            options={options?.jobTitles}
            format={titleCase}
            placeholder={t('filters.anyJobTitle')}
            onChange={(value) => setFilter('jobTitle', value)}
          />
          <FilterSelect
            id="skill"
            label={t('filters.skill')}
            value={filters.skill}
            options={options?.skills}
            format={titleCase}
            placeholder={t('filters.anySkill')}
            onChange={(value) => setFilter('skill', value)}
          />
          <FilterSelect
            id="industry"
            label={t('filters.industry')}
            value={filters.industry}
            options={options?.industries}
            format={titleCase}
            placeholder={t('filters.anyIndustry')}
            onChange={(value) => setFilter('industry', value)}
          />
          <FilterSelect
            id="country"
            label={t('filters.country')}
            value={filters.country}
            options={options?.countries}
            format={titleCase}
            placeholder={t('filters.anyCountry')}
            onChange={(value) => setFilter('country', value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="minYears" className="mb-1.5 block text-xs font-medium text-muted">
              {t('filters.minYears')}
            </label>
            <select
              id="minYears"
              className="field w-auto"
              value={filters.minYears}
              onChange={(event) => setFilter('minYears', event.target.value)}
            >
              <option value="">{t('filters.anyYears')}</option>
              {YEAR_OPTIONS.map((years) => (
                <option key={years} value={String(years)}>
                  {t('filters.yearsPlus', { years: formatNumber(years) })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort" className="mb-1.5 block text-xs font-medium text-muted">
              {t('filters.sort')}
            </label>
            <select
              id="sort"
              className="field w-auto"
              value={filters.sort}
              onChange={(event) => setFilter('sort', event.target.value as SortKey)}
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {t(sort.label)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-ink-body">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={filters.hasEmail}
              onChange={(event) => setFilter('hasEmail', event.target.checked)}
            />
            {t('filters.hasEmail')}
          </label>

          <button
            type="button"
            className="btn-ghost ms-auto"
            onClick={resetFilters}
            disabled={count === 0 && filters.sort === 'relevance'}
          >
            {count > 0 ? t('filters.clearCount', { count: formatNumber(count) }) : t('filters.clear')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { t, dir } = usePrefs();
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
      tab === value ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink-body'
    }`;

  return (
    // `dir` is on <html> for the cascade; repeating it here keeps React's own
    // subtree consistent and is what the drawer portal-less overlay inherits.
    <div className="min-h-dvh" dir={dir}>
      {/*
        A wash behind the glass. Fixed, so it does not scroll with the content, and
        `pointer-events-none` so it never intercepts a click.
      */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(55rem 38rem at 12% -12%, color-mix(in oklab, var(--color-brand) 12%, transparent), transparent 60%),' +
            'radial-gradient(45rem 32rem at 100% 0%, color-mix(in oklab, var(--color-brand-strong) 10%, transparent), transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/*
        The header and the filter bar pin as one block, so the filters never need to
        know the header's height - and since the page itself cannot scroll sideways
        (see index.css), neither strip can drift horizontally when the cards do.

        Nothing here scrolls. A scroll container reserves a classic scrollbar's width
        from its children, which measured the header 15px short of the page it is
        supposed to span; the guard for a short viewport sits on the filter panel
        instead, inside the padded content box where it costs the strips nothing.
      */}
      <div className="sticky top-0 z-30">
        <header className="pane w-full border-b">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <h1 className="flex items-center gap-2 text-base font-semibold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-strong text-xs font-bold text-white">
                in
              </span>
              {t('app.title')}
            </h1>
            <nav
              className="ms-auto flex gap-1 rounded-xl border border-line/60 bg-surface/60 p-1"
              aria-label={t('nav.views')}
            >
              <button
                type="button"
                className={tabClass('search')}
                aria-current={tab === 'search'}
                onClick={() => show('search')}
              >
                {t('nav.search')}
              </button>
              <button
                type="button"
                className={tabClass('dashboard')}
                aria-current={tab === 'dashboard'}
                onClick={() => show('dashboard')}
              >
                {t('nav.dashboard')}
              </button>
            </nav>
            <PrefsToggles />
          </div>
        </header>

        {/* Only the search view has filters; the dashboard pins the header alone. */}
        {tab === 'search' ? (
          <div className="pane w-full border-b">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <Filters />
            </div>
          </div>
        ) : null}
      </div>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {tab === 'search' ? <ResultList /> : <Dashboard />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted">
        {/*
          The path is a code span, so the sentence is split around its {path} slot
          instead of interpolated - which also lets a translator move the slot to
          wherever the grammar needs it.
        */}
        <p>
          {t('footer.note')
            .split('{path}')
            .flatMap((part, index) =>
              index === 0
                ? [part]
                : [
                    <code key="path" className="text-ink-soft" dir="ltr">
                      ./data
                    </code>,
                    part,
                  ],
            )}
        </p>
      </footer>

      <ProfileDrawer />
    </div>
  );
}

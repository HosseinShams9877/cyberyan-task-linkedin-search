/**
 * Application state (Zustand).
 *
 * The store owns the filter values, the current result page, the dashboard
 * aggregates and the selected profile. Searches are debounced and the previous
 * request is aborted, so fast typing cannot produce out-of-order results.
 */
import { create } from 'zustand';
import { translate } from '../i18n';
import { api, ApiRequestError, toParams } from '../lib/api';
import type { FiltersResponse, ProfileDetail, SearchResponse, StatsResponse } from '../lib/api-types';

export type SortKey = 'relevance' | 'name' | 'connections' | 'experience';

export interface Filters {
  keyword: string;
  jobTitle: string;
  skill: string;
  industry: string;
  country: string;
  minYears: string;
  hasEmail: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  keyword: '',
  jobTitle: '',
  skill: '',
  industry: '',
  country: '',
  minYears: '',
  hasEmail: false,
  sort: 'relevance',
};

const PAGE_SIZE = 12;

interface SearchState {
  filters: Filters;
  page: number;
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  options: FiltersResponse | null;
  stats: StatsResponse | null;
  statsError: string | null;
  detail: ProfileDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  search: (debounceMs?: number) => void;
  loadOptions: () => Promise<void>;
  loadStats: () => Promise<void>;
  openProfile: (id: number) => Promise<void>;
  closeProfile: () => void;
}

/*
 * An ApiRequestError carries the server's own message, which is English and stays as
 * it is - it names a status or a field. Only the fallback, which this app writes
 * itself, is translated.
 */
const message = (error: unknown): string =>
  error instanceof ApiRequestError ? error.message : translate('error.transport');

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

/** Module scope, not state: these are transport details, not rendered values. */
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: AbortController | undefined;

export const useSearchStore = create<SearchState>((set, get) => ({
  filters: EMPTY_FILTERS,
  page: 1,
  results: null,
  loading: false,
  error: null,
  options: null,
  stats: null,
  statsError: null,
  detail: null,
  detailLoading: false,
  detailError: null,

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value }, page: 1 }));
    get().search(typeof value === 'string' && key === 'keyword' ? 350 : 0);
  },

  resetFilters: () => {
    set({ filters: EMPTY_FILTERS, page: 1 });
    get().search(0);
  },

  setPage: (page) => {
    set({ page });
    get().search(0);
  },

  search: (debounceMs = 0) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const { filters, page } = get();
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      set({ loading: true, error: null });

      const params = toParams({
        keyword: filters.keyword.trim(),
        jobTitle: filters.jobTitle,
        skill: filters.skill,
        industry: filters.industry,
        country: filters.country,
        minYears: filters.minYears,
        hasEmail: filters.hasEmail ? 'true' : '',
        sort: filters.sort,
        page,
        pageSize: PAGE_SIZE,
      });

      api
        .search(params, controller.signal)
        .then((results) => set({ results, loading: false, error: null }))
        .catch((error: unknown) => {
          if (isAbort(error)) return;
          set({ loading: false, error: message(error) });
        });
    }, debounceMs);
  },

  loadOptions: async () => {
    try {
      set({ options: await api.filters() });
    } catch (error) {
      if (!isAbort(error)) console.error('filters failed', error);
    }
  },

  loadStats: async () => {
    if (get().stats) return;
    try {
      set({ stats: await api.stats(), statsError: null });
    } catch (error) {
      if (!isAbort(error)) set({ statsError: message(error) });
    }
  },

  openProfile: async (id) => {
    set({ detailLoading: true, detailError: null, detail: null });
    try {
      set({ detail: await api.profile(id), detailLoading: false });
    } catch (error) {
      if (isAbort(error)) return;
      set({ detailLoading: false, detailError: message(error) });
    }
  },

  closeProfile: () => set({ detail: null, detailError: null, detailLoading: false }),
}));

export const activeFilterCount = (filters: Filters): number =>
  [filters.keyword, filters.jobTitle, filters.skill, filters.industry, filters.country, filters.minYears].filter(
    (value) => value.trim() !== '',
  ).length + (filters.hasEmail ? 1 : 0);

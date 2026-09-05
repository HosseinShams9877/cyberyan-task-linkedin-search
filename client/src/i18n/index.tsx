import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setActiveLocale } from '../lib/format';
import en, { type MessageKey } from './en';
import fa from './fa';

export type Lang = 'en' | 'fa';
export type Theme = 'dark' | 'light';

/**
 * What a first-time visitor gets: English, left-to-right, on a white page. Both are
 * only defaults - the header toggles switch either one, and the choice is remembered in
 * localStorage, so a returning visitor never sees these again.
 */
export const DEFAULT_LANG: Lang = 'en';
export const DEFAULT_THEME: Theme = 'light';

const CATALOGUES: Record<Lang, Record<MessageKey, string>> = { en, fa };
const LOCALES: Record<Lang, string> = { en: 'en-US', fa: 'fa-IR' };
const DIRS: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', fa: 'rtl' };

const LANG_KEY = 'lds.lang';
const THEME_KEY = 'lds.theme';

const isLang = (value: unknown): value is Lang => value === 'en' || value === 'fa';
const isTheme = (value: unknown): value is Theme => value === 'dark' || value === 'light';

const fill = (template: string, vars?: Record<string, string | number>): string =>
  vars
    ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
    : template;

let activeLang: Lang = DEFAULT_LANG;

/**
 * Translator for code that runs outside the React tree - the store's error strings.
 * The provider keeps `activeLang` in step; component code should use `useT` so a
 * language switch re-renders it.
 */
export const translate = (key: MessageKey, vars?: Record<string, string | number>): string =>
  fill(CATALOGUES[activeLang][key] ?? en[key] ?? key, vars);

/**
 * localStorage throws in a sandboxed iframe and in Safari's private mode, and a
 * preference is not worth a blank page, so every access is guarded.
 */
function read<T>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return guard(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Preferences are a convenience; a storage failure is not worth surfacing. */
  }
}

/**
 * Mirrors the language and theme onto <html>, which is where the whole cascade hangs
 * off them: `dir` flips every logical property, `lang` selects the Persian font (and
 * tells a screen reader which voice to use), and `.dark` switches the token set.
 *
 * index.html runs the same three writes inline before first paint, so this only ever
 * re-applies them after a toggle.
 */
export function applyPrefs(lang: Lang, theme: Theme): void {
  activeLang = lang;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = DIRS[lang];
  root.classList.toggle('dark', theme === 'dark');
  setActiveLocale(LOCALES[lang]);
}

interface Prefs {
  lang: Lang;
  theme: Theme;
  /** BCP 47 tag for Intl - drives digits, grouping and month names. */
  locale: string;
  dir: 'ltr' | 'rtl';
  /** True in Persian. Charts need it as a value, not a CSS variant. */
  rtl: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleLang: () => void;
  toggleTheme: () => void;
  /** Looks up a message and fills its {placeholders}. */
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => read(LANG_KEY, isLang, DEFAULT_LANG));
  const [theme, setThemeState] = useState<Theme>(() => read(THEME_KEY, isTheme, DEFAULT_THEME));

  // Keep the module-level locale and language in step during render as well as in the
  // effect: a formatter called in this same commit would otherwise use the old locale.
  setActiveLocale(LOCALES[lang]);
  activeLang = lang;

  useEffect(() => {
    applyPrefs(lang, theme);
  }, [lang, theme]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    write(LANG_KEY, next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    write(THEME_KEY, next);
  }, []);

  const value = useMemo<Prefs>(() => {
    const messages = CATALOGUES[lang];
    return {
      lang,
      theme,
      locale: LOCALES[lang],
      dir: DIRS[lang],
      rtl: DIRS[lang] === 'rtl',
      setLang,
      setTheme,
      toggleLang: () => setLang(lang === 'en' ? 'fa' : 'en'),
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      t: (key, vars) => fill(messages[key] ?? en[key] ?? key, vars),
    };
  }, [lang, theme, setLang, setTheme]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) throw new Error('usePrefs must be used inside <PreferencesProvider>');
  return value;
}

/** Shorthand for the common case of needing only the translator. */
export const useT = (): Prefs['t'] => usePrefs().t;

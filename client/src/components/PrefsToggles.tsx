import { usePrefs } from '../i18n';

/**
 * The two header switches. Both are single buttons rather than menus: with exactly two
 * languages and two themes, a toggle is one click instead of two, and its label can
 * name the destination ("Switch to Persian") so the action is unambiguous to a screen
 * reader as well as to the eye.
 *
 * `aria-pressed` is deliberately absent - these are not on/off states but swaps, and a
 * pressed toggle would be read as "dark theme, pressed" without saying what pressing
 * it does.
 */
export default function PrefsToggles() {
  const { lang, theme, toggleLang, toggleTheme, t } = usePrefs();
  const dark = theme === 'dark';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="btn-ghost px-2.5 py-1.5 text-xs font-semibold"
        onClick={toggleLang}
        title={lang === 'en' ? t('prefs.toPersian') : t('prefs.toEnglish')}
        aria-label={lang === 'en' ? t('prefs.toPersian') : t('prefs.toEnglish')}
      >
        {/* The other language names itself, in its own script. */}
        <span aria-hidden="true">{lang === 'en' ? 'فا' : 'EN'}</span>
      </button>

      <button
        type="button"
        className="btn-ghost px-2.5 py-1.5"
        onClick={toggleTheme}
        title={dark ? t('prefs.toLight') : t('prefs.toDark')}
        aria-label={dark ? t('prefs.toLight') : t('prefs.toDark')}
      >
        {dark ? (
          /* Currently dark, so the button offers the sun. */
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

import { usePrefs } from '../i18n';
import { formatNumber } from '../lib/format';
import { useSearchStore } from '../store/useSearchStore';

/** Windowed page numbers so the control stays a fixed width on large result sets. */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const visible = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  visible.forEach((p, i) => {
    if (i > 0 && p - (visible[i - 1] as number) > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export default function Pagination() {
  const { t, rtl } = usePrefs();
  const page = useSearchStore((s) => s.page);
  const totalPages = useSearchStore((s) => s.results?.totalPages ?? 0);
  const setPage = useSearchStore((s) => s.setPage);

  if (totalPages <= 1) return null;

  const go = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // The arrow points the way the reader moves, so it mirrors with the language while
  // "previous" keeps meaning previous.
  const Chevron = ({ back }: { back: boolean }) => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={back === !rtl ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label={t('pager.aria')}>
      <button className="btn-ghost" onClick={() => go(page - 1)} disabled={page <= 1}>
        <Chevron back />
        {t('pager.previous')}
      </button>
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1.5 text-muted" aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <button
            key={entry}
            className={entry === page ? 'btn-primary min-w-10 tabular-nums' : 'btn-ghost min-w-10 tabular-nums'}
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => go(entry)}
          >
            {formatNumber(entry)}
          </button>
        ),
      )}
      <button className="btn-ghost" onClick={() => go(page + 1)} disabled={page >= totalPages}>
        {t('pager.next')}
        <Chevron back={false} />
      </button>
    </nav>
  );
}

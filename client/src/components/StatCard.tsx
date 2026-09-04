/**
 * Stat tile: label, value, optional hint.
 *
 * Values use proportional figures (not tabular) because they are large standalone
 * numbers, and `tabular-nums` makes those look loose.
 */
export default function StatCard({
  label,
  value,
  hint,
  hero = false,
  className = '',
}: {
  label: string;
  value: string;
  hint?: string;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 font-semibold text-slate-50 ${hero ? 'text-5xl' : 'text-2xl'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

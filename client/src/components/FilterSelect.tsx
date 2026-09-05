import { useT } from '../i18n';
import type { Bucket } from '../lib/api-types';
import { formatNumber } from '../lib/format';

/**
 * Dropdown backed by a `/api/filters` bucket list. Counts are shown in the option
 * text so the reader can see how much a filter will narrow the results.
 */
export default function FilterSelect({
  id,
  label,
  value,
  options,
  format,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Bucket[] | undefined;
  format: (label: string) => string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <select
        id={id}
        className="field"
        value={value}
        disabled={!options}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{options ? placeholder : t('common.loading')}</option>
        {options?.map((option) => (
          <option key={option.label} value={option.label}>
            {t('filters.optionCount', { label: format(option.label), count: formatNumber(option.count) })}
          </option>
        ))}
      </select>
    </div>
  );
}

import type { Bucket } from '../lib/api-types';

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
        <option value="">{options ? placeholder : 'Loading...'}</option>
        {options?.map((option) => (
          <option key={option.label} value={option.label}>
            {format(option.label)} ({option.count.toLocaleString('en-US')})
          </option>
        ))}
      </select>
    </div>
  );
}

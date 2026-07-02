// A small app-styled segmented control: a pill track with one option lit. Used
// in place of an OS <select> wherever the choices are few (time of day, and the
// like), so every choice keeps the app's look and touch feel.
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1 rounded-full bg-parchment-200 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 rounded-full py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-parchment-50 text-ink-900 shadow-card' : 'text-ink-500',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

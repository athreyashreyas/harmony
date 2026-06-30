import type { Cadence } from '@harmony/shared';

// Full cadence control: pick the kind of schedule and shape it exactly. Covers
// the whole Cadence model, so a habit can be every day, only certain weekdays,
// a number of times a week, or every few days.

type Kind = Cadence['kind'];

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'specific-days', label: 'Certain days' },
  { value: 'times-per-week', label: 'A number of times a week' },
  { value: 'every-n-days', label: 'Every few days' },
  { value: 'every-n-weeks', label: 'Every few weeks' },
  { value: 'every-n-months', label: 'Every few months' },
];

// 0 = Sunday, matching the cadence model's day numbering.
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const selectClass =
  'w-full rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 focus:ring-2 focus:ring-iris-500';

function defaultFor(kind: Kind, current: Cadence): Cadence {
  switch (kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'weekdays':
      return { kind: 'weekdays' };
    case 'weekends':
      return { kind: 'weekends' };
    case 'specific-days':
      return { kind: 'specific-days', days: current.kind === 'specific-days' ? current.days : [1, 3, 5] };
    case 'times-per-week':
      return { kind: 'times-per-week', times: current.kind === 'times-per-week' ? current.times : 3 };
    case 'every-n-days':
      return { kind: 'every-n-days', n: current.kind === 'every-n-days' ? current.n : 2 };
    case 'every-n-weeks':
      return { kind: 'every-n-weeks', n: current.kind === 'every-n-weeks' ? current.n : 2 };
    case 'every-n-months':
      return { kind: 'every-n-months', n: current.kind === 'every-n-months' ? current.n : 1 };
  }
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Fewer"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-parchment-200 text-lg text-ink-700 disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-0 flex-1 text-center text-sm text-ink-900">
        {value} {suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="More"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-parchment-200 text-lg text-ink-700 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

export default function CadenceEditor({
  value,
  onChange,
}: {
  value: Cadence;
  onChange: (next: Cadence) => void;
}) {
  function toggleDay(day: number) {
    const days = value.kind === 'specific-days' ? value.days : [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    if (next.length === 0) return; // keep at least one day chosen
    onChange({ kind: 'specific-days', days: next.sort((a, b) => a - b) });
  }

  return (
    <div>
      <label htmlFor="habit-frequency" className="mb-1.5 block text-sm font-medium text-ink-700">
        How often
      </label>
      <select
        id="habit-frequency"
        value={value.kind}
        onChange={(e) => onChange(defaultFor(e.target.value as Kind, value))}
        className={selectClass}
      >
        {KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {value.kind === 'specific-days' && (
        <div className="mt-3 flex justify-between gap-1.5">
          {DAY_LABELS.map((label, day) => {
            const on = value.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={on}
                aria-label={label}
                className={[
                  'flex h-10 flex-1 items-center justify-center rounded-card text-xs font-medium transition-colors',
                  on ? 'bg-iris-500 text-on-primary' : 'bg-parchment-200 text-ink-500',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {value.kind === 'times-per-week' && (
        <Stepper
          value={value.times}
          min={1}
          max={7}
          onChange={(times) => onChange({ kind: 'times-per-week', times })}
          suffix={value.times === 1 ? 'time a week' : 'times a week'}
        />
      )}

      {value.kind === 'every-n-days' && (
        <Stepper
          value={value.n}
          min={2}
          max={30}
          onChange={(n) => onChange({ kind: 'every-n-days', n })}
          suffix="days apart"
        />
      )}

      {value.kind === 'every-n-weeks' && (
        <Stepper
          value={value.n}
          min={1}
          max={12}
          onChange={(n) => onChange({ kind: 'every-n-weeks', n })}
          suffix={value.n === 1 ? 'week apart' : 'weeks apart'}
        />
      )}

      {value.kind === 'every-n-months' && (
        <>
          <Stepper
            value={value.n}
            min={1}
            max={24}
            onChange={(n) => onChange({ kind: 'every-n-months', n })}
            suffix={value.n === 1 ? 'month apart' : 'months apart'}
          />
          <p className="mt-2 text-xs text-ink-300">
            Repeats on the same date each time, set by the start date below.
          </p>
        </>
      )}
    </div>
  );
}

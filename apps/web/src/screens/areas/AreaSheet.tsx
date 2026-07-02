import { useEffect, useMemo, useState } from 'react';
import type { Area, DriftSensitivity, Habit, Importance, TimeOfDay } from '@harmony/shared';
import { AREA_PALETTE, MAX_AREA_NAME, MAX_WHY_SENTENCE } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import ColorPicker from '../../components/ColorPicker/ColorPicker';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { TIME_OF_DAY_OPTIONS } from '../../lib/cadenceOptions';
import type { AreaFields } from '../../lib/domain';
import { PrimaryButton, QuietLink } from '../onboarding/ui';

export interface HabitWeight {
  id: string;
  weight: number;
}

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
  { value: 'core', label: 'Really matters' },
  { value: 'matters', label: 'Matters' },
  { value: 'optional', label: 'Nice to have' },
];

const SENSITIVITY_OPTIONS: { value: DriftSensitivity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'default', label: 'Default' },
  { value: 'high', label: 'High' },
];

// Canonical definition lives in lib/domain; re-exported here so existing
// `import { AreaFields } from '.../AreaSheet'` sites keep working.
export type { AreaFields } from '../../lib/domain';

const inputClass =
  'w-full rounded-card bg-parchment-100 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 placeholder:text-ink-300 focus:ring-2 focus:ring-iris-500';

// Create and edit share one sheet (section 10: long-press a row to edit; the
// FAB on the Areas screen creates). Also reused, unchanged, by Settings'
// priority list (section 14), which is why drift sensitivity and reminder
// time-of-day live here rather than in a second sheet. Archive only appears
// in edit mode.
export default function AreaSheet({
  open,
  area,
  habits = [],
  usedColors = [],
  onClose,
  onSave,
  onSaveWeights,
  onArchive,
}: {
  open: boolean;
  area: Area | null;
  // The area's tend habits, for the weighting editor (edit mode only).
  habits?: Habit[];
  // Colours already worn by other areas, marked in the picker so the wheel stays
  // legibly varied.
  usedColors?: string[];
  onClose: () => void;
  onSave: (next: AreaFields) => void;
  onSaveWeights?: (weights: HabitWeight[]) => void;
  onArchive?: () => void;
}) {
  const isEdit = area != null;
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(AREA_PALETTE[0].hex);
  const [importance, setImportance] = useState<Importance>('matters');
  const [whySentence, setWhySentence] = useState('');
  const [driftSensitivity, setDriftSensitivity] = useState<DriftSensitivity>('default');
  const [reminderTimeOfDay, setReminderTimeOfDay] = useState<TimeOfDay>('anytime');
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setName(area?.name ?? '');
    setColor(area?.color ?? AREA_PALETTE[0].hex);
    setImportance(area?.importance ?? 'matters');
    setWhySentence(area?.whySentence ?? '');
    setDriftSensitivity(area?.driftSensitivity ?? 'default');
    setReminderTimeOfDay(area?.reminderTimeOfDay ?? 'anytime');
    setWeights(Object.fromEntries(habits.map((h) => [h.id, h.weight ?? 1])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area]);

  const totalWeight = useMemo(
    () => habits.reduce((sum, h) => sum + (weights[h.id] ?? 1), 0) || 1,
    [habits, weights],
  );

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, importance, whySentence, driftSensitivity, reminderTimeOfDay });
    if (onSaveWeights && habits.length > 1) {
      onSaveWeights(habits.map((h) => ({ id: h.id, weight: weights[h.id] ?? 1 })));
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit area' : 'Add area'}>
      <div className="space-y-5 pb-4">
        <div>
          <label htmlFor="area-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            Name
          </label>
          <input
            id="area-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Creativity"
            maxLength={MAX_AREA_NAME}
            className={inputClass}
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-ink-700">Colour</p>
          <ColorPicker value={color} onChange={setColor} usedColors={usedColors} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">How much it matters</p>
          <div className="flex gap-2">
            {IMPORTANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setImportance(option.value)}
                aria-pressed={importance === option.value}
                className={[
                  'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                  importance === option.value
                    ? 'bg-iris-50 text-iris-500'
                    : 'bg-parchment-200 text-ink-500',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isEdit && habits.length > 1 && (
          <div>
            <p className="mb-1 text-sm font-medium text-ink-700">How much each habit counts</p>
            <p className="mb-3 text-xs text-ink-300">
              Their shares of this area's bloom. Slide to lean it toward what matters most here.
            </p>
            {/* Live stacked bar of the shares. */}
            <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-parchment-200">
              {habits.map((h) => (
                <span
                  key={h.id}
                  style={{
                    width: `${((weights[h.id] ?? 1) / totalWeight) * 100}%`,
                    backgroundColor: h.color ?? color,
                  }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {habits.map((h) => {
                const pct = Math.round(((weights[h.id] ?? 1) / totalWeight) * 100);
                return (
                  <div key={h.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: h.color ?? color }} />
                        <span className="truncate text-sm text-ink-700">{h.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-ink-500">{pct}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={weights[h.id] ?? 1}
                      onChange={(e) =>
                        setWeights((w) => ({ ...w, [h.id]: Number(e.target.value) }))
                      }
                      aria-label={`Weight for ${h.name}`}
                      className="w-full accent-iris-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="area-why" className="mb-1.5 block text-sm font-medium text-ink-700">
            In your own words
          </label>
          <textarea
            id="area-why"
            value={whySentence}
            onChange={(e) => setWhySentence(e.target.value)}
            placeholder="Write here."
            rows={3}
            maxLength={MAX_WHY_SENTENCE}
            className={`${inputClass} resize-none`}
          />
          {whySentence.length > MAX_WHY_SENTENCE - 40 && (
            <p className="mt-1 text-right text-xs text-ink-300">{MAX_WHY_SENTENCE - whySentence.length} left</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">How readily reminders fire</p>
          <div className="flex gap-2">
            {SENSITIVITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDriftSensitivity(option.value)}
                aria-pressed={driftSensitivity === option.value}
                className={[
                  'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                  driftSensitivity === option.value
                    ? 'bg-iris-50 text-iris-500'
                    : 'bg-parchment-200 text-ink-500',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">When reminders for this area arrive</p>
          <SegmentedControl
            value={reminderTimeOfDay}
            options={TIME_OF_DAY_OPTIONS}
            onChange={setReminderTimeOfDay}
            ariaLabel="When reminders for this area arrive"
          />
        </div>

        <PrimaryButton onClick={handleSave} disabled={!name.trim()}>
          {isEdit ? 'Save changes' : 'Add area'}
        </PrimaryButton>

        {isEdit && onArchive && (
          <div className="text-center">
            <QuietLink onClick={onArchive}>Delete this area</QuietLink>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

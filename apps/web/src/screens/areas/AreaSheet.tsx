import { useEffect, useState } from 'react';
import type { Area, DriftSensitivity, Importance, TimeOfDay } from '@harmony/shared';
import { AREA_PALETTE } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import { TIME_OF_DAY_OPTIONS } from '../../lib/cadenceOptions';
import { PrimaryButton, QuietLink } from '../onboarding/ui';

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

export type AreaFields = Pick<
  Area,
  'name' | 'color' | 'importance' | 'whySentence' | 'driftSensitivity' | 'reminderTimeOfDay'
>;

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
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  area: Area | null;
  onClose: () => void;
  onSave: (next: AreaFields) => void;
  onArchive?: () => void;
}) {
  const isEdit = area != null;
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(AREA_PALETTE[0].hex);
  const [importance, setImportance] = useState<Importance>('matters');
  const [whySentence, setWhySentence] = useState('');
  const [driftSensitivity, setDriftSensitivity] = useState<DriftSensitivity>('default');
  const [reminderTimeOfDay, setReminderTimeOfDay] = useState<TimeOfDay>('anytime');

  useEffect(() => {
    if (!open) return;
    setName(area?.name ?? '');
    setColor(area?.color ?? AREA_PALETTE[0].hex);
    setImportance(area?.importance ?? 'matters');
    setWhySentence(area?.whySentence ?? '');
    setDriftSensitivity(area?.driftSensitivity ?? 'default');
    setReminderTimeOfDay(area?.reminderTimeOfDay ?? 'anytime');
  }, [open, area]);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, importance, whySentence, driftSensitivity, reminderTimeOfDay });
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
            className={inputClass}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Colour</p>
          <div className="flex flex-wrap gap-2.5">
            {AREA_PALETTE.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                aria-label={swatch.name}
                aria-pressed={color === swatch.hex}
                onClick={() => setColor(swatch.hex)}
                className="h-7 w-7 rounded-full"
                style={{
                  backgroundColor: swatch.hex,
                  boxShadow:
                    color === swatch.hex ? `0 0 0 2px #FDFCF9, 0 0 0 4px ${swatch.hex}` : undefined,
                }}
              />
            ))}
          </div>
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
            className={`${inputClass} resize-none`}
          />
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
          <label htmlFor="area-reminder-time" className="mb-1.5 block text-sm font-medium text-ink-700">
            When reminders for this area arrive
          </label>
          <select
            id="area-reminder-time"
            value={reminderTimeOfDay}
            onChange={(e) => setReminderTimeOfDay(e.target.value as TimeOfDay)}
            className={inputClass}
          >
            {TIME_OF_DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <PrimaryButton onClick={handleSave} disabled={!name.trim()}>
          {isEdit ? 'Save changes' : 'Add area'}
        </PrimaryButton>

        {isEdit && onArchive && (
          <div className="text-center">
            <QuietLink onClick={onArchive}>Archive this area</QuietLink>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

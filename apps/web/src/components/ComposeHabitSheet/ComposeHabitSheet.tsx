import { useEffect, useState } from 'react';
import type { Area, Cadence, TimeOfDay } from '@harmony/shared';
import { AREA_PALETTE } from '@harmony/shared';
import BottomSheet from '../BottomSheet/BottomSheet';
import WatercolorWash from '../WatercolorWash/WatercolorWash';
import { hexToRgba } from '../../lib/color';
import { CADENCE_OPTIONS, TIME_OF_DAY_OPTIONS, cadenceKey } from '../../lib/cadenceOptions';
import type { HabitDraft } from '../../lib/domain';
import { PrimaryButton, QuietLink } from '../../screens/onboarding/ui';

// Re-exported so existing `import { HabitDraft } from '.../ComposeHabitSheet'`
// sites keep working; the canonical definition lives in lib/domain.
export type { HabitDraft } from '../../lib/domain';

const selectClass =
  'w-full rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 focus:ring-2 focus:ring-iris-500';

// Create and edit share one sheet. The watercolour wash appears once an area is
// selected, in the habit's own colour if it has one. Habits can pick their own
// colour (else they inherit the area's) and an optional reminder time.
export default function ComposeHabitSheet({
  open,
  areas,
  initial,
  isEdit,
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  areas: Area[];
  initial: HabitDraft | null;
  isEdit: boolean;
  onClose: () => void;
  onSave: (draft: HabitDraft) => void;
  onArchive?: () => void;
}) {
  const [areaId, setAreaId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<Cadence>(CADENCE_OPTIONS[0].value);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [color, setColor] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAreaId(initial?.areaId ?? null);
    setName(initial?.name ?? '');
    setCadence(initial?.cadence ?? CADENCE_OPTIONS[0].value);
    setTimeOfDay(initial?.timeOfDay ?? 'anytime');
    setColor(initial?.color ?? null);
    setReminderTime(initial?.reminderTime ?? null);
  }, [open, initial]);

  const selectedArea = areas.find((a) => a.id === areaId) ?? null;
  const accent = color ?? selectedArea?.color ?? null;
  const canSave = name.trim().length > 0 && areaId != null;

  function handleSave() {
    if (!canSave || !areaId) return;
    onSave({ areaId, name: name.trim(), cadence, timeOfDay, color: color ?? undefined, reminderTime });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit habit' : 'Add habit'}>
      <div className="relative -mx-5 -mt-4 overflow-hidden px-5 pt-4">
        {accent && <WatercolorWash color={accent} height={320} />}

        <div className="relative space-y-5 pb-4">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Area</p>
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setAreaId(area.id)}
                  aria-pressed={areaId === area.id}
                  className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
                  style={
                    areaId === area.id
                      ? { backgroundColor: hexToRgba(area.color, 0.16), color: area.color }
                      : { backgroundColor: 'var(--parchment-200)', color: 'var(--ink-700)' }
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                  {area.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="habit-name" className="mb-1.5 block text-sm font-medium text-ink-700">
              Habit
            </label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Go for a short walk"
              className={selectClass}
            />
          </div>

          <div>
            <label htmlFor="habit-frequency" className="mb-1.5 block text-sm font-medium text-ink-700">
              How often
            </label>
            <select
              id="habit-frequency"
              value={cadenceKey(cadence)}
              onChange={(e) => {
                const option = CADENCE_OPTIONS.find((o) => cadenceKey(o.value) === e.target.value);
                if (option) setCadence(option.value);
              }}
              className={selectClass}
            >
              {CADENCE_OPTIONS.map((o) => (
                <option key={cadenceKey(o.value)} value={cadenceKey(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="habit-time" className="mb-1.5 block text-sm font-medium text-ink-700">
              Time of day
            </label>
            <select
              id="habit-time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
              className={selectClass}
            >
              {TIME_OF_DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="habit-reminder" className="mb-1.5 block text-sm font-medium text-ink-700">
              Remind me at
            </label>
            <div className="flex items-center gap-3">
              <input
                id="habit-reminder"
                type="time"
                value={reminderTime ?? ''}
                onChange={(e) => setReminderTime(e.target.value || null)}
                className={selectClass}
              />
              {reminderTime && (
                <button
                  type="button"
                  onClick={() => setReminderTime(null)}
                  className="shrink-0 text-sm text-ink-500 hover:text-ink-700"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-300">
              Optional. A gentle nudge at this time on the days it's due.
            </p>
          </div>

          <div>
            <p className="mb-3 text-center text-sm font-medium text-ink-700">Colour</p>
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => setColor(null)}
                aria-pressed={color === null}
                title="Match the area's colour"
                className="flex h-9 items-center rounded-full bg-parchment-200 px-4 text-sm font-medium text-ink-500"
                style={
                  color === null && selectedArea
                    ? { boxShadow: `0 0 0 2px #FFFAF1, 0 0 0 4px ${selectedArea.color}` }
                    : undefined
                }
              >
                Match area
              </button>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(2.5rem,1fr))]">
              {AREA_PALETTE.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.hex}
                  onClick={() => setColor(swatch.hex)}
                  className="aspect-square w-full rounded-full"
                  style={{
                    backgroundColor: swatch.hex,
                    boxShadow:
                      color === swatch.hex ? `0 0 0 2px #FFFAF1, 0 0 0 4px ${swatch.hex}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <PrimaryButton onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save changes' : 'Add habit'}
          </PrimaryButton>

          {isEdit && onArchive && (
            <div className="text-center">
              <QuietLink onClick={onArchive}>Archive this habit</QuietLink>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

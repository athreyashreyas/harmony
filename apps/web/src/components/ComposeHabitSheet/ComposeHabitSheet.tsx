import { useEffect, useState } from 'react';
import type { Area, Cadence, TimeOfDay } from '@harmony/shared';
import { AREA_PALETTE } from '@harmony/shared';
import BottomSheet from '../BottomSheet/BottomSheet';
import CadenceEditor from '../CadenceEditor/CadenceEditor';
import WatercolorWash from '../WatercolorWash/WatercolorWash';
import { hexToRgba } from '../../lib/color';
import { TIME_OF_DAY_OPTIONS } from '../../lib/cadenceOptions';
import type { HabitDraft } from '../../lib/domain';
import { todayISO } from '../../lib/time/dates';
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
  const [polarity, setPolarity] = useState<'tend' | 'ease'>('tend');
  const [tugWeight, setTugWeight] = useState<number>(1);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<Cadence>({ kind: 'times-per-week', times: 3 });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [color, setColor] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPolarity(initial?.polarity ?? 'tend');
    setTugWeight(initial?.tugWeight ?? 1);
    setAreaId(initial?.areaId ?? null);
    setName(initial?.name ?? '');
    setCadence(initial?.cadence ?? { kind: 'times-per-week', times: 3 });
    setTimeOfDay(initial?.timeOfDay ?? 'anytime');
    setColor(initial?.color ?? null);
    setReminderTime(initial?.reminderTime ?? null);
    setStartDate(initial?.startDate ?? todayISO());
    setEndDate(initial?.endDate ?? null);
  }, [open, initial]);

  const isEase = polarity === 'ease';
  const selectedArea = areas.find((a) => a.id === areaId) ?? null;
  // Tugs read in a muted slate, distinct from the warm, filled tend habits.
  const accent = isEase ? '#5a636f' : (color ?? selectedArea?.color ?? null);
  const canSave = name.trim().length > 0 && areaId != null;

  function handleSave() {
    if (!canSave || !areaId) return;
    if (isEase) {
      // Tugs aren't scheduled: store sane placeholders for the unused fields.
      onSave({
        areaId,
        name: name.trim(),
        cadence: { kind: 'daily' },
        timeOfDay: 'anytime',
        reminderTime: null,
        startDate,
        endDate: null,
        polarity: 'ease',
        tugWeight,
      });
      return;
    }
    onSave({
      areaId,
      name: name.trim(),
      cadence,
      timeOfDay,
      color: color ?? undefined,
      reminderTime,
      startDate,
      // Guard against an end date that drifted before the start.
      endDate: endDate && endDate >= startDate ? endDate : null,
      polarity: 'tend',
    });
  }

  const title = isEdit ? (isEase ? 'Edit tug' : 'Edit habit') : isEase ? 'Add a tug' : 'Add habit';

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="relative -mx-5 -mt-4 overflow-hidden px-5 pt-4">
        {accent && <WatercolorWash color={accent} height={320} />}

        <div className="relative space-y-5 pb-4">
          {!isEdit && (
            <div className="flex rounded-full bg-parchment-200 p-0.5">
              {(
                [
                  { v: 'tend', label: 'Tend to' },
                  { v: 'ease', label: 'Ease off' },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setPolarity(o.v)}
                  aria-pressed={polarity === o.v}
                  className={[
                    'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors',
                    polarity === o.v ? 'bg-parchment-50 text-ink-900 shadow-card' : 'text-ink-500',
                  ].join(' ')}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {isEase && (
            <p className="text-xs text-ink-500">
              A tug is something you'd like to ease off. There's no schedule. Log it on the days it
              happens, and it gently eats into the area's bloom. No shame, just an honest picture.
            </p>
          )}
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

          {isEase && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">How much does it set you back?</p>
              <div className="flex gap-2">
                {(
                  [
                    { w: 0.5, label: 'A little' },
                    { w: 1, label: 'Some' },
                    { w: 2, label: 'A lot' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.w}
                    type="button"
                    onClick={() => setTugWeight(o.w)}
                    aria-pressed={tugWeight === o.w}
                    className="flex-1 rounded-card py-2 text-sm font-medium transition-colors"
                    style={
                      tugWeight === o.w
                        ? { backgroundColor: '#5a636f', color: 'var(--parchment-50)' }
                        : { backgroundColor: 'var(--parchment-200)', color: 'var(--ink-700)' }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isEase && <CadenceEditor value={cadence} onChange={setCadence} />}

          {!isEase && (
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
          )}

          {!isEase && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">Duration</p>
            <div className="flex items-center gap-3">
              <label htmlFor="habit-start" className="w-12 shrink-0 text-sm text-ink-500">
                Starts
              </label>
              <input
                id="habit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || todayISO())}
                className={selectClass}
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <label htmlFor="habit-end" className="w-12 shrink-0 text-sm text-ink-500">
                Ends
              </label>
              {endDate === null ? (
                <button
                  type="button"
                  onClick={() => setEndDate(startDate)}
                  className="flex-1 rounded-card bg-parchment-200 px-3.5 py-2.5 text-left text-sm text-ink-500"
                >
                  No end date. Tap to set one.
                </button>
              ) : (
                <>
                  <input
                    id="habit-end"
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value || startDate)}
                    className={selectClass}
                  />
                  <button
                    type="button"
                    onClick={() => setEndDate(null)}
                    className="shrink-0 text-sm text-ink-500 hover:text-ink-700"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
          )}

          {!isEase && (
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
          )}

          {!isEase && (
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
          )}

          <PrimaryButton onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save changes' : isEase ? 'Add tug' : 'Add habit'}
          </PrimaryButton>

          {isEdit && onArchive && (
            <div className="text-center">
              <QuietLink onClick={onArchive}>{isEase ? 'Delete this tug' : 'Delete this habit'}</QuietLink>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

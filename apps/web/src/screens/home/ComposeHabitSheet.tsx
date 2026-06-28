import { useEffect, useState } from 'react';
import type { Area, Cadence, TimeOfDay } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import WatercolorWash from '../../components/WatercolorWash/WatercolorWash';
import { hexToRgba } from '../../lib/color';
import { CADENCE_OPTIONS, TIME_OF_DAY_OPTIONS, cadenceKey } from '../../lib/cadenceOptions';
import { PrimaryButton, QuietLink } from '../onboarding/ui';

const selectClass =
  'w-full rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 focus:ring-2 focus:ring-iris-500';

export interface HabitDraft {
  areaId: string;
  name: string;
  cadence: Cadence;
  timeOfDay: TimeOfDay;
}

// Create and edit share one sheet. The watercolour wash appears once an area
// is selected (section 4.3, the third of its three uses).
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

  useEffect(() => {
    if (!open) return;
    setAreaId(initial?.areaId ?? null);
    setName(initial?.name ?? '');
    setCadence(initial?.cadence ?? CADENCE_OPTIONS[0].value);
    setTimeOfDay(initial?.timeOfDay ?? 'anytime');
  }, [open, initial]);

  const selectedArea = areas.find((a) => a.id === areaId) ?? null;
  const canSave = name.trim().length > 0 && areaId != null;

  function handleSave() {
    if (!canSave || !areaId) return;
    onSave({ areaId, name: name.trim(), cadence, timeOfDay });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit habit' : 'Add habit'}>
      <div className="relative -mx-5 -mt-4 overflow-hidden px-5 pt-4">
        {selectedArea && <WatercolorWash color={selectedArea.color} height={320} />}

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

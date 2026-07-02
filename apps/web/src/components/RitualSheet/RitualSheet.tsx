import { useEffect, useMemo, useState } from 'react';
import type { Area, Habit, Ritual } from '@harmony/shared';
import { MAX_AREA_NAME } from '@harmony/shared';
import BottomSheet from '../BottomSheet/BottomSheet';
import { hexToRgba } from '../../lib/color';
import { PrimaryButton, QuietLink } from '../../screens/onboarding/ui';

// Create or edit a ritual: name it, then tap habits to add them in the order
// you'll move through them. The order badge makes the flow legible at a glance.
export default function RitualSheet({
  open,
  ritual,
  habits,
  areas,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  ritual: Ritual | null;
  habits: Habit[]; // active tend habits
  areas: Area[];
  onClose: () => void;
  onSave: (ritual: Ritual) => void;
  onDelete?: () => void;
}) {
  const isEdit = ritual != null;
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(ritual?.name ?? '');
    // Keep only ids that still exist, in the ritual's order.
    const live = new Set(habits.map((h) => h.id));
    setSelected((ritual?.habitIds ?? []).filter((id) => live.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ritual]);

  const colorOf = useMemo(() => {
    const areaColor = new Map(areas.map((a) => [a.id, a.color]));
    return (h: Habit) => h.color ?? areaColor.get(h.areaId) ?? '#5a636f';
  }, [areas]);

  const canSave = name.trim().length > 0 && selected.length >= 1;

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({ id: ritual?.id ?? crypto.randomUUID(), name: name.trim(), habitIds: selected });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit ritual' : 'New ritual'}>
      <div className="space-y-5 pb-4">
        <div>
          <label htmlFor="ritual-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            Name
          </label>
          <input
            id="ritual-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morning ritual"
            maxLength={MAX_AREA_NAME}
            className="w-full rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 placeholder:text-ink-300 focus:ring-2 focus:ring-iris-500"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-ink-700">Steps</p>
          <p className="mb-2.5 mt-0.5 text-xs text-ink-300">Tap habits to add them, in the order you'll do them.</p>
          {habits.length === 0 ? (
            <p className="text-sm text-ink-300">Add a habit or two first, then gather them into a ritual.</p>
          ) : (
            <div className="space-y-2">
              {habits.map((h) => {
                const idx = selected.indexOf(h.id);
                const on = idx >= 0;
                const c = colorOf(h);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors"
                    style={on ? { backgroundColor: hexToRgba(c, 0.12) } : { backgroundColor: 'var(--parchment-200)' }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={on ? { backgroundColor: c, color: '#fff' } : { boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)', color: 'transparent' }}
                    >
                      {on ? idx + 1 : ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{h.name}</span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <PrimaryButton onClick={handleSave} disabled={!canSave}>
          {isEdit ? 'Save ritual' : 'Create ritual'}
        </PrimaryButton>

        {isEdit && onDelete && (
          <div className="text-center">
            <QuietLink onClick={onDelete}>Delete this ritual</QuietLink>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

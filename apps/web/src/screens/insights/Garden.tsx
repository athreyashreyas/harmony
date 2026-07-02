import { useMemo, useState } from 'react';
import type { Area, Habit, Log } from '@harmony/shared';
import MiniBloom from '../../components/MiniBloom/MiniBloom';
import { computeGarden, type WeekBloom } from '../../lib/insights/garden';

// The Bloom garden: a scrollable garden of your past weeks, each week re-bloomed
// from your logs. Nothing is stored; every bloom is computed on the fly.
function caption(avg: number): string {
  if (avg >= 0.66) return 'In full bloom';
  if (avg >= 0.33) return 'Coming along';
  if (avg > 0) return 'A gentle week';
  return 'A resting week';
}

export default function Garden({ areas, habits, logs }: { areas: Area[]; habits: Habit[]; logs: Log[] }) {
  const weeks = useMemo(() => computeGarden({ areas, habits, logs }), [areas, habits, logs]);
  const [open, setOpen] = useState<WeekBloom | null>(null);

  if (areas.filter((a) => a.archivedAt == null).length === 0) {
    return <p className="mt-8 text-sm text-ink-300">Your garden grows as you tend. Add an area to begin.</p>;
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-ink-500">Every week, pressed and kept. Watch your life bloom and rest across the seasons.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {weeks.map((w) => {
          const isOpen = open?.start === w.start;
          return (
            <button
              key={w.start}
              type="button"
              onClick={() => setOpen(isOpen ? null : w)}
              className="flex flex-col items-center rounded-card bg-parchment-50 p-3 shadow-card transition-transform active:scale-[0.98]"
              style={isOpen ? { boxShadow: '0 0 0 2px var(--iris-500)' } : undefined}
            >
              <MiniBloom petals={w.petals} />
              <span className="mt-1.5 text-xs font-medium text-ink-900">{w.label}</span>
              <span className="text-[11px] text-ink-300">{caption(w.avg)}</span>
              {isOpen && (
                <span className="mt-2 w-full space-y-1 border-t border-parchment-200 pt-2">
                  {[...w.petals]
                    .filter((p) => p.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 text-left text-[11px] text-ink-500">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </span>
                    ))}
                  {w.petals.every((p) => p.value === 0) && <span className="block text-[11px] text-ink-300">Nothing tended this week.</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

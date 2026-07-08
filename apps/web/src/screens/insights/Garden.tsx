import { useMemo, useState } from 'react';
import type { Area, Habit, Log } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import WeekBloomWheel from '../../components/Bloom/WeekBloomWheel';
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

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function Garden({ areas, habits, logs }: { areas: Area[]; habits: Habit[]; logs: Log[] }) {
  const weeks = useMemo(() => computeGarden({ areas, habits, logs }), [areas, habits, logs]);
  const [openStart, setOpenStart] = useState<string | null>(null);
  const openWeek = weeks.find((w) => w.start === openStart) ?? null;

  if (areas.filter((a) => a.archivedAt == null).length === 0) {
    return <p className="mt-8 text-sm text-ink-300">Your garden grows as you tend. Add an area to begin.</p>;
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-ink-500">Every week, pressed and kept. Watch your life bloom and rest across the seasons.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {weeks.map((w) => (
          <button
            key={w.start}
            type="button"
            onClick={() => setOpenStart(w.start)}
            className="flex flex-col items-center rounded-card bg-parchment-50 p-3 shadow-card transition-transform active:scale-[0.98]"
            style={openStart === w.start ? { boxShadow: '0 0 0 2px var(--iris-500)' } : undefined}
          >
            <MiniBloom petals={w.petals} />
            <span className="mt-1.5 text-xs font-medium text-ink-900">{w.label}</span>
            <span className="text-[11px] text-ink-300">{caption(w.avg)}</span>
          </button>
        ))}
      </div>

      <BottomSheet open={openWeek != null} onClose={() => setOpenStart(null)} title={openWeek?.label}>
        {openWeek && <WeekDetail week={openWeek} />}
      </BottomSheet>
    </div>
  );
}

function WeekDetail({ week }: { week: WeekBloom }) {
  const tended = [...week.petals].filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const resting = week.petals.filter((p) => p.value === 0);

  return (
    <div className="pb-4">
      <p className="text-xs text-ink-300">
        {fmtDate(week.start)} – {fmtDate(week.end)}
      </p>

      <div className="mx-auto mt-3 w-full max-w-[260px]">
        <WeekBloomWheel petals={week.petals} />
      </div>
      <p className="text-center font-serif text-lg text-ink-900">{caption(week.avg)}</p>

      {week.petals.length > 0 && (
        <div className="mt-5 space-y-2.5 border-t border-parchment-200 pt-4">
          {tended.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{p.name}</span>
              <span className="shrink-0 text-xs font-medium text-ink-500">{Math.round(p.value * 100)}%</span>
            </div>
          ))}
          {resting.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full opacity-30" style={{ backgroundColor: p.color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-300">{p.name}</span>
              <span className="shrink-0 text-xs text-ink-300">resting</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

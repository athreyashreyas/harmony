import { useEffect, useMemo, useState } from 'react';
import type { Log } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import Skeleton from '../../components/Skeleton/Skeleton';
import { isoDaysAgo, formatDateMedium, formatMonthYear, monthGrid, startOfMonthISO, endOfMonthISO, todayISO } from '../../lib/time/dates';
import { logsInRange } from '../../lib/db/queries';
import { useUserData } from '../../lib/useUserData';

const MAX_DOTS_PER_DAY = 4;

function ChevronButton({ direction, onClick, disabled }: { direction: 'left' | 'right'; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous month' : 'Next month'}
      className="rounded-full p-2 text-ink-500 hover:text-ink-700 disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

export default function LogScreen() {
  const { profile, areas, habits, logs: weekLogs } = useUserData();

  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [monthLogs, setMonthLogs] = useState<Log[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setMonthLoading(true);
    void logsInRange(profile.id, startOfMonthISO(viewedMonth), endOfMonthISO(viewedMonth)).then((rows) => {
      setMonthLogs(rows);
      setMonthLoading(false);
    });
  }, [profile, viewedMonth]);

  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const dotsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of monthLogs) {
      if (!map.has(log.date)) map.set(log.date, new Set());
      map.get(log.date)!.add(log.areaId);
    }
    return map;
  }, [monthLogs]);

  const today = todayISO();
  const isCurrentMonth = startOfMonthISO(viewedMonth) === startOfMonthISO(new Date());

  const last7 = useMemo(() => {
    const tendedDates = new Set(weekLogs.map((l) => l.date));
    return Array.from({ length: 7 }, (_, i) => {
      const date = isoDaysAgo(6 - i);
      return { date, tended: tendedDates.has(date) };
    });
  }, [weekLogs]);
  const weekTendedCount = useMemo(
    () => new Set(weekLogs.filter((l) => l.date >= isoDaysAgo(6)).map((l) => `${l.habitId}:${l.date}`)).size,
    [weekLogs],
  );

  const selectedLogs = selectedDate ? monthLogs.filter((l) => l.date === selectedDate) : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Log</h1>
      <p className="mt-2 text-sm text-ink-300">A record of what you tended to.</p>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-300">This week</p>
          <p className="text-xs text-ink-300">{weekTendedCount} tended</p>
        </div>
        <div className="mt-3 flex justify-between">
          {last7.map(({ date, tended }) => (
            <span
              key={date}
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tended ? 'var(--iris-500)' : 'var(--parchment-300)' }}
            />
          ))}
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-center justify-between">
          <ChevronButton
            direction="left"
            onClick={() => setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          />
          <p className="text-sm font-medium text-ink-700">{formatMonthYear(viewedMonth)}</p>
          <ChevronButton
            direction="right"
            disabled={isCurrentMonth}
            onClick={() => setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          />
        </div>

        {monthLoading ? (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        ) : (
        <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="text-[10px] text-ink-300">
              {d}
            </span>
          ))}

          {monthGrid(viewedMonth).flatMap((row, ri) =>
            row.map((date, ci) => {
              if (!date) return <span key={`${ri}-${ci}`} />;
              const areaIds = Array.from(dotsByDate.get(date) ?? []);
              const isToday = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${formatDateMedium(date)}${areaIds.length ? ', tended' : ''}`}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={
                      isToday
                        ? 'flex h-6 w-6 items-center justify-center rounded-full text-xs text-ink-700 ring-1 ring-iris-500'
                        : 'flex h-6 w-6 items-center justify-center rounded-full text-xs text-ink-700'
                    }
                  >
                    {Number(date.slice(-2))}
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {areaIds.slice(0, MAX_DOTS_PER_DAY).map((areaId) => (
                      <span
                        key={areaId}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: areaById.get(areaId)?.color ?? 'var(--parchment-300)' }}
                      />
                    ))}
                  </span>
                </button>
              );
            }),
          )}
        </div>
        )}
      </section>

      <BottomSheet
        open={selectedDate != null}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDateMedium(selectedDate) : undefined}
      >
        <div className="space-y-2 pb-4">
          {selectedLogs.length === 0 ? (
            <p className="text-sm text-ink-300">Nothing logged that day.</p>
          ) : (
            selectedLogs.map((log) => {
              const habit = habitById.get(log.habitId);
              const area = areaById.get(log.areaId);
              return (
                <div key={log.id} className="rounded-card bg-parchment-100 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: area?.color ?? 'var(--parchment-300)' }}
                    />
                    <span className="text-sm text-ink-900">{habit?.name ?? 'A habit'}</span>
                  </div>
                  {log.note && <p className="mt-1.5 text-sm text-ink-500">{log.note}</p>}
                </div>
              );
            })
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

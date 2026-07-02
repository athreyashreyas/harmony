import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Habit, Log } from '@harmony/shared';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import Skeleton from '../../components/Skeleton/Skeleton';
import TruncatedText from '../../components/TruncatedText/TruncatedText';
import { isoDaysAgo, formatDateMedium, formatMonthYear, monthGrid, startOfMonthISO, endOfMonthISO, todayISO } from '../../lib/time/dates';
import { isHabitDueOn } from '../../lib/time/cadence';
import { logsInRange } from '../../lib/db/queries';
import { useUserData } from '../../lib/useUserData';
import { useLogs } from '../../store/useLogs';

function CheckCircle({ done, color }: { done: boolean; color: string }) {
  return (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
      style={done ? { backgroundColor: color } : { boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)' }}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

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
  const toggle = useLogs((s) => s.toggle);

  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [monthLogs, setMonthLogs] = useState<Log[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const refreshMonth = useCallback(async () => {
    if (!profile) return;
    const rows = await logsInRange(profile.id, startOfMonthISO(viewedMonth), endOfMonthISO(viewedMonth));
    setMonthLogs(rows);
  }, [profile, viewedMonth]);

  useEffect(() => {
    if (!profile) return;
    setMonthLoading(true);
    void refreshMonth().finally(() => setMonthLoading(false));
  }, [profile, refreshMonth]);

  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const easeIds = useMemo(
    () => new Set(habits.filter((h) => h.polarity === 'ease').map((h) => h.id)),
    [habits],
  );

  // Calendar dots mean "tended", so tug logs don't earn one.
  const dotsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of monthLogs) {
      if (easeIds.has(log.habitId)) continue;
      if (!map.has(log.date)) map.set(log.date, new Set());
      map.get(log.date)!.add(log.areaId);
    }
    return map;
  }, [monthLogs, easeIds]);

  const today = todayISO();
  const isCurrentMonth = startOfMonthISO(viewedMonth) === startOfMonthISO(new Date());

  // The week strip and count mean "tended", so tug logs don't count, the same
  // as the calendar dots below.
  const last7 = useMemo(() => {
    const tendedDates = new Set(weekLogs.filter((l) => !easeIds.has(l.habitId)).map((l) => l.date));
    return Array.from({ length: 7 }, (_, i) => {
      const date = isoDaysAgo(6 - i);
      return { date, tended: tendedDates.has(date) };
    });
  }, [weekLogs, easeIds]);
  const weekTendedCount = useMemo(() => {
    const since = isoDaysAgo(6);
    return new Set(
      weekLogs
        .filter((l) => l.date >= since && !easeIds.has(l.habitId))
        .map((l) => `${l.habitId}:${l.date}`),
    ).size;
  }, [weekLogs, easeIds]);

  // Habits you can log for the selected day: those that existed then, with the
  // ones actually scheduled that day shown first.
  const dayHabits = useMemo(() => {
    if (!selectedDate) return [] as Habit[];
    return habits
      .filter(
        (h) =>
          h.archivedAt == null &&
          h.startDate <= selectedDate &&
          (h.endDate == null || h.endDate >= selectedDate),
      )
      .sort((a, b) => {
        const da = isHabitDueOn(a, selectedDate) ? 0 : 1;
        const db = isHabitDueOn(b, selectedDate) ? 0 : 1;
        return da - db || a.order - b.order;
      });
  }, [habits, selectedDate]);

  const dayLogByHabit = useMemo(() => {
    const map = new Map<string, Log>();
    if (selectedDate) for (const l of monthLogs) if (l.date === selectedDate) map.set(l.habitId, l);
    return map;
  }, [monthLogs, selectedDate]);

  const isFutureDay = selectedDate ? selectedDate > today : false;

  async function toggleForDay(habit: Habit) {
    if (!selectedDate || isFutureDay) return;
    await toggle(habit, selectedDate);
    await refreshMonth();
  }

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
          {isFutureDay ? (
            <p className="text-sm text-ink-300">This day hasn't happened yet.</p>
          ) : dayHabits.length === 0 ? (
            <p className="text-sm text-ink-300">No habits existed on this day.</p>
          ) : (
            <>
              <p className="pb-1 text-xs text-ink-300">Tap to mark or unmark what you tended to.</p>
              {dayHabits.map((habit) => {
                const area = areaById.get(habit.areaId);
                const isTug = habit.polarity === 'ease';
                const accent = isTug ? '#5a636f' : habit.color ?? area?.color ?? 'var(--iris-500)';
                const log = dayLogByHabit.get(habit.id);
                const done = log != null;
                const due = selectedDate ? isHabitDueOn(habit, selectedDate) : false;
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => void toggleForDay(habit)}
                    aria-pressed={done}
                    className={
                      isTug
                        ? 'flex w-full items-center gap-3 rounded-card border border-dashed border-[#5a636f]/45 px-3 py-2.5 text-left'
                        : 'flex w-full items-center gap-3 rounded-card bg-parchment-100 px-3 py-2.5 text-left'
                    }
                  >
                    <CheckCircle done={done} color={accent} />
                    <span className="min-w-0 flex-1">
                      <TruncatedText text={habit.name} className={done ? 'text-sm text-ink-500 line-through' : 'text-sm text-ink-900'} />
                      {log?.note ? (
                        <span className="line-clamp-2 text-xs italic text-ink-500">&ldquo;{log.note}&rdquo;</span>
                      ) : (
                        !isTug && !due && <span className="block text-xs text-ink-300">Not scheduled that day</span>
                      )}
                    </span>
                    {isTug ? (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-300">tug</span>
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: area?.color ?? 'var(--parchment-300)' }} />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

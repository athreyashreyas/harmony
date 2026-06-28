import type { Cadence, Habit } from '@harmony/shared';
import { daysBetween, todayISO } from './dates';

// Whether a habit's cadence schedules it on a given day, ignoring start and
// end dates and log history. Used both for "is this on today's list" and for
// estimating expected completions over a window (the Bloom's activity ratio).
function cadenceMatchesDay(cadence: Cadence, dayOfWeek: number, dayIndexFromStart: number): boolean {
  switch (cadence.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'specific-days':
      return cadence.days.includes(dayOfWeek);
    case 'every-n-days':
      return dayIndexFromStart % Math.max(1, cadence.n) === 0;
    case 'times-per-week':
      // Times-per-week is flexible by design: the user picks which days. We
      // show it every day and let the day's own log state mark it done,
      // rather than guessing which days they meant.
      return true;
  }
}

export function isHabitDueOn(habit: Habit, dateISO: string): boolean {
  if (habit.archivedAt != null) return false;
  if (dateISO < habit.startDate) return false;
  if (habit.endDate != null && dateISO > habit.endDate) return false;

  const date = new Date(`${dateISO}T00:00:00`);
  const dayOfWeek = date.getDay();
  const dayIndexFromStart = daysBetween(habit.startDate, dateISO);
  return cadenceMatchesDay(habit.cadence, dayOfWeek, dayIndexFromStart);
}

export function isHabitDueToday(habit: Habit): boolean {
  return isHabitDueOn(habit, todayISO());
}

// Expected number of completions for a cadence over a trailing window of
// `windowDays` days. Used to normalise the Bloom's activity ratio (section
// 9.2). Approximated from the cadence shape rather than walked day by day,
// since the window is always a whole number of weeks in practice (14 days).
export function expectedCompletionsInWindow(cadence: Cadence, windowDays: number): number {
  const weeks = windowDays / 7;
  switch (cadence.kind) {
    case 'daily':
      return windowDays;
    case 'weekdays':
      return weeks * 5;
    case 'weekends':
      return weeks * 2;
    case 'specific-days':
      return weeks * cadence.days.length;
    case 'times-per-week':
      return weeks * cadence.times;
    case 'every-n-days':
      return windowDays / Math.max(1, cadence.n);
  }
}

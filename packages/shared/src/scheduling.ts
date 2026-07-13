import type { Cadence, Habit } from './types';
import { daysBetween, todayISO } from './time';

// A habit whose cadence is missing or malformed (data from an older schema, a
// partial sync, a corrupt draft) must never crash the app. Reading `.kind` off
// an undefined cadence would throw and white-screen every screen that computes
// the Bloom or today's list, so we fall back to the app's default cadence and
// let the habit still appear and still count. Exported so every reader routes
// its cadence through the same guard.
const FALLBACK_CADENCE: Cadence = { kind: 'daily' };
export function safeCadence(cadence: Cadence | null | undefined): Cadence {
  return cadence && typeof cadence === 'object' && typeof cadence.kind === 'string'
    ? cadence
    : FALLBACK_CADENCE;
}

// Whether a habit's cadence schedules it on a given day, ignoring start and end
// dates and log history. Used both for "is this on today's list" and for
// estimating expected completions over a window (the Bloom's activity ratio).
// Lives in shared so the push worker schedules reminders the same way the app
// builds today's list.
export function isHabitDueOn(habit: Habit, dateISO: string): boolean {
  if (habit.archivedAt != null) return false;
  // Tugs are never scheduled; they're logged manually when they happen.
  if (habit.polarity === 'ease') return false;
  if (dateISO < habit.startDate) return false;
  if (habit.endDate != null && dateISO > habit.endDate) return false;

  const cadence = safeCadence(habit.cadence);
  const date = new Date(`${dateISO}T00:00:00`);
  const start = new Date(`${habit.startDate}T00:00:00`);
  const dayOfWeek = date.getDay();

  switch (cadence.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'specific-days':
      return (cadence.days ?? []).includes(dayOfWeek);
    case 'times-per-week':
      // Flexible by design: the user picks which days. We show it every day and
      // let the day's own log state mark it done, rather than guess the days.
      return true;
    case 'every-n-days':
      return daysBetween(habit.startDate, dateISO) % Math.max(1, cadence.n ?? 1) === 0;
    case 'every-n-weeks': {
      const days = daysBetween(habit.startDate, dateISO);
      return days % (7 * Math.max(1, cadence.n ?? 1)) === 0;
    }
    case 'every-n-months': {
      const monthsApart =
        (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
      if (monthsApart < 0 || monthsApart % Math.max(1, cadence.n ?? 1) !== 0) return false;
      // Due on the start day-of-month, clamped to this month's last day.
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return date.getDate() === Math.min(start.getDate(), lastDay);
    }
    default:
      // Unknown cadence kind: show it rather than silently hide the habit.
      return true;
  }
}

export function isHabitDueToday(habit: Habit): boolean {
  return isHabitDueOn(habit, todayISO());
}

// Expected number of completions for a cadence over a trailing window of
// `windowDays` days. Used to normalise the Bloom's activity ratio (section
// 9.2). Approximated from the cadence shape rather than walked day by day,
// since the window is always a whole number of weeks in practice (14 days).
export function expectedCompletionsInWindow(rawCadence: Cadence, windowDays: number): number {
  const cadence = safeCadence(rawCadence);
  const weeks = windowDays / 7;
  switch (cadence.kind) {
    case 'daily':
      return windowDays;
    case 'weekdays':
      return weeks * 5;
    case 'weekends':
      return weeks * 2;
    case 'specific-days':
      return weeks * (cadence.days ?? []).length;
    case 'times-per-week':
      return weeks * (cadence.times ?? 0);
    case 'every-n-days':
      return windowDays / Math.max(1, cadence.n ?? 1);
    case 'every-n-weeks':
      return windowDays / (7 * Math.max(1, cadence.n ?? 1));
    case 'every-n-months':
      return windowDays / (30 * Math.max(1, cadence.n ?? 1));
    default:
      return windowDays;
  }
}

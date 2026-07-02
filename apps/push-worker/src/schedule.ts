// The worker's pure scheduling helpers: local-time formatting, the
// do-not-disturb window, the "is this minute due" catch-up check, and the
// deterministic reminder/summary phrasings. Kept free of any I/O or Worker
// runtime state so they can be reasoned about (and unit-tested) on their own,
// and imported by index.ts where the sending happens.
import type { Habit } from '@harmony/shared';

// Local "HH:mm" in the user's timezone, for the do-not-disturb check.
export function localHHmm(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  }
}

export function withinDnd(now: Date, timezone: string, start: string, end: string): boolean {
  const cur = localHHmm(now, timezone);
  // Overnight window (e.g. 21:00 to 07:00) wraps past midnight.
  if (start <= end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

// The user's local calendar date ("YYYY-MM-DD"), matching how the app stamps
// log.date. Used to tell "due today" and "logged today" from the worker.
export function localDateISO(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// True when the scheduled `targetMin` is due: it has passed today and we are
// still within the catch-up window. Pairing this with a once-per-day guard
// means a delayed or skipped cron run won't drop the reminder.
export function isDue(nowMin: number, targetMin: number, windowMin: number): boolean {
  const diff = nowMin - targetMin;
  return diff >= 0 && diff < windowMin;
}

// A small, warm set of reminder phrasings, picked deterministically per
// habit-and-day so it stays put within a day but varies across days.
const REMINDER_LINES = [
  (name: string) => `A small moment for ${name}?`,
  (name: string) => `${name}, whenever you're ready.`,
  (name: string) => `Now might be a good time for ${name}.`,
  (name: string) => `${name} is here when you are.`,
];

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function reminderText(name: string, seed: string): string {
  return REMINDER_LINES[hashString(seed) % REMINDER_LINES.length](name);
}

export function summaryText(unlogged: Habit[]): string {
  const names = unlogged.map((h) => h.name);
  if (names.length === 1) return `${names[0]} is still waiting today. No rush.`;
  if (names.length <= 3) return `Still waiting today: ${names.join(', ')}.`;
  return `${names.length} things are still waiting today. Even one counts.`;
}

// Date helpers (section 3: lib/time/). Dates that represent a day (not a
// moment) are ISO strings, "YYYY-MM-DD", in local time.

export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoDaysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return todayISO(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export type DaySegment = 'morning' | 'afternoon' | 'evening' | 'night';

export function daySegment(date: Date = new Date()): DaySegment {
  const hour = date.getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function greetingWord(date: Date = new Date()): string {
  const segment = daySegment(date);
  if (segment === 'morning') return 'Good morning';
  if (segment === 'afternoon') return 'Good afternoon';
  return 'Good evening';
}

function dateFromISO(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00`);
}

export function weekdayLong(dateISO: string): string {
  return dateFromISO(dateISO).toLocaleDateString(undefined, { weekday: 'long' });
}

// Medium date for note thread cards, e.g. "Thursday, June 12".
export function formatDateMedium(dateISO: string): string {
  return dateFromISO(dateISO).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Phrase for "Last tended ..." (section 11.1). Combines the weekday of the
// day it counted for with the time of day it was actually tapped.
export function lastTendedPhrase(dateISO: string, loggedAt: number): string {
  return `${weekdayLong(dateISO)} ${daySegment(new Date(loggedAt))}`;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function startOfMonthISO(date: Date): string {
  return todayISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonthISO(date: Date): string {
  return todayISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

// A 6 row by 7 column grid of ISO dates for the month-view calendar (section
// 12), padded with null outside the month so every row is a full week.
// Weeks start on Sunday, matching the cadence model's 0=Sun day numbering.
export function monthGrid(date: Date): (string | null)[][] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startWeekday = first.getDay();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(todayISO(new Date(date.getFullYear(), date.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

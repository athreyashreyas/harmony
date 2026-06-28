// The subset of date helpers the pure engine (templates + drift) needs, shared
// between web and worker so the two stay byte-identical. App-only date helpers
// (formatting, the month grid, greetings) stay in the web's lib/time/dates.ts,
// which re-exports these.
//
// Dates that represent a day (not a moment) are ISO strings, "YYYY-MM-DD", in
// local time.

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

export type DaySegment = 'morning' | 'afternoon' | 'evening' | 'night';

export function daySegment(date: Date = new Date()): DaySegment {
  const hour = date.getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// App-only date helpers (formatting, the month grid, greetings). The pure
// helpers the engine also needs (todayISO, isoDaysAgo, daysBetween, daySegment)
// live in @harmony/shared so web and worker share them; they are re-exported
// here so every existing import path keeps working.
import { daySegment, todayISO } from '@harmony/shared';

export { todayISO, isoDaysAgo, daysBetween, daySegment } from '@harmony/shared';
export type { DaySegment } from '@harmony/shared';

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
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

// Day of week for an ISO date, 0=Sunday..6=Saturday, matching the cadence
// model's numbering. Used wherever logs are bucketed by weekday (patterns,
// observations, suggestions) so the parse-and-getDay dance lives in one place.
export function weekdayOf(dateISO: string): number {
  return dateFromISO(dateISO).getDay();
}

// The Sunday that starts the week containing `dateISO` (defaults to today), as
// an ISO date. Weeks start on Sunday to match weekdayOf.
export function startOfWeekISO(dateISO: string = todayISO()): string {
  const date = dateFromISO(dateISO);
  date.setDate(date.getDate() - date.getDay());
  return todayISO(date);
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

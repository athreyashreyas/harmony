import type { Area, Habit, Log } from '@harmony/shared';
import { computeAreaActivity } from '../../components/Bloom/activity';
import { daysBetween, isoDaysAgo, startOfWeekISO, todayISO } from '../time/dates';

// The Bloom garden: each past week re-blooms from the logs you already have, so
// you can scroll a garden of your weeks. Pure and derived — it stores nothing
// new; every bloom is recomputed on the fly from existing logs.

export interface GardenPetal {
  id: string;
  name: string;
  color: string;
  value: number; // 0..1 petal fill for that week
}

export interface WeekBloom {
  start: string; // week's Sunday (ISO)
  end: string; // week's Saturday, clamped to today for the current week
  label: string;
  petals: GardenPetal[];
  avg: number; // mean petal fill, for a one-line caption
}

// A year and a half of weeks is plenty to scroll; keeps the compute bounded.
const MAX_WEEKS = 78;

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function weekLabel(i: number, start: string, end: string): string {
  if (i === 0) return 'This week';
  if (i === 1) return 'Last week';
  return `${fmt(start)} – ${fmt(end)}`;
}

export function computeGarden(
  input: { areas: Area[]; habits: Habit[]; logs: Log[] },
  now: Date = new Date(),
): WeekBloom[] {
  const today = todayISO(now);
  const areas = input.areas.filter((a) => a.archivedAt == null);

  // How far back to go: the week of the first activity (log or area creation).
  let earliest = today;
  for (const l of input.logs) if (l.date < earliest) earliest = l.date;
  for (const a of areas) {
    const created = todayISO(new Date(a.createdAt));
    if (created < earliest) earliest = created;
  }
  const firstWeek = startOfWeekISO(earliest);
  const currentWeek = startOfWeekISO(today);
  const totalWeeks = Math.min(MAX_WEEKS, Math.max(1, Math.floor(daysBetween(firstWeek, currentWeek) / 7) + 1));

  const out: WeekBloom[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const start = startOfWeekISO(isoDaysAgo(i * 7, now));
    const saturday = isoDaysAgo(-6, new Date(`${start}T00:00:00`)); // start + 6 days
    const end = saturday > today ? today : saturday;
    const petals = areas.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      value: computeAreaActivity(a, input.habits, input.logs, 7, end),
    }));
    const avg = petals.length ? petals.reduce((s, p) => s + p.value, 0) / petals.length : 0;
    out.push({ start, end, label: weekLabel(i, start, end), petals, avg });
  }
  return out; // most recent week first
}

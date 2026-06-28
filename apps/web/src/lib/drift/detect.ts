import type { Area, Habit, Log, NudgeHistory } from '@harmony/shared';
import { daysBetween, isoDaysAgo, todayISO } from '../time/dates';
import { isDriftTemplate } from '../templates/library';
import { cadenceGapDays, clamp, median } from './cadence';

// Drift detection (section 16). Pure: decides which areas should fire a drift
// nudge right now, given the user's data. The same core runs client-side on
// app open (for the in-app banner) and server-side in the worker every 15
// minutes (for push). The worker layers its own anti-spam, do-not-disturb,
// and notification toggles on top; those are push concerns, not banner ones.

const HISTORY_DAYS = 60;
const DAY_MS = 86_400_000;
const NO_REPEAT_DAYS = 3;

export interface DriftCandidate {
  area: Area;
  daysSinceLast: number;
  cadence: number;
}

function areaCadence(area: Area, habits: Habit[], logs: Log[], now: Date): number {
  const since = isoDaysAgo(HISTORY_DAYS - 1, now);
  const dates = Array.from(
    new Set(logs.filter((l) => l.areaId === area.id && l.date >= since).map((l) => l.date)),
  ).sort();

  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(daysBetween(dates[i - 1], dates[i]));
  }

  const fromLogs = median(gaps);
  if (fromLogs != null) return clamp(fromLogs, 1, 14);

  // No usable history: fall back to the median of the area's habit cadences.
  const areaHabits = habits.filter((h) => h.areaId === area.id && h.archivedAt == null);
  const fromHabits = median(areaHabits.map((h) => cadenceGapDays(h.cadence)));
  return fromHabits != null ? clamp(fromHabits, 1, 14) : 7;
}

function daysSinceLastLog(area: Area, logs: Log[], now: Date): number {
  const today = todayISO(now);
  const areaDates = logs.filter((l) => l.areaId === area.id).map((l) => l.date);
  if (areaDates.length > 0) {
    const last = areaDates.reduce((a, b) => (a > b ? a : b));
    return daysBetween(last, today);
  }
  // Never tended: measure from when the area was created.
  return daysBetween(todayISO(new Date(area.createdAt)), today);
}

function firedRecently(area: Area, nudgeHistory: NudgeHistory[], now: Date): boolean {
  const cutoff = now.getTime() - NO_REPEAT_DAYS * DAY_MS;
  return nudgeHistory.some(
    (n) => n.areaId === area.id && n.sentAt >= cutoff && isDriftTemplate(n.templateId),
  );
}

export function detectDrift(input: {
  areas: Area[];
  habits: Habit[];
  logs: Log[];
  nudgeHistory: NudgeHistory[];
  now: Date;
}): DriftCandidate[] {
  const { areas, habits, logs, nudgeHistory, now } = input;
  const candidates: DriftCandidate[] = [];

  for (const area of areas) {
    if (area.archivedAt != null) continue;
    if (area.importance === 'optional') continue; // optional areas get no drift nudges

    const cadence = areaCadence(area, habits, logs, now);
    const daysSince = daysSinceLastLog(area, logs, now);
    const threshold =
      area.importance === 'core' ? Math.max(cadence * 1.5, 5) : Math.max(cadence * 2.0, 10);

    if (daysSince > threshold && !firedRecently(area, nudgeHistory, now)) {
      candidates.push({ area, daysSinceLast: daysSince, cadence });
    }
  }

  // Most attentive areas first, then the longest silence.
  const rank = { core: 0, matters: 1, optional: 2 } as const;
  return candidates.sort(
    (a, b) =>
      rank[a.area.importance] - rank[b.area.importance] || b.daysSinceLast - a.daysSinceLast,
  );
}

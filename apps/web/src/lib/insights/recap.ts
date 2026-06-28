import type { Area, Habit, Log, UserProfile } from '@harmony/shared';
import { daysSinceLastLog } from '../drift/detect';
import { renderTemplate } from '../templates/composer';
import { getTemplate } from '../templates/library';
import { countPhrase, joinWithAnd } from '../text';
import { expectedCompletionsInWindow } from '../time/cadence';
import { isoDaysAgo, weekdayLong } from '../time/dates';

// The weekly recap (section 13.1). Composed from real facts, picked
// deterministically (not the random nudge composer), each rendered through a
// 'weekly-recap-sentence' template so every noun is still either the user's
// own word or a fact about them. Five lines max: up to one strong area, one
// steady area, one quiet area, one grouped nice-to-have line, and the closer.
//
// "This week" is the 7 days ending yesterday: the recap reads as something
// opened on a fresh Sunday, recapping the week that just finished.

export interface RecapLine {
  text: string;
  areaId: string | null;
}

const WEEK_DAYS = 7;

function render(id: string, values: Record<string, string>): string {
  const template = getTemplate(id);
  return template ? renderTemplate(template.body, values) : '';
}

interface AreaWeek {
  area: Area;
  actual: number;
  expected: number;
  daysSince: number;
}

function summarizeWeek(area: Area, habits: Habit[], logs: Log[], now: Date): AreaWeek {
  const weekStart = isoDaysAgo(WEEK_DAYS, now);
  const weekEnd = isoDaysAgo(1, now);
  const areaHabits = habits.filter((h) => h.areaId === area.id && h.archivedAt == null);
  const habitIds = new Set(areaHabits.map((h) => h.id));

  const actualDates = new Set<string>();
  for (const log of logs) {
    if (!habitIds.has(log.habitId)) continue;
    if (log.date < weekStart || log.date > weekEnd) continue;
    actualDates.add(`${log.habitId}:${log.date}`);
  }

  const expected = areaHabits.reduce(
    (sum, h) => sum + expectedCompletionsInWindow(h.cadence, WEEK_DAYS),
    0,
  );

  return { area, actual: actualDates.size, expected, daysSince: daysSinceLastLog(area, logs, now) };
}

// The habit within the area with the most completions this week, for the
// strong/steady supporting sentence.
function bestHabitThisWeek(
  area: Area,
  habits: Habit[],
  logs: Log[],
  now: Date,
): { habit: Habit; count: number; lastDate: string } | null {
  const weekStart = isoDaysAgo(WEEK_DAYS, now);
  const weekEnd = isoDaysAgo(1, now);
  const areaHabits = habits.filter((h) => h.areaId === area.id && h.archivedAt == null);

  let best: { habit: Habit; count: number; lastDate: string } | null = null;
  for (const habit of areaHabits) {
    const dates = logs
      .filter((l) => l.habitId === habit.id && l.date >= weekStart && l.date <= weekEnd)
      .map((l) => l.date);
    if (dates.length === 0) continue;
    const lastDate = dates.reduce((a, b) => (a > b ? a : b));
    if (!best || dates.length > best.count) best = { habit, count: dates.length, lastDate };
  }
  return best;
}

export function composeWeeklyRecap(input: {
  areas: Area[];
  habits: Habit[];
  logs: Log[];
  profile: UserProfile;
  now?: Date;
}): RecapLine[] {
  const { habits, logs, now = new Date() } = input;
  const areas = input.areas.filter((a) => a.archivedAt == null);
  const lines: RecapLine[] = [];

  const attentive = areas.filter((a) => a.importance !== 'optional');
  const weeks = attentive.map((area) => summarizeWeek(area, habits, logs, now));

  const strong = weeks
    .filter((w) => w.expected > 0 && w.actual / w.expected >= 1)
    .sort((a, b) => b.actual / b.expected - a.actual / a.expected)[0];

  const steady = weeks
    .filter((w) => w !== strong && w.actual > 0 && (w.expected === 0 || w.actual / w.expected < 1))
    .sort((a, b) => b.actual - a.actual)[0];

  const quiet = weeks
    .filter((w) => w !== strong && w !== steady && w.daysSince >= WEEK_DAYS && w.area.whySentence)
    .sort((a, b) => b.daysSince - a.daysSince)[0];

  if (strong) {
    const detail = bestHabitThisWeek(strong.area, habits, logs, now);
    lines.push({
      areaId: strong.area.id,
      text: render('recap-strong', {
        areaName: strong.area.name,
        habitName: detail?.habit.name ?? '',
        countPhrase: detail ? countPhrase(detail.count) : '',
      }),
    });
  }

  if (steady) {
    const detail = bestHabitThisWeek(steady.area, habits, logs, now);
    lines.push({
      areaId: steady.area.id,
      text: render('recap-steady', {
        areaName: steady.area.name,
        habitName: detail?.habit.name ?? '',
        lastDayName: detail ? weekdayLong(detail.lastDate) : '',
      }),
    });
  }

  if (quiet) {
    lines.push({
      areaId: quiet.area.id,
      text: render('recap-quiet', {
        areaName: quiet.area.name,
        daysSince: String(quiet.daysSince),
        whySentence: quiet.area.whySentence,
      }),
    });
  }

  const niceToHave = areas.filter((a) => a.importance === 'optional');
  if (niceToHave.length > 0) {
    const templateId = niceToHave.length === 1 ? 'recap-nice-single' : 'recap-nice-multi';
    lines.push({
      areaId: null,
      text: render(templateId, { areaNames: joinWithAnd(niceToHave.map((a) => a.name)) }),
    });
  }

  if (lines.length > 0) {
    lines.push({ areaId: null, text: render('recap-fresh', {}) });
  }

  return lines;
}

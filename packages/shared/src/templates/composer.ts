import type { Area, Habit, UserProfile, WeatherSummary } from '../types';
import type { Template, TemplateCondition, TemplateType } from '../templateTypes';
import { daySegment, type DaySegment } from '../time';
import { TEMPLATES } from './library';

// The composer (section 15.2). Pure: given the same inputs it returns the same
// output, modulo the random pick. To keep it pure (and byte for byte
// mirrorable into the worker) it does not read the database itself. Instead the
// caller passes recentTemplateIds (the ids used for this area and type in the
// last 14 days) so step 2 of the selection algorithm can run here, and the
// caller records the chosen nudge into history afterward.

export interface ComposeContext {
  now: Date;
  weather?: WeatherSummary | null;
  daysSinceLastLog?: number;
  profile: UserProfile;
  recentTemplateIds?: string[];
  random?: () => number;
}

export interface ComposeInput {
  type: TemplateType;
  area?: Area;
  habit?: Habit;
  context: ComposeContext;
}

const PLACEHOLDER = /\{(\w+)(?:\.(\w+))?\}/g;

function timeOfDayPhrase(segment: DaySegment): string {
  switch (segment) {
    case 'morning':
      return 'this morning';
    case 'afternoon':
      return 'this afternoon';
    case 'evening':
      return 'this evening';
    case 'night':
      return 'tonight';
  }
}

function lastDayPhrase(daysSince: number, now: Date): string {
  if (daysSince <= 0) return 'today';
  if (daysSince === 1) return 'yesterday';
  const then = new Date(now);
  then.setDate(then.getDate() - daysSince);
  const weekday = then.toLocaleDateString(undefined, { weekday: 'long' });
  if (daysSince <= 6) return weekday;
  if (daysSince <= 13) return `last ${weekday}`;
  return `${daysSince} days ago`;
}

function buildValues(input: ComposeInput): Record<string, string> {
  const { area, habit, context } = input;
  const { now, weather, daysSinceLastLog, profile } = context;
  return {
    whySentence: area?.whySentence ?? '',
    areaName: area?.name ?? '',
    habitName: habit?.name ?? '',
    firstName: profile.firstName,
    daysSince: daysSinceLastLog != null ? String(daysSinceLastLog) : '',
    lastDayPhrase: daysSinceLastLog != null ? lastDayPhrase(daysSinceLastLog, now) : '',
    timeOfDay: timeOfDayPhrase(daySegment(now)),
    weatherPhrase: weather?.phrase ?? '',
  };
}

// Replaces {placeholder} and {placeholder.titleCase} tokens, then tidies the
// spacing left behind by an empty value (most often weatherPhrase).
export function renderTemplate(body: string, values: Record<string, string>): string {
  const out = body.replace(PLACEHOLDER, (match, key: string, mod?: string) => {
    if (!(key in values)) return match;
    let value = values[key] ?? '';
    if (mod === 'titleCase' && value) value = value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  });
  return out
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// A template is usable only if every placeholder it needs has a value.
// weatherPhrase is exempt: it is often empty by design and simply drops out.
function canUseTemplate(template: Template, values: Record<string, string>): boolean {
  const matches = template.body.matchAll(PLACEHOLDER);
  for (const m of matches) {
    const key = m[1];
    if (key === 'weatherPhrase') continue;
    if (!values[key]) return false;
  }
  return true;
}

function matchesCondition(c: TemplateCondition, input: ComposeInput): boolean {
  const { now, weather, daysSinceLastLog } = input.context;
  if (c.timeOfDay && !c.timeOfDay.includes(daySegment(now))) return false;
  if (c.dayOfWeek && !c.dayOfWeek.includes(now.getDay())) return false;
  if (c.weather && !(weather && c.weather.includes(weather.kind))) return false;
  if (c.minDaysSince != null && !(daysSinceLastLog != null && daysSinceLastLog >= c.minDaysSince)) return false;
  if (c.maxDaysSince != null && !(daysSinceLastLog != null && daysSinceLastLog <= c.maxDaysSince)) return false;
  if (c.importance && !(input.area && c.importance.includes(input.area.importance))) return false;
  return true;
}

// No conditions means always eligible. Multiple conditions are alternatives
// (OR across the array); fields within one condition all have to match (AND).
function matchesConditions(template: Template, input: ComposeInput): boolean {
  if (!template.conditions?.length) return true;
  return template.conditions.some((c) => matchesCondition(c, input));
}

function weightedPick(pool: Template[], random: () => number): Template {
  const total = pool.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let r = random() * total;
  for (const t of pool) {
    r -= t.weight ?? 1;
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

export function compose(input: ComposeInput): { templateId: string; text: string } | null {
  const values = buildValues(input);
  const recent = input.context.recentTemplateIds ?? [];
  const random = input.context.random ?? Math.random;

  const eligible = TEMPLATES.filter(
    (t) => t.type === input.type && matchesConditions(t, input) && canUseTemplate(t, values),
  );
  if (eligible.length === 0) return null;

  // Prefer templates not used recently for this area and type; if everything
  // has been used, allow a repeat rather than going silent.
  let pool = eligible.filter((t) => !recent.includes(t.id));
  if (pool.length === 0) pool = eligible;

  const chosen = weightedPick(pool, random);
  return { templateId: chosen.id, text: renderTemplate(chosen.body, values) };
}

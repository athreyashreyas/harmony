import type { Area, Cadence, Habit, TimeOfDay } from '@harmony/shared';
import { todayISO } from './time/dates';

// The editable shape of a habit, as the compose sheet collects it. Everything
// else on a Habit (id, ownership, timestamps, ordering) is assigned at create
// time by createHabit. Re-exported from ComposeHabitSheet for existing imports.
export interface HabitDraft {
  areaId: string;
  name: string;
  cadence: Cadence;
  timeOfDay: TimeOfDay;
  color?: string;
  reminderTime: string | null;
}

// The editable shape of an area, as the area sheet collects it. Re-exported
// from AreaSheet for existing imports.
export type AreaFields = Pick<
  Area,
  'name' | 'color' | 'importance' | 'whySentence' | 'driftSensitivity' | 'reminderTimeOfDay'
>;

// Single home for building a fresh Habit, so the field list (and the order it
// must merge in) lives in exactly one place rather than being re-spelled at
// every create site.
export function createHabit(
  draft: HabitDraft,
  opts: { userId: string; order: number; startDate?: string; createdAt?: number },
): Habit {
  return {
    id: crypto.randomUUID(),
    userId: opts.userId,
    startDate: opts.startDate ?? todayISO(),
    endDate: null,
    order: opts.order,
    createdAt: opts.createdAt ?? Date.now(),
    archivedAt: null,
    ...draft,
  };
}

// Single home for building a fresh Area. Pass an explicit id/createdAt when the
// caller already minted them (onboarding builds areas and their habits together
// against the same id and timestamp).
export function createArea(
  fields: AreaFields,
  opts: { userId: string; order: number; id?: string; createdAt?: number },
): Area {
  return {
    id: opts.id ?? crypto.randomUUID(),
    userId: opts.userId,
    order: opts.order,
    createdAt: opts.createdAt ?? Date.now(),
    archivedAt: null,
    ...fields,
  };
}

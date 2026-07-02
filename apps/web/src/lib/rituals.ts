import type { Habit, Ritual } from '@harmony/shared';

// The habits of a ritual, in the ritual's own order, with any that no longer
// exist (deleted or archived) quietly skipped. The one place this resolution
// happens, so the flow player and the Home cards agree.
export function ritualHabits(ritual: Ritual, habits: Habit[]): Habit[] {
  const byId = new Map(habits.filter((h) => h.archivedAt == null).map((h) => [h.id, h]));
  return ritual.habitIds.map((id) => byId.get(id)).filter((h): h is Habit => h != null);
}

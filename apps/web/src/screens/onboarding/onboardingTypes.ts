import type { Cadence, Importance, TimeOfDay } from '@harmony/shared';

// Draft shapes held in memory during the wizard. They become real Area and
// Habit rows only at the commit step (entering the install screen).

export interface DraftArea {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
  importance: Importance;
  whySentence: string;
}

export interface DraftHabit {
  name: string;
  cadence: Cadence;
  timeOfDay: TimeOfDay;
}

// One optional starter habit per area, keyed by area id.
export type DraftHabits = Record<string, DraftHabit>;

// The area-count bounds are a domain rule, kept in @harmony/shared so the
// onboarding wizard and the Areas screen agree. Re-exported here so the existing
// `../onboardingTypes` import sites keep working.
export { MIN_AREAS, MAX_AREAS } from '@harmony/shared';

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

export const MIN_AREAS = 3;
export const MAX_AREAS = 12;

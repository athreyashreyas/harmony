import Dexie, { type Table } from 'dexie';
import type { Area, Habit, Log, NudgeHistory, UserProfile } from '@harmony/shared';

// Dexie schema, section 6.1. Entity shapes are the shared domain types so the
// web app and the push worker agree on the model. Queries arrive in later
// phases; this file is the schema only.

export interface Setting {
  key: string;
  value: unknown;
}

export class HarmonyDB extends Dexie {
  profile!: Table<UserProfile, string>;
  areas!: Table<Area, string>;
  habits!: Table<Habit, string>;
  logs!: Table<Log, string>;
  nudgeHistory!: Table<NudgeHistory, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('harmony');
    this.version(1).stores({
      profile: 'id',
      areas: 'id, userId, order, archivedAt',
      habits: 'id, userId, areaId, order, archivedAt',
      // Compound index added beyond the spec's literal text for fast
      // "is this habit logged today" lookups (toggleLog).
      logs: 'id, userId, habitId, areaId, date, loggedAt, [habitId+date]',
      nudgeHistory: 'id, userId, templateId, areaId, sentAt',
      settings: 'key',
    });
  }
}

export const db = new HarmonyDB();

import Dexie, { type Table } from 'dexie';
import type { Area, Habit, Log, NudgeHistory, UserProfile } from '@harmony/shared';

// Dexie schema, section 6.1. Entity shapes are the shared domain types so the
// web app and the push worker agree on the model. Queries arrive in later
// phases; this file is the schema only.

export interface Setting {
  key: string;
  value: unknown;
}

// Well-known keys in the `settings` table (one row each). These are per-device,
// not per-user, so they are cleared at sign-out (see store/useUser).
export const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';
export const PUSH_PROMPT_DISMISSED_KEY = 'pushPromptDismissed';

// One queued write waiting to reach Supabase. Writes go to Dexie first and are
// enqueued here; a flusher drains them in order, so an edit made offline (or
// when a mirror call fails) is retried instead of lost. Auto-incrementing id
// preserves the order writes were made, which also respects table FK order
// (an area is created before its habits before their logs).
export type OutboxTable = 'areas' | 'habits' | 'logs' | 'nudge_history' | 'notification_settings';

export interface OutboxItem {
  id?: number;
  op: 'upsert' | 'delete';
  table: OutboxTable;
  // For upsert: the snake_case row. For delete: enough to identify the row.
  payload: Record<string, unknown>;
  onConflict?: string; // upsert conflict target (defaults to 'id')
  createdAt: number;
}

// One message to the creator, written in Me, that has not reached them yet.
// Its own queue rather than an OutboxItem: it belongs to no table, carries no
// row id, and is sent through an edge function rather than into Postgres.
export interface FeedbackOutboxItem {
  id?: number;
  kind: 'bug' | 'idea';
  subject: string;
  body: string;
  createdAt: number;
  // Failed attempts so far, so a message that cannot land is given up on.
  attempts: number;
}

export class HarmonyDB extends Dexie {
  profile!: Table<UserProfile, string>;
  areas!: Table<Area, string>;
  habits!: Table<Habit, string>;
  logs!: Table<Log, string>;
  nudgeHistory!: Table<NudgeHistory, string>;
  settings!: Table<Setting, string>;
  outbox!: Table<OutboxItem, number>;
  feedbackOutbox!: Table<FeedbackOutboxItem, number>;

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
    // v2 adds the offline write outbox.
    this.version(2).stores({
      outbox: '++id, createdAt',
    });
    // v3 adds the queue of messages to the creator that have not gone yet.
    // Indexed on createdAt so it drains in the order they were written.
    this.version(3).stores({
      feedbackOutbox: '++id, createdAt',
    });
  }
}

export const db = new HarmonyDB();

// Core domain types shared between the web app and the push worker.
// These mirror the data model in section 6 of the spec. Logic lives elsewhere;
// this file is type definitions only.

export type Importance = 'core' | 'matters' | 'optional';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

// How readily an area's drift nudges fire, on top of its importance tier
// (section 14, per-area setting). 'default' reproduces section 16's
// thresholds unchanged.
export type DriftSensitivity = 'low' | 'default' | 'high';

export type Cadence =
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'weekends' }
  | { kind: 'specific-days'; days: number[] }
  | { kind: 'times-per-week'; times: number }
  | { kind: 'every-n-days'; n: number }
  // Every n weeks on the habit's start weekday (n=1 weekly, 2 fortnightly, ...).
  | { kind: 'every-n-weeks'; n: number }
  // Every n months on the habit's start day-of-month, clamped to month length
  // (n=1 monthly, 2 bi-monthly, 3 quarterly, 12 yearly, ...).
  | { kind: 'every-n-months'; n: number };

export interface UserProfile {
  id: string;
  firstName: string;
  onboardedAt: number | null;
  pushSubscriptionId?: string;
  timezone: string;
}

export interface Area {
  id: string;
  userId: string;
  name: string;
  color: string;
  importance: Importance;
  whySentence: string;
  order: number;
  createdAt: number;
  archivedAt: number | null;
  // Per-area settings (section 14). Optional so areas created before Phase 9
  // still read back fine; callers fall back to 'default' / 'anytime'.
  driftSensitivity?: DriftSensitivity;
  reminderTimeOfDay?: TimeOfDay;
}

export interface Habit {
  id: string;
  userId: string;
  areaId: string;
  name: string;
  cadence: Cadence;
  timeOfDay: TimeOfDay;
  reminderTime: string | null;
  startDate: string;
  endDate: string | null;
  order: number;
  createdAt: number;
  archivedAt: number | null;
  // Optional per-habit colour override (section: colour-coding). When unset,
  // the habit inherits its area's colour.
  color?: string;
  // 'tend' (default) is a normal habit you want to do, scheduled by cadence.
  // 'ease' is a "tug": something you want to ease off, never scheduled, logged
  // manually when it happens, and it eats into the area's Bloom. tugWeight is
  // how much one logged tug sets you back (in equivalent missed sessions).
  polarity?: 'tend' | 'ease';
  tugWeight?: number;
  // Relative weight of this habit within its area's Bloom (default 1 = equal
  // share). Normalised against the area's other tend habits at compute time.
  weight?: number;
}

export interface Log {
  id: string;
  userId: string;
  habitId: string;
  areaId: string;
  date: string;
  loggedAt: number;
  note: string | null;
}

export interface NudgeHistory {
  id: string;
  userId: string;
  templateId: string;
  areaId: string | null;
  habitId: string | null;
  composedText: string;
  sentAt: number;
  channel: 'push' | 'in-app';
}

export interface WeatherSummary {
  kind: 'sunny' | 'rainy' | 'cold' | 'hot';
  phrase: string;
}

// Notification preferences (section 14). One row per user. The worker
// (Phase 11) reads this from Supabase to decide whether and when to push;
// the in-app drift banner does not consult it (push is the only channel
// these settings gate, per the Phase 7 decision to keep the banner
// unconditional).
export interface NotificationSettings {
  masterEnabled: boolean;
  mutedAreaIds: string[];
  dndStart: string; // "HH:mm" local
  dndEnd: string;
  // Per-habit scheduled reminders at the habit's reminderTime (default on).
  habitReminders: boolean;
  // One evening round-up of habits still unlogged that day (default on).
  dailySummary: boolean;
  // The chosen theme id (lib/theme/themes.ts). Carried on this synced settings
  // row so the look follows the person across their devices. Null = default.
  theme?: string | null;
  // The app version whose "What's new" the person has already seen. Synced so a
  // release is shown once per account, not once per device. Null = not yet set.
  lastSeenVersion?: string | null;
}

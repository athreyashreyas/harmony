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
  | { kind: 'every-n-days'; n: number };

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
}

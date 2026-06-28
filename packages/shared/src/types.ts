// Core domain types shared between the web app and the push worker.
// These mirror the data model in section 6 of the spec. Logic lives elsewhere;
// this file is type definitions only.

export type Importance = 'core' | 'matters' | 'optional';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

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

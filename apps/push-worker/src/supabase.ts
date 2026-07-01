import type {
  Area,
  Habit,
  Log,
  NotificationSettings,
  NudgeHistory,
  UserProfile,
} from '@harmony/shared';
import { isoDaysAgo } from '@harmony/shared';
import type { StoredSubscription } from './webpush';

// Direct Supabase access over PostgREST with the service role key (section
// 6.2, 17.3). The service role bypasses row level security, so every query is
// explicitly scoped by user_id.

export interface Env {
  VAPID_PUBLIC: string;
  VAPID_PRIVATE: string;
  VAPID_SUBJECT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TEST_PUSH_SECRET?: string;
}

function restHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  };
}

async function rest<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  // A slow Supabase call must not stall the every-minute pass. Abort after 10s.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { ...restHeaders(env), ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Supabase ${path} failed: ${res.status} ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Row shapes (snake_case) as stored, mapped to the camelCase domain types the
// shared engine expects.
interface AreaRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  importance: Area['importance'];
  why_sentence: string;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
  drift_sensitivity: NonNullable<Area['driftSensitivity']>;
  reminder_time_of_day: NonNullable<Area['reminderTimeOfDay']>;
}

interface HabitRow {
  id: string;
  user_id: string;
  area_id: string;
  name: string;
  cadence: Habit['cadence'];
  time_of_day: Habit['timeOfDay'];
  reminder_time: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
  color: string | null;
  polarity: Habit['polarity'] | null;
  tug_weight: number | null;
}

interface LogRow {
  id: string;
  user_id: string;
  habit_id: string;
  area_id: string;
  date: string;
  logged_at: string;
  note: string | null;
}

interface NudgeRow {
  id: string;
  user_id: string;
  template_id: string;
  area_id: string | null;
  habit_id: string | null;
  composed_text: string;
  sent_at: string;
  channel: 'push' | 'in-app';
}

interface SettingsRow {
  user_id: string;
  master_enabled: boolean;
  muted_area_ids: string[];
  dnd_start: string;
  dnd_end: string;
  habit_reminders: boolean;
  daily_summary: boolean;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function toArea(r: AreaRow): Area {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    color: r.color,
    importance: r.importance,
    whySentence: r.why_sentence,
    order: r.sort_order,
    createdAt: Date.parse(r.created_at),
    archivedAt: r.archived_at ? Date.parse(r.archived_at) : null,
    driftSensitivity: r.drift_sensitivity,
    reminderTimeOfDay: r.reminder_time_of_day,
  };
}

function toHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    userId: r.user_id,
    areaId: r.area_id,
    name: r.name,
    cadence: r.cadence,
    timeOfDay: r.time_of_day,
    reminderTime: r.reminder_time,
    startDate: r.start_date,
    endDate: r.end_date,
    order: r.sort_order,
    createdAt: Date.parse(r.created_at),
    archivedAt: r.archived_at ? Date.parse(r.archived_at) : null,
    color: r.color ?? undefined,
    polarity: r.polarity ?? 'tend',
    tugWeight: r.tug_weight ?? undefined,
  };
}

function toLog(r: LogRow): Log {
  return {
    id: r.id,
    userId: r.user_id,
    habitId: r.habit_id,
    areaId: r.area_id,
    date: r.date,
    loggedAt: Date.parse(r.logged_at),
    note: r.note,
  };
}

function toNudge(r: NudgeRow): NudgeHistory {
  return {
    id: r.id,
    userId: r.user_id,
    templateId: r.template_id,
    areaId: r.area_id,
    habitId: r.habit_id,
    composedText: r.composed_text,
    sentAt: Date.parse(r.sent_at),
    channel: r.channel,
  };
}

export interface UserBundle {
  areas: Area[];
  habits: Habit[];
  logs: Log[];
  nudgeHistory: NudgeHistory[];
  settings: NotificationSettings;
  subscriptions: StoredSubscription[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  mutedAreaIds: [],
  dndStart: '21:00',
  dndEnd: '07:00',
  habitReminders: true,
  dailySummary: true,
};

export async function getActiveUsers(env: Env): Promise<UserProfile[]> {
  const rows = await rest<{ id: string; first_name: string; timezone: string }[]>(
    env,
    'profiles?onboarded_at=not.is.null&select=id,first_name,timezone',
  );
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    timezone: r.timezone,
    onboardedAt: 1,
  }));
}

// The set of user ids that have at least one push subscription. Only these
// users can receive anything, so the every-minute pass can skip the rest
// instead of fetching a full bundle for each of them.
export async function usersWithSubscriptions(env: Env): Promise<Set<string>> {
  const rows = await rest<{ user_id: string }[]>(env, 'push_subscriptions?select=user_id');
  return new Set(rows.map((r) => r.user_id));
}

export async function getUserBundle(env: Env, userId: string): Promise<UserBundle> {
  const logsFrom = isoDaysAgo(60);
  const nudgesFrom = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const uid = `user_id=eq.${userId}`;

  const [areas, habits, logs, nudges, settingsRows, subs] = await Promise.all([
    rest<AreaRow[]>(env, `areas?${uid}&select=*`),
    rest<HabitRow[]>(env, `habits?${uid}&select=*`),
    rest<LogRow[]>(env, `logs?${uid}&date=gte.${logsFrom}&select=*`),
    rest<NudgeRow[]>(env, `nudge_history?${uid}&sent_at=gte.${nudgesFrom}&select=*`),
    rest<SettingsRow[]>(env, `notification_settings?${uid}&select=*`),
    rest<SubscriptionRow[]>(env, `push_subscriptions?${uid}&select=endpoint,p256dh,auth`),
  ]);

  const s = settingsRows[0];
  const settings: NotificationSettings = s
    ? {
        masterEnabled: s.master_enabled,
        mutedAreaIds: s.muted_area_ids ?? [],
        dndStart: s.dnd_start,
        dndEnd: s.dnd_end,
        habitReminders: s.habit_reminders ?? true,
        dailySummary: s.daily_summary ?? true,
      }
    : DEFAULT_SETTINGS;

  return {
    areas: areas.map(toArea),
    habits: habits.map(toHabit),
    logs: logs.map(toLog),
    nudgeHistory: nudges.map(toNudge),
    settings,
    subscriptions: subs.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })),
  };
}

export async function recordNudge(env: Env, nudge: NudgeHistory): Promise<void> {
  await rest(env, 'nudge_history', {
    method: 'POST',
    body: JSON.stringify({
      id: nudge.id,
      user_id: nudge.userId,
      template_id: nudge.templateId,
      area_id: nudge.areaId,
      habit_id: nudge.habitId,
      composed_text: nudge.composedText,
      sent_at: new Date(nudge.sentAt).toISOString(),
      channel: nudge.channel,
    }),
  });
}

export async function upsertSubscription(
  env: Env,
  userId: string,
  sub: StoredSubscription,
  userAgent: string | null,
): Promise<void> {
  await rest(env, 'push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    }),
  });
}

export async function deleteSubscription(env: Env, endpoint: string): Promise<void> {
  await rest(env, `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
  });
}

export async function subscriptionsForUser(env: Env, userId: string): Promise<StoredSubscription[]> {
  const rows = await rest<SubscriptionRow[]>(
    env,
    `push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth`,
  );
  return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

// Verifies a Supabase access token and returns the authenticated user id, so
// /subscribe trusts the token rather than a client-claimed id.
export async function userIdFromToken(env: Env, token: string): Promise<string | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}

// Fully delete a user: their data first (so the auth deletion can't be blocked
// by a foreign key, regardless of on-delete-cascade), then the auth.users row
// itself via the Admin API. Only the service role can do this, which is why it
// lives in the worker and not the browser.
export async function deleteUserCompletely(env: Env, userId: string): Promise<void> {
  const uid = `user_id=eq.${userId}`;
  await rest(env, `logs?${uid}`, { method: 'DELETE' });
  await rest(env, `nudge_history?${uid}`, { method: 'DELETE' });
  await rest(env, `habits?${uid}`, { method: 'DELETE' });
  await rest(env, `areas?${uid}`, { method: 'DELETE' });
  await rest(env, `notification_settings?${uid}`, { method: 'DELETE' });
  await rest(env, `push_subscriptions?${uid}`, { method: 'DELETE' });
  await rest(env, `profiles?id=eq.${userId}`, { method: 'DELETE' });

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Admin user delete failed: ${res.status} ${await res.text()}`);
  }
}

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
  // Comma-separated list of allowed browser origins for CORS. When unset, CORS
  // stays permissive ('*') so nothing breaks; set it (e.g. the Pages domain) to
  // lock the browser-facing endpoints to your app.
  ALLOWED_ORIGINS?: string;
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
// shared engine expects. NOTE: the worker deliberately fetches only the columns
// its scheduling + drift logic reads (see the selects in getUserBundle), so
// these interfaces list just those columns — not the full table. Unused domain
// fields are given neutral defaults in the mappers below. If new logic needs
// another column, add it to both the select and the interface/mapper here. This
// keeps the two unbounded text columns (logs.note, nudge_history.composed_text)
// and other unread fields off the wire, which is a large egress saving.
interface AreaRow {
  id: string;
  name: string;
  importance: Area['importance'];
  why_sentence: string;
  created_at: string;
  archived_at: string | null;
  drift_sensitivity: NonNullable<Area['driftSensitivity']>;
}

interface HabitRow {
  id: string;
  area_id: string;
  name: string;
  cadence: Habit['cadence'];
  reminder_time: string | null;
  start_date: string;
  end_date: string | null;
  archived_at: string | null;
  polarity: Habit['polarity'] | null;
}

interface LogRow {
  habit_id: string;
  area_id: string;
  date: string;
}

interface NudgeRow {
  template_id: string;
  area_id: string | null;
  habit_id: string | null;
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

// The `''`/`0`/`null` fields below are columns the worker never fetches (see the
// note on the row interfaces); they satisfy the domain type but are never read.
function toArea(r: AreaRow): Area {
  return {
    id: r.id,
    userId: '',
    name: r.name,
    color: '',
    importance: r.importance,
    whySentence: r.why_sentence,
    order: 0,
    createdAt: Date.parse(r.created_at),
    archivedAt: r.archived_at ? Date.parse(r.archived_at) : null,
    driftSensitivity: r.drift_sensitivity,
  };
}

function toHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    userId: '',
    areaId: r.area_id,
    name: r.name,
    cadence: r.cadence,
    timeOfDay: 'anytime',
    reminderTime: r.reminder_time,
    startDate: r.start_date,
    endDate: r.end_date,
    order: 0,
    createdAt: 0,
    archivedAt: r.archived_at ? Date.parse(r.archived_at) : null,
    polarity: r.polarity ?? 'tend',
  };
}

function toLog(r: LogRow): Log {
  return {
    id: '',
    userId: '',
    habitId: r.habit_id,
    areaId: r.area_id,
    date: r.date,
    loggedAt: 0,
    note: null,
  };
}

function toNudge(r: NudgeRow): NudgeHistory {
  return {
    id: '',
    userId: '',
    templateId: r.template_id,
    areaId: r.area_id,
    habitId: r.habit_id,
    composedText: '',
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

// What a single pass needs to fetch. The every-minute reminder/summary pass only
// looks at *today's* logs and needs no areas, so it fetches a tiny window; the
// drift pass (run far less often) needs ~60 days of history and the areas. This
// split is the main egress lever: re-downloading 60 days of logs every minute
// was the dominant PostgREST egress.
export interface BundleOptions {
  // Days of logs to fetch. Reminders/summary need only today (2 days covers any
  // timezone's "today"); drift needs the full HISTORY_DAYS (60) window.
  logDays?: number;
  // Days of nudge history to fetch. Reminder/summary dedup is per-day (today);
  // drift's no-repeat + phrasing memory looks back a couple of weeks.
  nudgeDays?: number;
  // Areas are only used by drift, so the reminder/summary pass skips the fetch.
  includeAreas?: boolean;
}

export async function getUserBundle(
  env: Env,
  userId: string,
  opts: BundleOptions = {},
): Promise<UserBundle> {
  const { logDays = 2, nudgeDays = 2, includeAreas = false } = opts;
  const logsFrom = isoDaysAgo(logDays);
  const nudgesFrom = new Date(Date.now() - nudgeDays * 86_400_000).toISOString();
  const uid = `user_id=eq.${userId}`;

  // Explicit column lists (not select=*): fetch only what the worker reads, so
  // unused/unbounded columns (notably logs.note, nudge_history.composed_text, and
  // the settings row's rituals/theme JSON) never leave Supabase.
  const [areas, habits, logs, nudges, settingsRows, subs] = await Promise.all([
    includeAreas
      ? rest<AreaRow[]>(
          env,
          `areas?${uid}&select=id,name,importance,why_sentence,created_at,archived_at,drift_sensitivity`,
        )
      : Promise.resolve([] as AreaRow[]),
    rest<HabitRow[]>(
      env,
      `habits?${uid}&select=id,area_id,name,cadence,reminder_time,start_date,end_date,archived_at,polarity`,
    ),
    rest<LogRow[]>(env, `logs?${uid}&date=gte.${logsFrom}&deleted_at=is.null&select=habit_id,area_id,date`),
    rest<NudgeRow[]>(
      env,
      `nudge_history?${uid}&sent_at=gte.${nudgesFrom}&select=template_id,area_id,habit_id,sent_at,channel`,
    ),
    rest<SettingsRow[]>(
      env,
      `notification_settings?${uid}&select=master_enabled,muted_area_ids,dnd_start,dnd_end,habit_reminders,daily_summary`,
    ),
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

// User-initiated unsubscribe: scoped to the caller's own rows, so a token for
// one account can never remove another account's subscription, even with a
// known endpoint URL.
export async function deleteSubscriptionForUser(env: Env, userId: string, endpoint: string): Promise<void> {
  await rest(
    env,
    `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}

// Hard-delete log tombstones past the retention window, so soft-deleted rows
// never accumulate. The window is kept comfortably longer than the client's
// reseed threshold, so a device always reseeds (full snapshot) before any
// tombstone it still needs could be pruned away.
export async function pruneDeletedLogs(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString();
  await rest(env, `logs?deleted_at=lt.${encodeURIComponent(cutoff)}`, { method: 'DELETE' });
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

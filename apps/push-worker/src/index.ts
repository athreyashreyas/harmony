import type { NudgeHistory, UserProfile } from '@harmony/shared';
import { isHabitDueOn } from '@harmony/shared';
import { compose } from './templates';
import { detectDrift } from './drift';
import { isDriftTemplate } from './templates';
import {
  deleteSubscription,
  deleteUserCompletely,
  getActiveUsers,
  getUserBundle,
  recordNudge,
  subscriptionsForUser,
  upsertSubscription,
  userIdFromToken,
  usersWithSubscriptions,
  type Env,
  type UserBundle,
} from './supabase';
import { sendPush, type PushPayload, type VapidConfig } from './webpush';
import {
  isDue,
  localDateISO,
  localHHmm,
  minutesOfDay,
  reminderText,
  summaryText,
  withinDnd,
} from './schedule';

// Anti-spam invariants (section 16). The per-day cap governs drift nudges only;
// time-of-day habit reminders and the evening summary are user-requested and
// each capped to once per habit / once per day on their own.
const MAX_PER_USER_PER_DAY = 2;
const NOTIFICATION_URL = '/';

// The cron runs every minute, so on a normal run a reminder fires right at its
// set minute. Cron is best-effort, though, and a run can be delayed or skipped;
// this catch-up window lets a later run still deliver (a few minutes late rather
// than never) as long as the habit is still unlogged. The once-per-habit-per-day
// guard keeps it to a single reminder.
const REMINDER_CATCHUP_MIN = 10;
// Local time the evening round-up of unlogged habits goes out (before the
// default 21:00 quiet hours, so it isn't suppressed), with a small catch-up.
const SUMMARY_TIME = '20:00';
const SUMMARY_CATCHUP_MIN = 5;
// Sentinel template ids for the non-drift pushes (not in the drift library).
const REMINDER_TEMPLATE_ID = 'habit-reminder';
const SUMMARY_TEMPLATE_ID = 'daily-summary';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

function vapidFrom(env: Env): VapidConfig {
  return { publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT };
}

async function sendToAllSubscriptions(
  env: Env,
  bundle: UserBundle,
  payload: PushPayload,
): Promise<boolean> {
  // Send to every device at once: total time is the slowest single send, not the
  // sum, so one slow endpoint can't delay the others (or the rest of the pass).
  const results = await Promise.allSettled(
    bundle.subscriptions.map(async (sub) => {
      const status = await sendPush(sub, payload, vapidFrom(env));
      if (status === 404 || status === 410) {
        // The subscription is gone (unsubscribed / expired); stop sending to it.
        await deleteSubscription(env, sub.endpoint);
        return false;
      }
      if (status >= 200 && status < 300) return true;
      // 429, 5xx, etc.: a transient or push-service issue. Keep the subscription,
      // but surface it instead of dropping it silently.
      console.warn('Push send returned an unexpected status', status, sub.endpoint);
      return false;
    }),
  );
  for (const r of results) {
    if (r.status === 'rejected') console.warn('Push send failed', r.reason);
  }
  return results.some((r) => r.status === 'fulfilled' && r.value === true);
}

async function processUser(env: Env, user: UserProfile, now: Date): Promise<void> {
  const bundle = await getUserBundle(env, user.id);
  if (!bundle.settings.masterEnabled) return;
  if (bundle.subscriptions.length === 0) return;

  const inQuietHours = withinDnd(now, user.timezone, bundle.settings.dndStart, bundle.settings.dndEnd);

  // A per-habit reminder is a time the user chose deliberately, so it fires even
  // during quiet hours. The drift nudges and the evening round-up are ours to
  // time, so they stay quiet during quiet hours.
  await sendHabitReminders(env, user, now, bundle);
  if (inQuietHours) return;

  await sendDailySummary(env, user, now, bundle);
  await sendDriftNudges(env, user, now, bundle);
}

// #1: a gentle nudge for each due, still-unlogged habit at its reminder time.
async function sendHabitReminders(env: Env, user: UserProfile, now: Date, bundle: UserBundle): Promise<void> {
  if (!bundle.settings.habitReminders) return;

  const tz = user.timezone;
  const today = localDateISO(now, tz);
  const nowMin = minutesOfDay(localHHmm(now, tz));

  // The habits whose reminder is due this minute, still unlogged and not already
  // reminded today.
  const due = bundle.habits.filter((habit) => {
    if (!habit.reminderTime) return false;
    if (!isHabitDueOn(habit, today)) return false;
    if (!isDue(nowMin, minutesOfDay(habit.reminderTime), REMINDER_CATCHUP_MIN)) return false;
    if (bundle.logs.some((l) => l.habitId === habit.id && l.date === today)) return false;
    return !bundle.nudgeHistory.some(
      (n) =>
        n.templateId === REMINDER_TEMPLATE_ID &&
        n.habitId === habit.id &&
        localDateISO(new Date(n.sentAt), tz) === today,
    );
  });

  // Send them together, so one habit's send can't delay another's.
  await Promise.allSettled(
    due.map(async (habit) => {
      const payload: PushPayload = {
        title: 'Harmony',
        body: reminderText(habit.name, `${habit.id}:${today}`),
        url: NOTIFICATION_URL,
      };
      const delivered = await sendToAllSubscriptions(env, bundle, payload);
      if (!delivered) return;

      const nudge: NudgeHistory = {
        id: crypto.randomUUID(),
        userId: user.id,
        templateId: REMINDER_TEMPLATE_ID,
        areaId: habit.areaId,
        habitId: habit.id,
        composedText: payload.body,
        sentAt: Date.now(),
        channel: 'push',
      };
      await recordNudge(env, nudge);
      bundle.nudgeHistory.push(nudge);
    }),
  );
}

// #2: one evening round-up of habits due today that are still unlogged.
async function sendDailySummary(env: Env, user: UserProfile, now: Date, bundle: UserBundle): Promise<void> {
  if (!bundle.settings.dailySummary) return;

  const tz = user.timezone;
  const nowMin = minutesOfDay(localHHmm(now, tz));
  if (!isDue(nowMin, minutesOfDay(SUMMARY_TIME), SUMMARY_CATCHUP_MIN)) return;

  const today = localDateISO(now, tz);
  const alreadySent = bundle.nudgeHistory.some(
    (n) => n.templateId === SUMMARY_TEMPLATE_ID && localDateISO(new Date(n.sentAt), tz) === today,
  );
  if (alreadySent) return;

  const unlogged = bundle.habits.filter(
    (h) => isHabitDueOn(h, today) && !bundle.logs.some((l) => l.habitId === h.id && l.date === today),
  );
  if (unlogged.length === 0) return;

  const payload: PushPayload = {
    title: 'Harmony',
    body: summaryText(unlogged),
    url: NOTIFICATION_URL,
  };
  const delivered = await sendToAllSubscriptions(env, bundle, payload);
  if (!delivered) return;

  const nudge: NudgeHistory = {
    id: crypto.randomUUID(),
    userId: user.id,
    templateId: SUMMARY_TEMPLATE_ID,
    areaId: null,
    habitId: null,
    composedText: payload.body,
    sentAt: Date.now(),
    channel: 'push',
  };
  await recordNudge(env, nudge);
  bundle.nudgeHistory.push(nudge);
}

async function sendDriftNudges(env: Env, user: UserProfile, now: Date, bundle: UserBundle): Promise<void> {
  const muted = new Set(bundle.settings.mutedAreaIds);

  // Daily cap: how many push drift nudges already went out today, by the user's
  // local calendar day (the same basis the reminders and summary dedup on), so
  // the cap doesn't reset at UTC midnight for users far from UTC.
  const today = localDateISO(now, user.timezone);
  const sentToday = bundle.nudgeHistory.filter(
    (n) =>
      n.channel === 'push' &&
      isDriftTemplate(n.templateId) &&
      localDateISO(new Date(n.sentAt), user.timezone) === today,
  ).length;
  let remaining = MAX_PER_USER_PER_DAY - sentToday;
  if (remaining <= 0) return;

  const candidates = detectDrift({
    areas: bundle.areas,
    habits: bundle.habits,
    logs: bundle.logs,
    nudgeHistory: bundle.nudgeHistory,
    now,
  }).filter((c) => !muted.has(c.area.id));

  for (const candidate of candidates) {
    if (remaining <= 0) break;

    const recentTemplateIds = bundle.nudgeHistory
      .filter((n) => n.areaId === candidate.area.id && isDriftTemplate(n.templateId))
      .map((n) => n.templateId);

    const composed = compose({
      type: 'drift',
      area: candidate.area,
      context: {
        now,
        profile: user,
        daysSinceLastLog: candidate.daysSinceLast,
        recentTemplateIds,
      },
    });
    if (!composed) continue;

    const payload: PushPayload = {
      title: 'Harmony',
      body: composed.text,
      areaId: candidate.area.id,
      url: NOTIFICATION_URL,
    };

    const delivered = await sendToAllSubscriptions(env, bundle, payload);
    if (!delivered) continue;

    const nudge: NudgeHistory = {
      id: crypto.randomUUID(),
      userId: user.id,
      templateId: composed.templateId,
      areaId: candidate.area.id,
      habitId: null,
      composedText: composed.text,
      sentAt: Date.now(),
      channel: 'push',
    };
    await recordNudge(env, nudge);
    // Keep this run honest about the per-area and per-day limits.
    bundle.nudgeHistory.push(nudge);
    remaining -= 1;
  }
}

async function runDriftPass(env: Env): Promise<void> {
  const now = new Date();

  // Fetch the active users and the set of users who actually have a device
  // subscribed, together. If either lookup fails, log and bail for this minute
  // rather than throwing (the next run, a minute later, retries).
  let users: UserProfile[];
  let subscribed: Set<string>;
  try {
    [users, subscribed] = await Promise.all([getActiveUsers(env), usersWithSubscriptions(env)]);
  } catch (err) {
    console.error('Drift pass could not load users', err);
    return;
  }

  // Only users with a subscription can receive anything, so skip the rest before
  // paying for a full bundle each. Process everyone in parallel and isolate
  // failures, so one user (or one slow request) never delays or drops another's.
  const recipients = users.filter((u) => subscribed.has(u.id));
  const results = await Promise.allSettled(recipients.map((user) => processUser(env, user, now)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`Drift pass failed for user ${recipients[i].id}`, r.reason);
  });
}

// Best-effort per-isolate rate limit for the mutating endpoints, keyed by the
// authenticated user. Cloudflare runs many isolates, so this is not a global
// limiter (that needs Durable Objects or the Rate Limiting API); it simply
// blunts a single client hammering one isolate. The endpoints are already
// token-gated, so any abuse only ever affects the caller's own account.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 40;
const rateHits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (rateHits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  rateHits.set(userId, recent);
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(k);
  }
  return recent.length > RATE_MAX;
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'missing token' }, 401);
  const userId = await userIdFromToken(env, token);
  if (!userId) return json({ error: 'invalid token' }, 401);
  if (rateLimited(userId)) return json({ error: 'rate limited' }, 429);

  const body = (await request.json()) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    userAgent?: string;
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return json({ error: 'invalid subscription' }, 400);
  }

  await upsertSubscription(
    env,
    userId,
    { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    body.userAgent ?? null,
  );
  return json({ ok: true }, 201);
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'missing token' }, 401);
  const userId = await userIdFromToken(env, token);
  if (!userId) return json({ error: 'invalid token' }, 401);
  if (rateLimited(userId)) return json({ error: 'rate limited' }, 429);

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return json({ error: 'missing endpoint' }, 400);
  await deleteSubscription(env, body.endpoint);
  return json({ ok: true });
}

// True account deletion: removes the caller's data and their auth.users row.
// The user id comes from the verified token, not the body, so a caller can only
// ever delete their own account.
async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'missing token' }, 401);
  const userId = await userIdFromToken(env, token);
  if (!userId) return json({ error: 'invalid token' }, 401);
  if (rateLimited(userId)) return json({ error: 'rate limited' }, 429);

  await deleteUserCompletely(env, userId);
  return json({ ok: true });
}

// Dev-only: send a test notification to a user's devices (section 17.3),
// gated by a shared secret header.
async function handleTestPush(request: Request, env: Env): Promise<Response> {
  if (!env.TEST_PUSH_SECRET || request.headers.get('x-test-secret') !== env.TEST_PUSH_SECRET) {
    return json({ error: 'forbidden' }, 403);
  }
  const body = (await request.json()) as { userId?: string };
  if (!body.userId) return json({ error: 'missing userId' }, 400);

  const subscriptions = await subscriptionsForUser(env, body.userId);
  const payload: PushPayload = {
    title: 'Harmony',
    body: 'A hello from Harmony.',
    url: NOTIFICATION_URL,
  };
  let delivered = 0;
  for (const sub of subscriptions) {
    const status = await sendPush(sub, payload, vapidFrom(env));
    if (status === 404 || status === 410) await deleteSubscription(env, sub.endpoint);
    else if (status >= 200 && status < 300) delivered += 1;
  }
  return json({ delivered, total: subscriptions.length });
}

// The CORS origin to echo: the request's Origin if it's in the configured
// allowlist, otherwise the first allowed origin. With no allowlist set, stays
// permissive so the app keeps working until you lock it down.
function allowOrigin(request: Request, env: Env): string {
  const list = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (!list || list.length === 0) return '*';
  const origin = request.headers.get('Origin');
  return origin && list.includes(origin) ? origin : list[0];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Finalise every response with the right per-request CORS origin.
    const withCors = (res: Response): Response => {
      res.headers.set('access-control-allow-origin', allowOrigin(request, env));
      res.headers.set('vary', 'Origin');
      return res;
    };

    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204, headers: CORS_HEADERS }));

    const url = new URL(request.url);
    try {
      // Lightweight liveness check: handy for uptime monitoring and for
      // confirming a fresh deploy is live (curl /health).
      if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
        return withCors(json({ ok: true, service: 'harmony-push-worker' }));
      }
      if (url.pathname === '/subscribe' && request.method === 'POST') {
        return withCors(await handleSubscribe(request, env));
      }
      if (url.pathname === '/subscribe' && request.method === 'DELETE') {
        return withCors(await handleUnsubscribe(request, env));
      }
      if (url.pathname === '/delete-account' && request.method === 'POST') {
        return withCors(await handleDeleteAccount(request, env));
      }
      if (url.pathname === '/test-push' && request.method === 'POST') {
        return withCors(await handleTestPush(request, env));
      }
      return withCors(json({ error: 'not found' }, 404));
    } catch (err) {
      console.error('Request failed', err);
      return withCors(json({ error: 'internal error' }, 500));
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDriftPass(env));
  },
};

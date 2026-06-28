import type { NudgeHistory, UserProfile } from '@harmony/shared';
import { compose } from './templates';
import { detectDrift } from './drift';
import { isDriftTemplate } from './templates';
import {
  deleteSubscription,
  getActiveUsers,
  getUserBundle,
  recordNudge,
  subscriptionsForUser,
  upsertSubscription,
  userIdFromToken,
  type Env,
  type UserBundle,
} from './supabase';
import { sendPush, type PushPayload, type VapidConfig } from './webpush';

// Anti-spam invariants (section 16).
const MAX_PER_USER_PER_DAY = 2;
const NOTIFICATION_URL = '/';

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

// Local "HH:mm" in the user's timezone, for the do-not-disturb check.
function localHHmm(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  }
}

function withinDnd(now: Date, timezone: string, start: string, end: string): boolean {
  const cur = localHHmm(now, timezone);
  // Overnight window (e.g. 21:00 to 07:00) wraps past midnight.
  if (start <= end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

function sameUtcDay(a: number, b: number): boolean {
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

async function sendToAllSubscriptions(
  env: Env,
  bundle: UserBundle,
  payload: PushPayload,
): Promise<boolean> {
  let anyDelivered = false;
  for (const sub of bundle.subscriptions) {
    try {
      const status = await sendPush(sub, payload, vapidFrom(env));
      if (status === 404 || status === 410) {
        await deleteSubscription(env, sub.endpoint);
      } else if (status >= 200 && status < 300) {
        anyDelivered = true;
      }
    } catch (err) {
      console.warn('Push send failed', err);
    }
  }
  return anyDelivered;
}

async function processUser(env: Env, user: UserProfile, now: Date): Promise<void> {
  const bundle = await getUserBundle(env, user.id);
  if (!bundle.settings.masterEnabled) return;
  if (bundle.subscriptions.length === 0) return;
  if (withinDnd(now, user.timezone, bundle.settings.dndStart, bundle.settings.dndEnd)) return;

  const muted = new Set(bundle.settings.mutedAreaIds);

  // Daily cap: how many push drift nudges already went out today.
  const sentToday = bundle.nudgeHistory.filter(
    (n) => n.channel === 'push' && isDriftTemplate(n.templateId) && sameUtcDay(n.sentAt, now.getTime()),
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
  const users = await getActiveUsers(env);
  for (const user of users) {
    try {
      await processUser(env, user, now);
    } catch (err) {
      console.warn(`Drift pass failed for user ${user.id}`, err);
    }
  }
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'missing token' }, 401);
  const userId = await userIdFromToken(env, token);
  if (!userId) return json({ error: 'invalid token' }, 401);

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

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return json({ error: 'missing endpoint' }, 400);
  await deleteSubscription(env, body.endpoint);
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
    body: 'A quiet hello from Harmony.',
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/subscribe' && request.method === 'POST') {
        return await handleSubscribe(request, env);
      }
      if (url.pathname === '/subscribe' && request.method === 'DELETE') {
        return await handleUnsubscribe(request, env);
      }
      if (url.pathname === '/test-push' && request.method === 'POST') {
        return await handleTestPush(request, env);
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error('Request failed', err);
      return json({ error: 'internal error' }, 500);
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDriftPass(env));
  },
};

import { supabase } from '../supabase/client';
import { db } from '../db/schema';
import { detectPlatform, isStandalone } from './install';

// Permission and subscription flow (section 17.1). The composer and worker do
// the actual sending (Phase 11); this gets the browser subscribed and the
// subscription stored.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const WORKER_URL = import.meta.env.VITE_PUSH_WORKER_URL;
const DISMISSED_KEY = 'pushPromptDismissed';

export type PushReadiness =
  | 'ready' // supported, permission can be requested
  | 'granted' // already subscribed-able and permitted
  | 'denied' // user said no at the browser level
  | 'needs-install' // iOS Safari, must add to home screen first
  | 'unsupported' // no service worker / push / Notification API
  | 'unconfigured'; // no VAPID public key set

export function pushReadiness(): PushReadiness {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) {
    // iOS Safari only exposes the push APIs once installed to the home screen.
    if (detectPlatform() === 'ios-safari' && !isStandalone()) return 'needs-install';
    return 'unsupported';
  }
  if (detectPlatform() === 'ios-safari' && !isStandalone()) return 'needs-install';
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return 'ready';
}

export async function isPushPromptDismissed(): Promise<boolean> {
  const row = await db.settings.get(DISMISSED_KEY);
  return row?.value === true;
}

export async function dismissPushPrompt(): Promise<void> {
  await db.settings.put({ key: DISMISSED_KEY, value: true });
}

// Returns a Uint8Array backed by a plain ArrayBuffer, the shape
// applicationServerKey expects.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function persistSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const payload = {
    userId,
    subscription: json,
    userAgent: navigator.userAgent,
  };

  // Preferred path: POST to the Cloudflare Worker, which writes to Supabase
  // with the service role. It derives the user from the access token, not the
  // body. Guarded by a timeout so a slow or unreachable worker never hangs the
  // "turn on reminders" button; on any failure we fall back to writing the
  // subscription straight to Supabase (RLS lets a user manage their own rows).
  if (WORKER_URL) {
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/subscribe`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Worker subscribe failed: ${res.status}`);
      return;
    } catch (err) {
      console.warn('Worker subscribe failed, writing subscription to Supabase directly.', err);
    }
  }

  if (supabase && json.endpoint && json.keys) {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;
  }
}

// Requests permission (if needed), subscribes via the service worker, and
// stores the subscription. Returns the resulting readiness.
export async function enablePush(userId: string): Promise<PushReadiness> {
  const readiness = pushReadiness();
  if (readiness !== 'ready' && readiness !== 'granted') return readiness;

  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'ready';

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await persistSubscription(userId, subscription);
  return 'granted';
}

// Self-heal: if this device already has notification permission, make sure its
// push subscription actually exists in the backend. The UI shows "reminders are
// on" purely from the OS permission, so a device whose original subscribe
// silently failed would otherwise look enabled forever while receiving nothing.
// Idempotent (reuses the existing subscription, upserts by endpoint), so it is
// safe to call on every app open.
export async function ensureSubscribed(userId: string): Promise<void> {
  if (pushReadiness() !== 'granted' || !VAPID_PUBLIC_KEY) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    await persistSubscription(userId, subscription);
  } catch (err) {
    console.warn('ensureSubscribed failed', err);
  }
}

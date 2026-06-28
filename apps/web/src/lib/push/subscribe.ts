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

  // The spec's path is to POST to the Cloudflare Worker, which writes to
  // Supabase with the service role. When no worker is configured yet, write
  // straight to Supabase (RLS lets a user manage their own rows) so the
  // subscription is not lost.
  if (WORKER_URL) {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Worker subscribe failed: ${res.status}`);
    return;
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

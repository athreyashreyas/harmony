import webpush from 'web-push';

// Sends one Web Push message. web-push's generateRequestDetails builds the
// encrypted body and VAPID headers without doing the network call itself
// (which would need Node's https module); we then send it with fetch, the
// pattern that works on Cloudflare Workers under nodejs_compat (section 17.3).

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  areaId?: string;
  url?: string;
}

// Returns the push service's HTTP status. 404 and 410 mean the subscription is
// gone and the caller should delete it.
export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
  vapid: VapidConfig,
): Promise<number> {
  const details = webpush.generateRequestDetails(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    {
      TTL: 12 * 60 * 60,
      vapidDetails: {
        subject: vapid.subject,
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      },
    },
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(details.headers)) {
    headers.set(key, String(value));
  }

  const res = await fetch(details.endpoint, {
    method: details.method,
    headers,
    body: details.body as BodyInit,
  });
  return res.status;
}

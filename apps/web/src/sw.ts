/// <reference lib="webworker" />
// Service worker source (section 17.2, 18). Compiled by vite-plugin-pwa's
// injectManifest strategy, not by the app's tsc (it is excluded from
// tsconfig), so it can use the webworker lib without colliding with the DOM
// lib the rest of the app uses.
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache the app shell that vite-plugin-pwa injects here.
precacheAndRoute(self.__WB_MANIFEST);

// autoUpdate: take over as soon as a new worker is ready, so the app's
// controllerchange handler (pwa.ts) can show its update overlay and reload.
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushPayload {
  title?: string;
  body?: string;
  areaId?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  const data: PushPayload = event.data?.json() ?? {};
  const { title, body, areaId, url } = data;
  // The OS already shows the app name ("Harmony") as the banner header, so the
  // notification's own heading should be the message itself, not "Harmony"
  // again. Use the message (body) as the heading and omit the second line.
  const heading = body || title || 'Harmony';
  event.waitUntil(
    self.registration.showNotification(heading, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      tag: areaId ? `area-${areaId}` : undefined, // coalesce per-area nudges
      data: { url, areaId },
      // Vibration is part of the standard NotificationOptions but missing from
      // some lib typings; widen locally rather than dropping it.
      vibrate: [40, 30, 40],
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c);
      if (existing) return (existing as WindowClient).focus();
      return self.clients.openWindow(url);
    }),
  );
});

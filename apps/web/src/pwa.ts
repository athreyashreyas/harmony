import { registerSW } from 'virtual:pwa-register';
import { showUpdatingOverlay } from './appUpdate';

// Registers the service worker and handles seamless updates (section 18). With
// registerType autoUpdate a new worker activates on its own; when it takes
// control, controllerchange fires and we show a brief "Updating Harmony"
// overlay before reloading, so the swap never looks like a glitch. The overlay
// and the forceful "make the update land now" path both live in appUpdate.ts,
// which the Sync button also drives.

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // hourly

export function setupPWA() {
  if (!('serviceWorker' in navigator)) return;

  // Whether a worker already controls this page at startup. On the very first
  // visit there is none: the worker installs, calls clients.claim(), and fires
  // controllerchange for the FIRST time. Reloading on that first claim would
  // restart the app mid-session (and wipe in-memory state like a half-finished
  // onboarding draft). Only reload when an EXISTING controller is replaced by a
  // genuinely new worker, which is the real "an update shipped" case.
  const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

  // registerType is autoUpdate, so a new worker installs and activates itself
  // whenever one is found. The checks below make an installed PWA (which can
  // stay open for days without a navigation) actually look for new versions on
  // its own, so updates flow without anyone re-adding the home-screen icon.
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        registration.update().catch(() => {
          /* offline or transient: try again next interval */
        });
      };
      setInterval(check, UPDATE_CHECK_INTERVAL);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      // Regaining connectivity is a strong moment to look for a shipped update.
      window.addEventListener('online', check);
    },
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtStartup) return;
    if (reloading) return;
    reloading = true;
    showUpdatingOverlay();
    setTimeout(() => window.location.reload(), 700);
  });
}

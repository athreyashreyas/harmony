import { registerSW } from 'virtual:pwa-register';

// Registers the service worker and handles seamless updates (section 18). With
// registerType autoUpdate a new worker activates on its own; when it takes
// control, controllerchange fires and we show a brief "Updating Harmony"
// overlay before reloading, so the swap never looks like a glitch.

function showUpdatingOverlay() {
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-busy', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9999',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:16px',
    'background:#FAF9F6',
    'font-family:"Plus Jakarta Sans",system-ui,sans-serif',
    'color:#6B6960',
    'font-size:14px',
  ].join(';');

  const dot = document.createElement('div');
  dot.style.cssText = [
    'width:14px',
    'height:14px',
    'border-radius:9999px',
    'background:#574887',
    'animation:harmony-pulse 0.9s ease-in-out infinite',
  ].join(';');

  const label = document.createElement('div');
  label.textContent = 'Updating Harmony';

  const style = document.createElement('style');
  style.textContent =
    '@keyframes harmony-pulse{0%,100%{opacity:0.3;transform:scale(0.85)}50%{opacity:1;transform:scale(1)}}';

  overlay.append(style, dot, label);
  document.body.append(overlay);
}

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

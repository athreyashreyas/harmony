import { registerSW } from 'virtual:pwa-register';

// Registers the service worker and handles seamless updates (section 18). With
// registerType autoUpdate a new worker activates on its own; when it takes
// control, controllerchange fires and we show a brief "Updating Harmony"
// overlay before reloading, so the swap never looks like a glitch.

// The same one screen as the boot splash (app icon + "Updating Harmony"), so the
// version swap and the reload that follows look like a single continuous screen.
// Themed via the CSS variables, with terracotta fallbacks.
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
    'gap:20px',
    'background:var(--parchment-100,#FBF1E4)',
    'font-family:"Plus Jakarta Sans",system-ui,sans-serif',
    'color:var(--ink-500,#76654C)',
    'font-size:14px',
    'font-weight:500',
  ].join(';');

  const logo = document.createElement('img');
  logo.src = '/icons/icon-192.png';
  logo.width = 80;
  logo.height = 80;
  logo.style.cssText =
    'border-radius:20px;box-shadow:0 1px 2px rgba(35,25,15,0.05),0 1px 3px rgba(35,25,15,0.04)';

  const label = document.createElement('div');
  label.textContent = 'Updating Harmony';
  label.style.cssText = 'animation:harmony-pulse 1.6s ease-in-out infinite';

  const style = document.createElement('style');
  style.textContent = '@keyframes harmony-pulse{0%,100%{opacity:0.4}50%{opacity:0.85}}';

  overlay.append(style, logo, label);
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

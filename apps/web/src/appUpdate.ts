// Robust app-version updates for the installed PWA (section 18).
//
// There are two independent "syncs": the data layer (habits/logs/settings ↔
// Supabase, surfaced by the Sync dot) and the *code* layer (swapping in a newly
// deployed bundle, which is how a new theme or feature actually arrives). This
// module is the code layer. On stubborn platforms — notably iOS home-screen
// PWAs — a running service worker can refuse to swap even when a new one is
// deployed, so the app stays on old code while data sync still reports "Synced".
// These helpers make an update actually land, without the user ever having to
// remove and re-add the home-screen icon.
//
// IMPORTANT: nothing here touches IndexedDB (Dexie), where the user's data
// lives. The heaviest thing we ever do is drop the service worker's asset Cache
// Storage — which re-downloads instantly from the network. No data is at risk.

// The build running in this tab, injected at build time (Vite `define`, from
// Cloudflare's CF_PAGES_COMMIT_SHA). The `typeof` guard keeps this safe under
// vitest, where the define is absent.
const RUNNING_BUILD: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

// One shared "Updating Harmony" screen (the same art as the boot splash), shown
// just before a reload so the version swap reads as one continuous screen and
// never looks like a glitch. Themed via CSS variables, with terracotta
// fallbacks for the split second before tokens apply.
export function showUpdatingOverlay(): void {
  if (document.querySelector('[data-harmony-updating]')) return;

  const overlay = document.createElement('div');
  overlay.setAttribute('data-harmony-updating', '');
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

// Is the server serving a newer build than the one running here? Probed via a
// tiny version.json (emitted at build time), fetched no-store so neither the
// browser's HTTP cache nor the SW precache can mask a fresh deploy — version.json
// is deliberately not precached, and is served no-cache by Cloudflare (_headers).
async function serverHasNewerBuild(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000); // never hang on a probe
    const res = await fetch('/version.json', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { build?: string };
    return typeof data.build === 'string' && data.build !== RUNNING_BUILD;
  } catch {
    return false;
  }
}

// Resolve to `fallback` if `p` has not settled within `ms`, so a slow or wedged
// network call can never hang the Sync button. A rejection resolves to fallback
// too — a failed update check should be invisible, not fatal.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (v: T) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(v);
      }
    };
    const timer = setTimeout(() => finish(fallback), ms);
    p.then(finish, () => finish(fallback));
  });
}

const RECOVER_KEY = 'harmony.lastHardRecover';

// Last resort, for when a new version is deployed but the worker will not swap
// on its own: unregister the service worker(s) and delete the asset caches, then
// reload straight from the network. IndexedDB is untouched, so no data is lost —
// and, unlike removing the icon, the home-screen app stays installed. Guarded to
// run at most once every couple of minutes per tab session, so a transient
// version.json mismatch (e.g. CDN lag right after a deploy) can never spin the
// app into a reload loop.
async function hardRecover(): Promise<void> {
  if (!navigator.onLine) return; // offline: nothing to fetch; keep serving cache
  try {
    const last = Number(sessionStorage.getItem(RECOVER_KEY) ?? '0');
    if (Date.now() - last < 120_000) return;
    sessionStorage.setItem(RECOVER_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode): proceed once, no persistent guard
  }

  showUpdatingOverlay();
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignore — reload below still gets fresher assets than we have now
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k))); // asset caches only, never IndexedDB
  } catch {
    // ignore
  }
  window.location.reload();
}

// Force the app to pick up a newly deployed version if there is one. Graceful
// path first: ask the worker to check, and if a new one is installing or
// waiting, tell it to take over now (pwa.ts then shows the overlay and reloads
// on controllerchange). If nothing surfaces but the server genuinely has a newer
// build, the worker is wedged — fall back to a hard recover. Resolves to
// 'updating' when a reload is imminent, 'current' when already up to date.
export async function applyUpdateNow(): Promise<'updating' | 'current'> {
  if (!('serviceWorker' in navigator)) return 'current';

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'current';

  // Watch for a graceful worker swap kicking off during this call, so we don't
  // also trigger a (redundant) hard recover while pwa.ts is already reloading.
  let controllerChanged = false;
  const onControllerChange = () => {
    controllerChanged = true;
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  try {
    // Ask the worker to check AND probe the deployed build id at the same time,
    // each time-boxed. Running them in parallel (rather than sleeping between)
    // keeps the Sync button responsive; the timeouts keep it from ever hanging.
    const [, newer] = await Promise.all([
      withTimeout(reg.update(), 4000, undefined),
      withTimeout(serverHasNewerBuild(), 4000, false),
    ]);

    // If update() surfaced a new worker, take the graceful swap: nudge it to
    // activate (sw.ts also self-skips), and pwa.ts reloads on controllerchange.
    const pending = reg.waiting ?? reg.installing;
    if (pending) {
      pending.postMessage({ type: 'SKIP_WAITING' });
      return 'updating';
    }

    // A graceful swap already fired (or is firing) — let pwa.ts do the reload.
    if (controllerChanged) return 'updating';

    // Nothing surfaced but the server is genuinely ahead → the worker is wedged.
    if (newer) {
      await hardRecover();
      return 'updating';
    }
    return 'current';
  } finally {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }
}

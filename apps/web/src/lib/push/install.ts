// Install detection for onboarding screen 6 (section 8). Push subscription
// itself is a later phase; this only covers platform detection and capturing
// the browser install prompt so the screen can offer the right instructions.

export type Platform = 'ios-safari' | 'android' | 'desktop' | 'other';

// The beforeinstallprompt event is not in the standard lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Registered once at module load so the event (which fires early) is not missed.
export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes standalone on navigator instead of display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOS && isSafari) return 'ios-safari';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh|Windows|Linux/.test(ua)) return 'desktop';
  return 'other';
}

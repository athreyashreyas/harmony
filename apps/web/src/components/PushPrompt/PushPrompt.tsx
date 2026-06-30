import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import {
  dismissPushPrompt,
  enablePush,
  isPushPromptDismissed,
  pushReadiness,
  type PushReadiness,
} from '../../lib/push/subscribe';

// The gentle, one-card permission explainer (section 17.1), shown on Home after
// onboarding. On iOS Safari that hasn't been installed yet, it explains that
// notifications need the home screen first (Apple's rule, section 17.5). It
// only appears when there is actually something to offer, and "Not now"
// quiets it for good.
export default function PushPrompt({ userId }: { userId: string }) {
  const [readiness, setReadiness] = useState<PushReadiness | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReadiness(pushReadiness());
    void isPushPromptDismissed().then((d) => setDismissed(d));
  }, []);

  if (dismissed || readiness == null) return null;
  if (readiness !== 'ready' && readiness !== 'needs-install') return null;

  async function turnOn() {
    setBusy(true);
    const result = await enablePush(userId);
    setBusy(false);
    setReadiness(result);
    if (result === 'granted') {
      await dismissPushPrompt();
      setDismissed(true);
    }
  }

  async function notNow() {
    await dismissPushPrompt();
    setDismissed(true);
  }

  const isInstall = readiness === 'needs-install';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mt-6 rounded-card bg-iris-50 p-4"
    >
      <p className="text-sm font-medium text-ink-900">
        {isInstall ? 'Add Harmony to your home screen' : 'Bring your words back to you'}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        {isInstall
          ? 'Tap the share icon, then "Add to Home Screen". Notifications only work this way on iPhone, by Apple\'s design.'
          : 'Notifications are how we bring your words back to you. Sound, banner, lock screen, like any other app.'}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {!isInstall && (
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="rounded-full bg-iris-500 px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-40"
          >
            Turn on reminders
          </button>
        )}
        <button type="button" onClick={notNow} className="text-sm text-ink-500 hover:text-ink-700">
          Not now
        </button>
      </div>
    </motion.div>
  );
}

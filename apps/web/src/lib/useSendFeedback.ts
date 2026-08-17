import { useCallback, useState } from 'react';
import { APP_VERSION } from './changelog';
import { composeFeedback, describeDevice, type FeedbackKind } from './feedback';
import { sendOrQueueFeedback } from './feedbackOutbox';
import { useUser } from '../store/useUser';

// idle -> sending -> sent, or -> queued when it could not go right away.
//
// 'queued' is not a failure and is not shown as one. The message is on the
// device and will be sent the moment there is a connection, which is the same
// promise Harmony already makes about everything else somebody writes into it.
export type SendState = 'idle' | 'sending' | 'sent' | 'queued';

// True when the app is running from the home screen rather than a browser tab.
function isInstalled(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

// The sender's own local time, spelled out. No date library in this app, so
// Intl does it: "17 August 2026 at 21:40".
function localTimestamp(now = new Date()): string {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return `${date} at ${time}`;
}

// Sends a message to the creator, or keeps it safe until it can be sent.
// Nothing written here can be lost: the only two endings are that it went, or
// that it is waiting on the device to go.
export function useSendFeedback() {
  const email = useUser((s) => s.email);
  const [state, setState] = useState<SendState>('idle');

  const send = useCallback(
    async (kind: FeedbackKind, message: string) => {
      const mail = composeFeedback(kind, message, {
        version: APP_VERSION,
        account: email,
        device: describeDevice(navigator.userAgent, isInstalled()),
        sentAt: localTimestamp(),
      });

      setState('sending');
      const outcome = await sendOrQueueFeedback(kind, mail.subject, mail.body);
      // A message that could not even be stored goes back to the form with every
      // word still in the box, rather than leaving the button reading "Sending"
      // for ever over a message that no longer exists anywhere.
      setState(outcome === 'failed' ? 'idle' : outcome);
      return outcome;
    },
    [email],
  );

  const reset = useCallback(() => setState('idle'), []);

  return { state, account: email, send, reset };
}

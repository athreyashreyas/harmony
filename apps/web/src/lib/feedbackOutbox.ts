import { db, type FeedbackOutboxItem } from './db/schema';
import { supabase } from './supabase/client';
import type { FeedbackKind } from './feedback';

// Messages waiting to reach the creator.
//
// Harmony is local-first everywhere else, and a message written in Me is treated
// the same way: it is written to Dexie first and delivered when there is a
// connection. Somebody on a train can write what went wrong, close the app, and
// never think about it again.
//
// Deliberately its own small queue rather than a row in the write outbox, which
// is shaped around tables and rows and would have to be bent out of shape to
// carry a message that belongs to no table.

// Attempts before a message is given up on, so a queue cannot grow forever.
const MAX_ATTEMPTS = 8;

let flushing = false;

// Hands one message to the relay. Throws when it did not get through.
async function relay(item: FeedbackOutboxItem): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured on this build.');
  const { error } = await supabase.functions.invoke('feedback', {
    body: { kind: item.kind, subject: item.subject, body: item.body },
  });
  if (error) throw error;
}

// Tries to send now, and keeps the message if it cannot. Returns how it went, so
// the sheet can tell the truth about which of the three happened.
//
// 'failed' is the one the sheet must not paper over: the device would not even
// store the message, so promising it will go later would be a lie.
export async function sendOrQueueFeedback(
  kind: FeedbackKind,
  subject: string,
  body: string,
): Promise<'sent' | 'queued' | 'failed'> {
  const item: FeedbackOutboxItem = {
    kind,
    subject,
    body,
    createdAt: Date.now(),
    attempts: 0,
  };

  if (navigator.onLine) {
    try {
      await relay(item);
      return 'sent';
    } catch {
      // Fall through: it is worth keeping rather than worth losing.
    }
  }

  try {
    await db.feedbackOutbox.add({ ...item, attempts: 1 });
    return 'queued';
  } catch {
    // Storage full, or a Dexie upgrade blocked by another tab. Nothing has been
    // kept, so say so rather than showing the "it will send itself" note.
    return 'failed';
  }
}

// How many messages are still waiting.
export async function pendingFeedbackCount(): Promise<number> {
  return db.feedbackOutbox.count();
}

// Sends everything waiting, oldest first. Safe to call often: it does nothing
// offline, nothing while signed out, and never runs twice at once.
export async function flushFeedbackOutbox(): Promise<void> {
  if (flushing || !navigator.onLine || !supabase) return;

  flushing = true;
  try {
    // The relay stamps the sender from their session, so there is nobody to
    // attribute a message to until somebody is signed in.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const waiting = await db.feedbackOutbox.orderBy('createdAt').toArray();
    for (const item of waiting) {
      try {
        await relay(item);
        await db.feedbackOutbox.delete(item.id!);
      } catch {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.warn('Giving up on a queued message after', attempts, 'tries.');
          await db.feedbackOutbox.delete(item.id!);
        } else {
          await db.feedbackOutbox.update(item.id!, { attempts });
        }
        // One failure usually means the next will fail too, so stop here and let
        // the next reconnect try again rather than burning the attempts.
        break;
      }
    }
  } catch {
    // Best effort, and fired from event listeners that cannot await it. A
    // failure here means the queue is untouched and the next reconnect or
    // foreground will try again, so there is nothing to report and nothing to
    // leave as an unhandled rejection.
  } finally {
    flushing = false;
  }
}

// Watches for a chance to send. Coming back online is the obvious one; coming
// back to the app covers the case where the connection returned while it was
// closed and no event was ever heard.
export function startFeedbackOutbox(): () => void {
  const attempt = () => void flushFeedbackOutbox();
  const onVisible = () => {
    if (document.visibilityState === 'visible') attempt();
  };

  window.addEventListener('online', attempt);
  document.addEventListener('visibilitychange', onVisible);
  attempt();

  return () => {
    window.removeEventListener('online', attempt);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

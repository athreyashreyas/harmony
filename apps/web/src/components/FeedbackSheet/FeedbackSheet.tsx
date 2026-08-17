import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import BottomSheet from '../BottomSheet/BottomSheet';
import { spring } from '../../lib/motion';
import { useSendFeedback } from '../../lib/useSendFeedback';
import {
  FEEDBACK_KINDS,
  MAX_FEEDBACK_LENGTH,
  feedbackError,
  type FeedbackKind,
} from '../../lib/feedback';

// The counter stays out of sight until the end is actually in view.
const COUNTER_FROM = Math.round(MAX_FEEDBACK_LENGTH * 0.8);

// Writing to the creator, from Me.
//
// The sheet is built around one promise it has to keep: that a message genuinely
// goes somewhere. So it has two endings and neither is a shrug. It went, or it
// is saved and will go on its own. Both say plainly what happened and what
// comes next.
export default function FeedbackSheet({
  kind,
  onClose,
}: {
  // The kind to open on, or null when the sheet is closed.
  kind: FeedbackKind | null;
  onClose: () => void;
}) {
  const open = kind !== null;
  const { state, account, send, reset } = useSendFeedback();

  const [active, setActive] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Every opening starts clean, on whichever kind was tapped in Me.
  useEffect(() => {
    if (!kind) return;
    setActive(kind);
    setMessage('');
    setError(null);
    reset();
  }, [kind, reset]);

  const copy = FEEDBACK_KINDS[active];
  const sending = state === 'sending';

  async function handleSend() {
    const problem = feedbackError(message);
    setError(problem);
    if (problem) return;
    const outcome = await send(active, message);
    if (outcome === 'failed') {
      setError(
        'That could not be saved on this device just now. Your words are still here, so please try again.',
      );
    }
  }

  function chooseKind(next: FeedbackKind) {
    setActive(next);
    setError(null);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Make Harmony yours">
      {state === 'sent' || state === 'queued' ? (
        <Delivered queued={state === 'queued'} account={account} onClose={onClose} />
      ) : (
        <div className="space-y-4 pb-2">
          <div className="flex gap-1.5 rounded-card bg-parchment-200 p-1">
            <KindTab
              active={active === 'bug'}
              onClick={() => chooseKind('bug')}
              label={FEEDBACK_KINDS.bug.label}
            />
            <KindTab
              active={active === 'idea'}
              onClick={() => chooseKind('idea')}
              label={FEEDBACK_KINDS.idea.label}
            />
          </div>

          <p className="text-sm text-ink-500">{copy.prompt}</p>

          <div>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              maxLength={MAX_FEEDBACK_LENGTH + 200}
              placeholder={copy.placeholder}
              aria-label={copy.label}
              className="w-full resize-none rounded-card bg-parchment-100 px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 ring-1 ring-inset ring-parchment-300 transition-shadow placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-iris-500"
            />
            {message.length > COUNTER_FROM && (
              <p className="mt-1.5 text-right text-xs tabular-nums text-ink-300">
                {MAX_FEEDBACK_LENGTH - message.trim().length} left
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-ink-300">
            Your message goes to the person who makes Harmony.
            {account ? ` Any reply will come directly to ${account}.` : ''}
          </p>

          {/* A line is always held here, so an error arriving never shoves the
              button out from under a thumb already on its way to it. */}
          <p className="min-h-5 text-sm text-rose-600">{error}</p>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleSend}
            disabled={sending}
            className="w-full rounded-full bg-iris-500 py-3 text-sm font-medium text-on-primary transition-opacity disabled:opacity-40"
          >
            {sending ? 'Sending' : 'Send it over'}
          </motion.button>
        </div>
      )}
    </BottomSheet>
  );
}

// The moment the promise is kept, either way it went. "Thanks for your
// feedback!" tells somebody nothing, so this says where the message is, who
// reads it, and what happens next.
function Delivered({
  queued,
  account,
  onClose,
}: {
  queued: boolean;
  account: string | null;
  onClose: () => void;
}) {
  return (
    <div className="pb-2">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
          queued ? 'bg-parchment-200' : 'bg-iris-500'
        }`}
      >
        {queued ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500" aria-hidden="true">
            <path d="M3 3l18 18M8.5 6.5A6 6 0 0 1 18 11h1a4 4 0 0 1 2.4 7.2M6 10a4 4 0 0 0 0 8h9" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-primary" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </motion.div>

      <p className="text-center font-serif text-xl text-ink-900">
        {queued ? 'Saved, and it will send itself.' : 'That is with them now.'}
      </p>

      <div className="mx-auto mt-3 max-w-sm space-y-2.5 text-center text-sm text-ink-500">
        {queued ? (
          <p>
            It could not go just now, so it is sitting on your device. Harmony
            sends it the next time it gets a connection, whether or not you open
            the app again.
          </p>
        ) : (
          <p>
            It arrived with your version and device attached, so they can see the
            same screen you were looking at.
          </p>
        )}
        <p>
          Harmony is built and maintained by one person. They read what comes in,
          and they write back when there is something worth saying. A fair amount
          of what is in the app now started as somebody&apos;s message.
        </p>
        {account && (
          <p>
            Any reply will come to <span className="font-medium text-ink-700">{account}</span>.
          </p>
        )}
        <p className="text-ink-300">Thank you for taking the time.</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-full bg-parchment-200 py-3 text-sm font-medium text-ink-700 hover:bg-parchment-300"
      >
        Close
      </button>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-card py-2 text-xs font-medium transition-colors ${
        active ? 'bg-parchment-50 text-ink-900 shadow-card' : 'text-ink-500'
      }`}
    >
      {label}
    </button>
  );
}

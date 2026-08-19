import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DND } from '@harmony/shared';
import TabScreen from '../../app/TabScreen';
import Modal from '../../components/Modal/Modal';
import FeedbackSheet from '../../components/FeedbackSheet/FeedbackSheet';
import { useNavigate } from 'react-router-dom';
import Switch from '../../components/Switch/Switch';
import { APP_VERSION } from '../../lib/changelog';
import type { FeedbackKind } from '../../lib/feedback';
import { enablePush, pushReadiness, type PushReadiness } from '../../lib/push/subscribe';
import { requestSunLocation, useTheme } from '../../lib/theme/theme';
import { THEME_PAIRS, pairFor } from '../../lib/theme/themes';
import { supabase } from '../../lib/supabase/client';
import { deleteAccount, flushOutbox, wipeLocalData } from '../../lib/supabase/sync';
import { useUserData } from '../../lib/useUserData';
import { useSettings } from '../../store/useSettings';
import { useUser } from '../../store/useUser';
import { PrimaryButton } from '../onboarding/ui';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { profile, areas } = useUserData();
  const setSignedOut = useUser((s) => s.setSignedOut);
  const email = useUser((s) => s.email);
  const notifications = useSettings((s) => s.notifications);
  const loadNotifications = useSettings((s) => s.load);
  const updateNotifications = useSettings((s) => s.update);
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);
  const followSun = useTheme((s) => s.followSun);
  const showingId = useTheme((s) => s.showingId);
  const setFollowSun = useTheme((s) => s.setFollowSun);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Which kind the feedback sheet opens on, or null while it is closed.
  const [feedback, setFeedback] = useState<FeedbackKind | null>(null);
  // Type-to-confirm: deleting an account is irreversible, so the button stays
  // inert until they deliberately type the confirmation word, guarding against
  // an accidental tap.
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const DELETE_WORD = 'DELETE';
  const canDelete = deleteConfirm.trim().toUpperCase() === DELETE_WORD && !deleting;

  function openDeleteModal() {
    setDeleteConfirm('');
    setDeleteOpen(true);
  }
  function closeDeleteModal() {
    setDeleteOpen(false);
    setDeleteConfirm('');
  }
  // pushReadiness() is synchronous, so seed it on first render to avoid a flash.
  const [pushState, setPushState] = useState<PushReadiness>(() => pushReadiness());
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // The preference lives on the synced settings row so it follows the person;
  // the store holds the working copy that actually drives the repaint.
  useEffect(() => {
    if (notifications) setFollowSun(notifications.followSun ?? false);
  }, [notifications?.followSun, setFollowSun]);

  async function chooseFollowSun(next: boolean) {
    setFollowSun(next); // instant, local
    // Ask for a location only on the way on, and only once. A refusal still
    // leaves a working feature on the fallback hours.
    if (next) await requestSunLocation();
    setFollowSun(next);
    if (profile) void updateNotifications(profile.id, { followSun: next });
  }

  // Theme: switch on this device instantly, but debounce the cloud save. Saving
  // on every tap during rapid toggling spams the synced settings row, whose
  // realtime echoes (of intermediate themes, possibly out of order) would flip
  // the selection back and forth. Debouncing means one save of the settled
  // choice: one echo, equal to what's already showing, so no flicker.
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTheme = useRef<{ uid: string; id: string } | null>(null);

  function chooseTheme(id: string) {
    setTheme(id); // instant, local
    if (!profile) return;
    pendingTheme.current = { uid: profile.id, id };
    if (themeTimer.current) clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(() => {
      if (pendingTheme.current) {
        void updateNotifications(pendingTheme.current.uid, { theme: pendingTheme.current.id });
        pendingTheme.current = null;
      }
    }, 500);
  }

  // Flush any pending theme save if they leave before the debounce fires.
  useEffect(
    () => () => {
      if (themeTimer.current) clearTimeout(themeTimer.current);
      if (pendingTheme.current) {
        void updateNotifications(pendingTheme.current.uid, { theme: pendingTheme.current.id });
      }
    },
    [updateNotifications],
  );

  const dnd = notifications ?? {
    masterEnabled: true,
    mutedAreaIds: [],
    dndStart: DEFAULT_DND.start,
    dndEnd: DEFAULT_DND.end,
    habitReminders: true,
    dailySummary: true,
    confettiEnabled: true,
  };

  const mutedSet = useMemo(() => new Set(dnd.mutedAreaIds), [dnd.mutedAreaIds]);

  async function handleSignOut() {
    // Flush queued writes while still authenticated, then sign out and wipe the
    // local cache so nothing is left on this device for the next account.
    await flushOutbox();
    await supabase?.auth.signOut();
    await wipeLocalData();
    setSignedOut();
  }

  function toggleAreaMuted(areaId: string) {
    if (!profile) return;
    const next = mutedSet.has(areaId)
      ? dnd.mutedAreaIds.filter((id) => id !== areaId)
      : [...dnd.mutedAreaIds, areaId];
    void updateNotifications(profile.id, { mutedAreaIds: next });
  }

  async function handleEnablePush() {
    if (!profile || pushBusy) return;
    setPushBusy(true);
    try {
      const result = await enablePush(profile.id);
      setPushState(result);
    } catch (err) {
      console.error('enablePush failed', err);
      // Permission was likely granted but storing the subscription failed;
      // reflect the real browser permission so the UI is not stuck.
      setPushState(pushReadiness());
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!profile || !canDelete) return;
    setDeleting(true);
    await deleteAccount(profile.id);
    await supabase?.auth.signOut();
    window.location.href = '/sign-in';
  }

  // A single line describing how push stands on this specific device, beneath
  // the per-area toggles (which govern the worker, not the browser permission).
  function deviceNotice() {
    switch (pushState) {
      case 'granted':
        return <p className="mt-3 text-xs text-ink-faint">Reminders are on for this device.</p>;
      case 'denied':
        return (
          <p className="mt-3 text-xs text-ink-faint">
            Notifications are blocked in your browser settings. Turn them on there to enable reminders.
          </p>
        );
      case 'needs-install':
        return (
          <p className="mt-3 text-xs text-ink-faint">
            Add Harmony to your home screen first, then reminders can be turned on here.
          </p>
        );
      case 'unconfigured':
        return (
          <p className="mt-3 text-xs text-ink-faint">
            Push is not configured for this build yet.
          </p>
        );
      case 'ready':
        return (
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={pushBusy}
            className="mt-3 rounded-full bg-accent-base px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40"
          >
            {pushBusy ? 'Turning on...' : 'Turn on reminders on this device'}
          </button>
        );
      default:
        return null;
    }
  }

  // The tab bar is a flex sibling rather than an overlay, so this screen needs
  // no clearance under it: the version line ends the page.
  return (
    <TabScreen className="pt-8 pb-10">
      <h1 className="font-serif text-3xl text-ink-strong">Me</h1>

      <section className="mt-7">
        <p className={eyebrow}>Account</p>
        {/* Fixed height so the buttons below never jump when the email lands. */}
        <p className="mt-2 min-h-[1.25rem] text-sm text-ink-body">{email ?? ''}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-parchment-raised px-5 py-2.5 text-sm font-medium text-ink-body hover:bg-parchment-edge"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={openDeleteModal}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-rose-strong hover:bg-rose-wash"
          >
            Delete account
          </button>
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Appearance</p>
        <p className="mt-2 text-xs text-ink-faint">Pick the theme you want to open into. Each pair is one colour: daylight on the left, after dark on the right.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* One card per couple, two tiles inside it. The coin leads and the
              name gets a line of its own, so "Mango Sunshine" fits where it
              would not in a text column. The coin's centre is the theme's own
              paper, which reads as day or night without needing a label. */}
          {THEME_PAIRS.map(({ light, dark }) => (
            <div
              key={light.id}
              className="grid grid-cols-2 gap-1 rounded-card bg-parchment-surface p-1 shadow-card"
            >
              {[light, dark].map((theme) => {
                // With the sun driving, the choice is the couple, so both
                // halves read as chosen and only the one on screen is ticked.
                const chosen = followSun ? pairFor(themeId).light.id === light.id : theme.id === themeId;
                const active = theme.id === showingId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => chooseTheme(theme.id)}
                    aria-pressed={active}
                    aria-label={`Use the ${theme.name} theme, ${theme.dark ? 'for after dark' : 'for the day'}`}
                    className={`flex flex-col items-center gap-2 rounded-[9px] px-2 py-3 ring-2 ${
                      active
                        ? 'bg-parchment-raised ring-accent-base'
                        : 'ring-transparent hover:bg-parchment-raised/60'
                    }`}
                  >
                    <span className="relative">
                      <span
                        className="block h-12 w-12 rounded-full"
                        style={{
                          background: `radial-gradient(circle at center, ${theme.bg} 0 42%, ${theme.primary} 45% 100%)`,
                          boxShadow: `inset 0 0 0 1px ${theme.edge}`,
                        }}
                      />
                      {chosen && active && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-base text-on-accent"
                          aria-hidden="true"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                    </span>
                    <span className="text-center text-xs font-medium leading-tight text-ink-strong">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card">
          <span className="min-w-0 pr-3">
            <span className="block text-sm text-ink-strong">Follow the sun</span>
            <span className="block text-xs text-ink-faint">
              Your theme&rsquo;s day half from sunrise, its after-dark half once the sun goes
              down. Asks once where you are so it knows when that is; say no and it uses 7am
              and 7pm.
            </span>
          </span>
          <Switch
            checked={followSun}
            onChange={(next) => void chooseFollowSun(next)}
            label="Follow the sun"
          />
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Celebrations</p>
        <div className="mt-3 flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card">
          <span className="min-w-0 pr-3">
            <span className="block text-sm text-ink-strong">Confetti in full bloom</span>
            <span className="block text-xs text-ink-faint">A little burst when an area fills, in its own colour. Turn it off for a calmer Bloom.</span>
          </span>
          <Switch
            checked={dnd.confettiEnabled ?? true}
            onChange={(next) => profile && void updateNotifications(profile.id, { confettiEnabled: next })}
            label="Confetti celebrations"
          />
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Notifications</p>
        <div className="mt-3 flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card">
          <span className="text-sm text-ink-strong">All notifications</span>
          <Switch
            checked={dnd.masterEnabled}
            onChange={(next) => profile && void updateNotifications(profile.id, { masterEnabled: next })}
            label="All notifications"
          />
        </div>

        {dnd.masterEnabled && deviceNotice()}

        {dnd.masterEnabled && (
          <>
            <div className="mt-4 space-y-2">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card"
                >
                  <span className="flex items-center gap-2 text-sm text-ink-strong">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                    {area.name}
                  </span>
                  <Switch
                    checked={!mutedSet.has(area.id)}
                    onChange={() => toggleAreaMuted(area.id)}
                    label={`Notifications for ${area.name}`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-card bg-parchment-surface p-4 shadow-card">
              <p className="text-sm text-ink-strong">Do not disturb</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Drift nudges and the evening summary pause during this window. Reminders you set a time
                for still come through.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="time"
                  value={dnd.dndStart}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndStart: e.target.value })}
                  aria-label="Do not disturb start"
                  className="rounded-card bg-parchment-ground px-3 py-2 text-sm text-ink-strong ring-1 ring-inset ring-parchment-edge"
                />
                <span className="text-sm text-ink-faint">to</span>
                <input
                  type="time"
                  value={dnd.dndEnd}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndEnd: e.target.value })}
                  aria-label="Do not disturb end"
                  className="rounded-card bg-parchment-ground px-3 py-2 text-sm text-ink-strong ring-1 ring-inset ring-parchment-edge"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card">
              <span className="min-w-0 pr-3">
                <span className="block text-sm text-ink-strong">Habit reminders</span>
                <span className="block text-xs text-ink-faint">A nudge at a habit's set time, on the days it's due.</span>
              </span>
              <Switch
                checked={dnd.habitReminders}
                onChange={(next) => profile && void updateNotifications(profile.id, { habitReminders: next })}
                label="Habit reminders"
              />
            </div>

            <div className="mt-2 flex items-center justify-between rounded-card bg-parchment-surface px-4 py-3 shadow-card">
              <span className="min-w-0 pr-3">
                <span className="block text-sm text-ink-strong">Evening summary</span>
                <span className="block text-xs text-ink-faint">One gentle round-up of anything still unlogged that day.</span>
              </span>
              <Switch
                checked={dnd.dailySummary}
                onChange={(next) => profile && void updateNotifications(profile.id, { dailySummary: next })}
                label="Evening summary"
              />
            </div>
          </>
        )}
      </section>

      {/* A line straight to the person who makes it. */}
      <section className="mt-9">
        <p className={eyebrow}>Make Harmony Yours</p>
        <p className="mt-2 text-xs text-ink-faint">
          One person looks after Harmony, and whatever you write here lands on
          their desk. Tell them what went wrong, or what you wish the app did. A
          sentence or two is plenty.
        </p>
        <div className="mt-3 space-y-2">
          <FeedbackRow
            title="Report something broken"
            sub="Something behaving differently to how you expected?"
            onClick={() => setFeedback('bug')}
          />
          <FeedbackRow
            title="Suggest something"
            sub="Even a half-thought is worth sending."
            onClick={() => setFeedback('idea')}
          />
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Guide</p>
        <button
          type="button"
          onClick={() => navigate('/guide?pane=new', { replace: true })}
          className="mt-3 flex w-full items-center justify-between rounded-card bg-parchment-surface px-4 py-3.5 text-left shadow-card"
        >
          <span className="min-w-0 pr-3">
            <span className="block text-sm text-ink-strong">How Harmony works</span>
            <span className="block text-xs text-ink-faint">What's new, and how to use everything.</span>
          </span>
          <span className="shrink-0 text-ink-faint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>About</p>
        <p className="mt-2 text-sm text-ink-muted">Harmony, version {APP_VERSION}.</p>
      </section>

      <Modal open={deleteOpen} onClose={closeDeleteModal} title="Delete account">
        <p className="text-sm text-ink-body">
          This deletes everything you've added: your areas, habits, logs, and notes, on this device
          and in your account. It can't be undone.
        </p>
        <label htmlFor="delete-confirm" className="mt-4 block text-sm text-ink-body">
          Type <span className="font-semibold">{DELETE_WORD}</span> to confirm.
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder={DELETE_WORD}
          aria-label={`Type ${DELETE_WORD} to confirm account deletion`}
          className="mt-1.5 w-full rounded-card bg-parchment-ground px-3.5 py-2.5 text-sm text-ink-strong ring-1 ring-inset ring-parchment-edge placeholder:text-ink-faint focus:ring-2 focus:ring-accent-base"
        />
        <div className="mt-5 space-y-2">
          <PrimaryButton onClick={handleDeleteAccount} disabled={!canDelete}>
            {deleting ? 'Deleting...' : 'Delete everything'}
          </PrimaryButton>
          <button
            type="button"
            onClick={closeDeleteModal}
            className="w-full rounded-full py-2.5 text-sm text-ink-muted"
          >
            Keep my account
          </button>
        </div>
      </Modal>

      <FeedbackSheet kind={feedback} onClose={() => setFeedback(null)} />
    </TabScreen>
  );
}

// One tappable row in "Make Harmony Yours", shaped like the Guide row above it.
function FeedbackRow({
  title,
  sub,
  onClick,
}: {
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-card bg-parchment-surface px-4 py-3.5 text-left shadow-card"
    >
      <span className="min-w-0 pr-3">
        <span className="block text-sm text-ink-strong">{title}</span>
        <span className="block text-xs text-ink-faint">{sub}</span>
      </span>
      <span className="shrink-0 text-ink-faint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}

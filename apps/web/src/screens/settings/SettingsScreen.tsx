import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area } from '@harmony/shared';
import { DEFAULT_DND } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import Modal from '../../components/Modal/Modal';
import { useNavigate } from 'react-router-dom';
import Switch from '../../components/Switch/Switch';
import { APP_VERSION } from '../../lib/changelog';
import { reorderAreas, saveArea } from '../../lib/db/queries';
import { enablePush, pushReadiness, type PushReadiness } from '../../lib/push/subscribe';
import { useTheme } from '../../lib/theme/theme';
import { THEMES } from '../../lib/theme/themes';
import { supabase } from '../../lib/supabase/client';
import { deleteAccount, flushOutbox, wipeLocalData } from '../../lib/supabase/sync';
import { useUserData } from '../../lib/useUserData';
import { useAreas } from '../../store/useAreas';
import { useSettings } from '../../store/useSettings';
import { useUser } from '../../store/useUser';
import AreaSheet, { type AreaFields } from '../areas/AreaSheet';
import { PrimaryButton } from '../onboarding/ui';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { profile, areas, habits, logs, reloadAreas } = useUserData();
  const setSignedOut = useUser((s) => s.setSignedOut);
  const email = useUser((s) => s.email);
  const notifications = useSettings((s) => s.notifications);
  const loadNotifications = useSettings((s) => s.load);
  const updateNotifications = useSettings((s) => s.update);
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);

  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // pushReadiness() is synchronous, so seed it on first render to avoid a flash.
  const [pushState, setPushState] = useState<PushReadiness>(() => pushReadiness());
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

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

  // Persist the area order on drag end only, and don't re-sync from the store
  // mid-drag, so the live list never fights framer's in-progress reorder.
  const dragging = useRef(false);
  const latestOrder = useRef<Area[]>(areas);

  useEffect(() => {
    if (dragging.current) return;
    setOrderedAreas(areas);
    latestOrder.current = areas;
  }, [areas]);

  const dnd = notifications ?? {
    masterEnabled: true,
    mutedAreaIds: [],
    dndStart: DEFAULT_DND.start,
    dndEnd: DEFAULT_DND.end,
    habitReminders: true,
    dailySummary: true,
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

  function handleReorder(next: Area[]) {
    latestOrder.current = next;
    setOrderedAreas(next);
  }

  async function persistAreaOrder() {
    dragging.current = false;
    const persisted = await reorderAreas(latestOrder.current);
    useAreas.setState({ areas: persisted });
  }

  async function handleSaveArea(fields: AreaFields) {
    if (!editingArea) return;
    await saveArea({ ...editingArea, ...fields });
    if (profile) await reloadAreas(profile.id);
    setSheetOpen(false);
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
    if (!profile) return;
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
        return <p className="mt-3 text-xs text-ink-300">Reminders are on for this device.</p>;
      case 'denied':
        return (
          <p className="mt-3 text-xs text-ink-300">
            Notifications are blocked in your browser settings. Turn them on there to enable reminders.
          </p>
        );
      case 'needs-install':
        return (
          <p className="mt-3 text-xs text-ink-300">
            Add Harmony to your home screen first, then reminders can be turned on here.
          </p>
        );
      case 'unconfigured':
        return (
          <p className="mt-3 text-xs text-ink-300">
            Push is not configured for this build yet.
          </p>
        );
      case 'ready':
        return (
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={pushBusy}
            className="mt-3 rounded-full bg-iris-500 px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-40"
          >
            {pushBusy ? 'Turning on...' : 'Turn on reminders on this device'}
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Me</h1>

      <section className="mt-7">
        <p className={eyebrow}>Account</p>
        {/* Fixed height so the buttons below never jump when the email lands. */}
        <p className="mt-2 min-h-[1.25rem] text-sm text-ink-700">{email ?? ''}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-parchment-200 px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-parchment-300"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-100"
          >
            Delete account
          </button>
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Appearance</p>
        <p className="mt-2 text-xs text-ink-300">Pick the light you want to open into.</p>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => chooseTheme(theme.id)}
                aria-pressed={active}
                aria-label={`Use the ${theme.name} theme`}
                className={`flex items-center gap-3 rounded-card bg-parchment-50 px-3 py-3 text-left shadow-card ring-2 transition-shadow ${
                  active ? 'ring-iris-500' : 'ring-transparent'
                }`}
              >
                {/* A little swatch: the theme's paper with its accent and surface. */}
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
                >
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.primary }} />
                  <span
                    className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.surface, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">{theme.name}</span>
                    {active && (
                      <span className="text-iris-500" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-300">{theme.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Priority order</p>
        <p className="mt-2 text-xs text-ink-300">
          These don't have to be in stone. Drag to reorder, tap to edit.
        </p>
        {orderedAreas.length > 0 && (
          <Reorder.Group axis="y" values={orderedAreas} onReorder={handleReorder} className="mt-4 space-y-2.5">
            {orderedAreas.map((area) => (
              <AreaRow
                key={area.id}
                area={area}
                habits={habits}
                logs={logs}
                showImportance
                onOpen={() => {
                  setEditingArea(area);
                  setSheetOpen(true);
                }}
                onDragStart={() => {
                  dragging.current = true;
                }}
                onDragEnd={() => void persistAreaOrder()}
              />
            ))}
          </Reorder.Group>
        )}
      </section>

      <section className="mt-9">
        <p className={eyebrow}>Notifications</p>
        <div className="mt-3 flex items-center justify-between rounded-card bg-parchment-50 px-4 py-3 shadow-card">
          <span className="text-sm text-ink-900">All notifications</span>
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
                  className="flex items-center justify-between rounded-card bg-parchment-50 px-4 py-3 shadow-card"
                >
                  <span className="flex items-center gap-2 text-sm text-ink-900">
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

            <div className="mt-4 rounded-card bg-parchment-50 p-4 shadow-card">
              <p className="text-sm text-ink-900">Do not disturb</p>
              <p className="mt-0.5 text-xs text-ink-300">
                Drift nudges and the evening summary pause during this window. Reminders you set a time
                for still come through.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="time"
                  value={dnd.dndStart}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndStart: e.target.value })}
                  aria-label="Do not disturb start"
                  className="rounded-card bg-parchment-100 px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
                />
                <span className="text-sm text-ink-300">to</span>
                <input
                  type="time"
                  value={dnd.dndEnd}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndEnd: e.target.value })}
                  aria-label="Do not disturb end"
                  className="rounded-card bg-parchment-100 px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-card bg-parchment-50 px-4 py-3 shadow-card">
              <span className="min-w-0 pr-3">
                <span className="block text-sm text-ink-900">Habit reminders</span>
                <span className="block text-xs text-ink-300">A nudge at a habit's set time, on the days it's due.</span>
              </span>
              <Switch
                checked={dnd.habitReminders}
                onChange={(next) => profile && void updateNotifications(profile.id, { habitReminders: next })}
                label="Habit reminders"
              />
            </div>

            <div className="mt-2 flex items-center justify-between rounded-card bg-parchment-50 px-4 py-3 shadow-card">
              <span className="min-w-0 pr-3">
                <span className="block text-sm text-ink-900">Evening summary</span>
                <span className="block text-xs text-ink-300">One gentle round-up of anything still unlogged that day.</span>
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

      <section className="mt-9">
        <p className={eyebrow}>Guide</p>
        <button
          type="button"
          onClick={() => navigate('/guide?pane=new')}
          className="mt-3 flex w-full items-center justify-between rounded-card bg-parchment-50 px-4 py-3.5 text-left shadow-card"
        >
          <span className="min-w-0 pr-3">
            <span className="block text-sm text-ink-900">How Harmony works</span>
            <span className="block text-xs text-ink-300">What's new, and how to use everything.</span>
          </span>
          <span className="shrink-0 text-ink-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>About</p>
        <p className="mt-2 text-sm text-ink-500">Harmony, version {APP_VERSION}.</p>
        <p className="mt-1 text-xs text-ink-300">Made with love by Noor's App Dreamland Ltd.</p>
      </section>

      <AreaSheet
        open={sheetOpen}
        area={editingArea}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveArea}
      />

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <p className="text-sm text-ink-700">
          This deletes everything you've added: your areas, habits, logs, and notes, on this device
          and in your account. It can't be undone.
        </p>
        <div className="mt-5 space-y-2">
          <PrimaryButton onClick={handleDeleteAccount} disabled={deleting}>
            Delete everything
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="w-full rounded-full py-2.5 text-sm text-ink-500"
          >
            Keep my account
          </button>
        </div>
      </Modal>
    </div>
  );
}

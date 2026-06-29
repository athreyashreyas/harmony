import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area } from '@harmony/shared';
import { DEFAULT_DND } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import Modal from '../../components/Modal/Modal';
import ReleaseRow from '../../components/ReleaseRow/ReleaseRow';
import Switch from '../../components/Switch/Switch';
import { APP_VERSION, CHANGELOG } from '../../lib/changelog';
import { reorderAreas, saveArea } from '../../lib/db/queries';
import { enablePush, pushReadiness, type PushReadiness } from '../../lib/push/subscribe';
import { supabase } from '../../lib/supabase/client';
import { deleteAllUserData } from '../../lib/supabase/sync';
import { useUserData } from '../../lib/useUserData';
import { useAreas } from '../../store/useAreas';
import { useSettings } from '../../store/useSettings';
import { useUser } from '../../store/useUser';
import AreaSheet, { type AreaFields } from '../areas/AreaSheet';
import { PrimaryButton } from '../onboarding/ui';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';

export default function SettingsScreen() {
  const { profile, areas, habits, logs, reloadAreas } = useUserData();
  const setSignedOut = useUser((s) => s.setSignedOut);
  const notifications = useSettings((s) => s.notifications);
  const loadNotifications = useSettings((s) => s.load);
  const updateNotifications = useSettings((s) => s.update);

  const [email, setEmail] = useState<string | null>(null);
  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushState, setPushState] = useState<PushReadiness | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPushState(pushReadiness());
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setOrderedAreas(areas);
  }, [areas]);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

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
    await supabase?.auth.signOut();
    setSignedOut();
  }

  async function handleReorder(next: Area[]) {
    setOrderedAreas(next);
    const persisted = await reorderAreas(next);
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
    await deleteAllUserData(profile.id);
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
            className="mt-3 rounded-full bg-iris-500 px-4 py-2 text-sm font-medium text-parchment-50 disabled:opacity-40"
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
        {email && <p className="mt-2 text-sm text-ink-700">{email}</p>}
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
              <p className="text-sm text-ink-900">Quiet hours</p>
              <p className="mt-0.5 text-xs text-ink-300">No reminders arrive during this window.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="time"
                  value={dnd.dndStart}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndStart: e.target.value })}
                  aria-label="Quiet hours start"
                  className="rounded-card bg-parchment-100 px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
                />
                <span className="text-sm text-ink-300">to</span>
                <input
                  type="time"
                  value={dnd.dndEnd}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndEnd: e.target.value })}
                  aria-label="Quiet hours end"
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
                <span className="block text-xs text-ink-300">One quiet round-up of anything still unlogged that day.</span>
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
        <p className={eyebrow}>What's new</p>
        <div className="mt-3 space-y-2">
          {CHANGELOG.map((release, i) => (
            <ReleaseRow key={release.version} release={release} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>About</p>
        <p className="mt-2 text-sm text-ink-500">Harmony, version {APP_VERSION}.</p>
        <p className="mt-1 text-xs text-ink-300">Terms and privacy are not published yet.</p>
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

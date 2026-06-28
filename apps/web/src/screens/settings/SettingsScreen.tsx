import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area } from '@harmony/shared';
import { DEFAULT_DND } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import Modal from '../../components/Modal/Modal';
import Switch from '../../components/Switch/Switch';
import { reorderAreas, saveArea } from '../../lib/db/queries';
import { enablePush, pushReadiness, type PushReadiness } from '../../lib/push/subscribe';
import { supabase } from '../../lib/supabase/client';
import { deleteAllUserData } from '../../lib/supabase/sync';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useSettings } from '../../store/useSettings';
import { useUser } from '../../store/useUser';
import AreaSheet, { type AreaFields } from '../areas/AreaSheet';
import { PrimaryButton } from '../onboarding/ui';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';

const CHANGELOG = [
  {
    title: 'Insights and a quiet log',
    body: 'A weekly recap written from your own days, area balance, and a monthly record of what you tended to.',
  },
  {
    title: 'Gentle reminders',
    body: "Harmony now notices when an area's gone quiet and brings your own words back to you, plus a closer look at patterns in each habit.",
  },
  {
    title: 'A closer look at each habit',
    body: 'Tap any habit for its own page: a soft heatmap, your notes, and what it tends to pair with.',
  },
  {
    title: 'Tend and tidy',
    body: 'Add, edit, reorder, and archive your areas and habits any time.',
  },
  {
    title: 'The Bloom',
    body: "Home now shows a living bloom of how you're tending to yourself, and today's habits, one tap to log.",
  },
  {
    title: 'Welcome to Harmony',
    body: 'Onboarding, in your own words: the areas of life that matter, and one small habit for each.',
  },
];

export default function SettingsScreen() {
  const profile = useUser((s) => s.profile);
  const setSignedOut = useUser((s) => s.setSignedOut);
  const areas = useAreas((s) => s.areas);
  const loadAreas = useAreas((s) => s.load);
  const habits = useHabits((s) => s.habits);
  const loadHabits = useHabits((s) => s.load);
  const logs = useLogs((s) => s.logs);
  const loadLogs = useLogs((s) => s.load);
  const notifications = useSettings((s) => s.notifications);
  const loadNotifications = useSettings((s) => s.load);
  const updateNotifications = useSettings((s) => s.update);

  const [email, setEmail] = useState<string | null>(null);
  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedChangelog, setExpandedChangelog] = useState(0);
  const [pushState, setPushState] = useState<PushReadiness | null>(null);

  useEffect(() => {
    setPushState(pushReadiness());
  }, []);

  useEffect(() => {
    if (!profile) return;
    void loadAreas(profile.id);
    void loadHabits(profile.id);
    void loadLogs(profile.id);
    void loadNotifications();
  }, [profile, loadAreas, loadHabits, loadLogs, loadNotifications]);

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
    if (profile) await loadAreas(profile.id);
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
    if (!profile) return;
    const result = await enablePush(profile.id);
    setPushState(result);
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
            className="mt-3 rounded-full bg-iris-500 px-4 py-2 text-sm font-medium text-parchment-50"
          >
            Turn on reminders on this device
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
                  className="rounded-card bg-parchment-100 px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
                />
                <span className="text-sm text-ink-300">to</span>
                <input
                  type="time"
                  value={dnd.dndEnd}
                  onChange={(e) => profile && void updateNotifications(profile.id, { dndEnd: e.target.value })}
                  className="rounded-card bg-parchment-100 px-3 py-2 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
                />
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mt-9">
        <p className={eyebrow}>What's new</p>
        <div className="mt-3 space-y-2">
          {CHANGELOG.map((entry, i) => {
            const expanded = expandedChangelog === i;
            return (
              <div key={entry.title} className="rounded-card bg-parchment-50 shadow-card">
                <button
                  type="button"
                  onClick={() => setExpandedChangelog(expanded ? -1 : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-ink-900">{entry.title}</span>
                  <span className="text-ink-300">{expanded ? '–' : '+'}</span>
                </button>
                {expanded && <p className="px-4 pb-3 text-sm text-ink-500">{entry.body}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-9">
        <p className={eyebrow}>About</p>
        <p className="mt-2 text-sm text-ink-500">Harmony, version 0.1.0.</p>
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

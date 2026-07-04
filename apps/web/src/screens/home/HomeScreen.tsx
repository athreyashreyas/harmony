import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Area, Habit, Ritual, TimeOfDay } from '@harmony/shared';
import { useOpenHabit } from '../../app/openHabit';
import TabScreen from '../../app/TabScreen';
import AreaChip from '../../components/AreaChip/AreaChip';
import { computeAreaActivity } from '../../components/Bloom/activity';
import Bloom from '../../components/Bloom/Bloom';
import ComposeHabitSheet, { type HabitDraft } from '../../components/ComposeHabitSheet/ComposeHabitSheet';
import DriftBanner from '../../components/DriftBanner/DriftBanner';
import FAB from '../../components/FAB/FAB';
import HabitCard from '../../components/HabitCard/HabitCard';
import NoteSheet from '../../components/NoteSheet/NoteSheet';
import PushPrompt from '../../components/PushPrompt/PushPrompt';
import Skeleton from '../../components/Skeleton/Skeleton';
import RitualPlayer from '../../components/RitualPlayer/RitualPlayer';
import RitualSheet from '../../components/RitualSheet/RitualSheet';
import SortMenu, { type SortOption } from '../../components/SortMenu/SortMenu';
import TruncatedText from '../../components/TruncatedText/TruncatedText';
import { ritualHabits } from '../../lib/rituals';
import { archiveArea, saveArea, saveHabit } from '../../lib/db/queries';
import { createHabit } from '../../lib/domain';
import AreaSheet, { type AreaFields, type HabitWeight } from '../areas/AreaSheet';
import { detectDrift } from '../../lib/drift/detect';
import { compose } from '../../lib/templates/composer';
import { isDriftTemplate } from '../../lib/templates/library';
import { nudgeHistoryForUser, recentTemplateIdsFor, recordNudge } from '../../lib/templates/history';
import { isHabitDueToday } from '../../lib/time/cadence';
import { daysBetween, formatLongDate, greetingWord, todayISO } from '../../lib/time/dates';
import { listContainer, listItem } from '../../lib/motion';
import { useUserData } from '../../lib/useUserData';
import { useLogs } from '../../store/useLogs';
import { useSettings } from '../../store/useSettings';

interface Banner {
  text: string;
  color: string;
  areaId: string;
}

// A stable empty array so the rituals selector doesn't return a new reference
// each render (which would re-render Home needlessly).
const EMPTY_RITUALS: Ritual[] = [];

// How the Home habit list can be ordered. Default is by time of day (morning
// through evening, with unscheduled "anytime" habits after), and within each
// bucket by priority (area order, then habit order).
type SortKey = 'time' | 'priority' | 'todo';
const SORT_OPTIONS: SortOption<SortKey>[] = [
  { value: 'time', label: 'Time of day', description: 'Morning to evening, anytime last' },
  { value: 'priority', label: 'Priority', description: 'Your most important areas first' },
  { value: 'todo', label: 'Still to do', description: 'Unfinished habits rise to the top' },
];
// Anytime (unscheduled) habits sort after the timed ones, so the day reads in
// order and the loose ones settle at the end.
const TIME_RANK: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };
const SORT_STORAGE_KEY = 'harmony.homeSort';

function isSortKey(v: unknown): v is SortKey {
  return typeof v === 'string' && SORT_OPTIONS.some((o) => o.value === v);
}

function loadSort(): SortKey {
  try {
    const v = localStorage.getItem(SORT_STORAGE_KEY);
    if (isSortKey(v)) return v;
  } catch {
    // ignore
  }
  return 'time';
}

function bloomCaption(activities: number[]): string {
  if (activities.length === 0) return 'Tend to yourself today.';
  const avg = activities.reduce((sum, a) => sum + a, 0) / activities.length;
  const anyQuiet = activities.some((a) => a < 0.25);
  if (avg >= 0.6 && !anyQuiet) return 'In a good rhythm today.';
  if (anyQuiet) return 'A few areas waiting for you.';
  return 'Tend to yourself today.';
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const openHabit = useOpenHabit();
  const { profile, areas, habits, logs, loaded, reloadHabits, reloadAreas } = useUserData();
  const toggle = useLogs((s) => s.toggle);
  const setNote = useLogs((s) => s.setNote);

  const syncedSort = useSettings((s) => s.notifications?.homeSort);
  const updateSettings = useSettings((s) => s.update);
  const rituals = useSettings((s) => s.notifications?.rituals) ?? EMPTY_RITUALS;
  const [ritualEditing, setRitualEditing] = useState<Ritual | null | undefined>(undefined);
  const [playingRitual, setPlayingRitual] = useState<Ritual | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  // Seed from localStorage for an instant, offline-safe choice; the synced
  // setting then reconciles it so the order follows the person across devices.
  const [sortBy, setSortBy] = useState<SortKey>(loadSort);

  // Persist every settled choice locally (fast seed on next open), whether it
  // came from a tap here or arrived from another device.
  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {
      // ignore
    }
  }, [sortBy]);

  // Adopt the order chosen on another device when it pulls in (or echoes over
  // realtime), the same way the theme follows the account.
  useEffect(() => {
    if (isSortKey(syncedSort) && syncedSort !== sortBy) setSortBy(syncedSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedSort]);

  // Switch instantly on this device, but debounce the cloud save so a quick
  // change of mind writes the synced row once, not on every tap.
  const sortTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function chooseSort(next: SortKey) {
    setSortBy(next);
    if (!profile) return;
    const uid = profile.id;
    if (sortTimer.current) clearTimeout(sortTimer.current);
    sortTimer.current = setTimeout(() => {
      void updateSettings(uid, { homeSort: next });
    }, 500);
  }
  const [banner, setBanner] = useState<Banner | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [view, setView] = useState<'today' | 'all'>('today');
  const composeLock = useRef<string | null>(null);

  // Drift banner (sections 9.3, 16). Runs once everything has loaded and again
  // whenever logs change (so logging the quiet area clears the banner). The
  // composed text is recorded once per area per day and reused on later opens,
  // so the wording stays put through the day and varies across days.
  useEffect(() => {
    if (!loaded || !profile) return;

    let cancelled = false;
    void (async () => {
      const history = await nudgeHistoryForUser(profile.id, 14);
      const now = new Date();
      const [top] = detectDrift({ areas, habits, logs, nudgeHistory: history, now });
      if (!top) {
        if (!cancelled) setBanner(null);
        return;
      }

      const today = todayISO(now);
      const already = history.find(
        (n) =>
          n.areaId === top.area.id &&
          n.channel === 'in-app' &&
          isDriftTemplate(n.templateId) &&
          todayISO(new Date(n.sentAt)) === today,
      );
      if (already) {
        if (!cancelled) setBanner({ text: already.composedText, color: top.area.color, areaId: top.area.id });
        return;
      }

      const lockKey = `${top.area.id}:${today}`;
      if (composeLock.current === lockKey) return;
      composeLock.current = lockKey;

      const composed = compose({
        type: 'drift',
        area: top.area,
        context: {
          now,
          profile,
          daysSinceLastLog: top.daysSinceLast,
          recentTemplateIds: recentTemplateIdsFor(history, top.area.id, 'drift'),
        },
      });
      if (!composed) {
        if (!cancelled) setBanner(null);
        return;
      }

      await recordNudge({
        userId: profile.id,
        templateId: composed.templateId,
        areaId: top.area.id,
        habitId: null,
        composedText: composed.text,
        channel: 'in-app',
      });
      if (!cancelled) setBanner({ text: composed.text, color: top.area.color, areaId: top.area.id });
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, loaded, areas, habits, logs]);

  const today = todayISO();
  const todaysHabits = useMemo(
    () => habits.filter((h) => isHabitDueToday(h)),
    [habits],
  );
  // Tapping an area chip (or a Bloom petal) filters today's list to that area;
  // self-heals if the selected area is gone.
  const activeFilter =
    selectedAreaId && areas.some((a) => a.id === selectedAreaId) ? selectedAreaId : null;
  const shownHabits = useMemo(() => {
    // Tugs live in their own section; the Today/All list is tend habits only.
    const base = view === 'today' ? todaysHabits : habits.filter((h) => h.polarity !== 'ease');
    return activeFilter ? base.filter((h) => h.areaId === activeFilter) : base;
  }, [view, todaysHabits, habits, activeFilter]);

  // Tugs: ease habits, optionally narrowed to the selected area. They stay
  // visible regardless of how long it's been; "days since" only ever
  // encourages, it never hides them.
  const tugs = useMemo(
    () => habits.filter((h) => h.polarity === 'ease' && (!activeFilter || h.areaId === activeFilter)),
    [habits, activeFilter],
  );
  const doneIds = useMemo(
    () => new Set(logs.filter((l) => l.date === today).map((l) => l.habitId)),
    [logs, today],
  );
  const doneCount = shownHabits.filter((h) => doneIds.has(h.id)).length;

  function toggleAreaFilter(id: string) {
    setSelectedAreaId((prev) => (prev === id ? null : id));
  }

  const activities = useMemo(
    () => areas.map((area) => computeAreaActivity(area, habits, logs)),
    [areas, habits, logs],
  );

  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  // The list in the chosen order. Priority = area order, then habit order.
  const sortedHabits = useMemo(() => {
    const byPriority = (a: Habit, b: Habit) => {
      const ao = (areaById.get(a.areaId)?.order ?? 1e9) - (areaById.get(b.areaId)?.order ?? 1e9);
      return ao !== 0 ? ao : a.order - b.order;
    };
    const byTime = (a: Habit, b: Habit) => {
      const t = TIME_RANK[a.timeOfDay] - TIME_RANK[b.timeOfDay];
      return t !== 0 ? t : byPriority(a, b);
    };
    const cmp =
      sortBy === 'priority'
        ? byPriority
        : sortBy === 'todo'
          ? (a: Habit, b: Habit) => {
              // Unfinished first, then the normal time-of-day order within each.
              const d = (doneIds.has(a.id) ? 1 : 0) - (doneIds.has(b.id) ? 1 : 0);
              return d !== 0 ? d : byTime(a, b);
            }
          : byTime;
    return [...shownHabits].sort(cmp);
  }, [shownHabits, sortBy, areaById, doneIds]);

  const noteForToday = noteHabit
    ? (logs.find((l) => l.habitId === noteHabit.id && l.date === today)?.note ?? '')
    : '';

  async function handleCreate(draft: HabitDraft) {
    if (!profile) return;
    await saveHabit(createHabit(draft, { userId: profile.id, order: habits.length }));
    await reloadHabits(profile.id);
    setComposeOpen(false);
  }

  // Long-pressing an area chip opens its edit pane, reusing the same sheet as
  // the Areas screen.
  async function handleSaveArea(fields: AreaFields) {
    if (!editingArea || !profile) return;
    await saveArea({ ...editingArea, ...fields });
    await reloadAreas(profile.id);
    setEditingArea(null);
  }
  async function handleArchiveArea() {
    if (!editingArea || !profile) return;
    await archiveArea(editingArea.id);
    await reloadAreas(profile.id);
    await reloadHabits(profile.id);
    setEditingArea(null);
  }
  async function handleSaveWeights(weights: HabitWeight[]) {
    if (!profile) return;
    const byId = new Map(weights.map((w) => [w.id, w.weight]));
    const updated = habits.filter((h) => byId.has(h.id)).map((h) => ({ ...h, weight: byId.get(h.id)! }));
    for (const h of updated) await saveHabit(h);
    await reloadHabits(profile.id);
  }

  const editingAreaHabits =
    editingArea != null
      ? habits
          .filter((h) => h.areaId === editingArea.id && h.archivedAt == null && h.polarity !== 'ease')
          .sort((a, b) => a.order - b.order)
      : [];

  // Rituals: tend habits are what a ritual can gather, and they live on the
  // synced settings row so a ritual follows across devices.
  const activeTendHabits = useMemo(
    () => habits.filter((h) => h.polarity !== 'ease' && h.archivedAt == null),
    [habits],
  );
  function persistRituals(next: Ritual[]) {
    if (profile) void updateSettings(profile.id, { rituals: next });
  }
  function handleSaveRitual(r: Ritual) {
    persistRituals(rituals.some((x) => x.id === r.id) ? rituals.map((x) => (x.id === r.id ? r : x)) : [...rituals, r]);
    setRitualEditing(undefined);
  }
  function handleDeleteRitual() {
    if (ritualEditing) persistRituals(rituals.filter((x) => x.id !== ritualEditing.id));
    setRitualEditing(undefined);
  }

  return (
    <TabScreen className="pt-6 pb-36 md:pb-16">
      {/* Reserve the top-right corner so a long name or date never slides under
          the sync dot that TabScreen anchors there. */}
      <div className="pr-12">
        <p className="text-sm text-ink-300">{formatLongDate()}</p>
        <h1 className="mt-0.5 font-serif text-2xl text-ink-900">
          {greetingWord()}
          {profile ? `, ${profile.firstName.trim()}.` : '.'}
        </h1>
      </div>

      {profile && <PushPrompt userId={profile.id} />}

      {banner && (
        <div className="mt-6">
          <DriftBanner text={banner.text} color={banner.color} onClick={() => navigate('/areas', { replace: true })} />
        </div>
      )}

      <div className="mt-8">
        {loaded ? (
          <>
            <Bloom
              areas={areas}
              habits={habits}
              logs={logs}
              activities={activities}
              selectedAreaId={activeFilter}
              onSelectArea={toggleAreaFilter}
            />
            <p className="mt-4 text-center text-sm text-ink-500">{bloomCaption(activities)}</p>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <Skeleton className="h-[220px] w-[220px] rounded-full" />
            <Skeleton className="mt-4 h-4 w-40" />
          </div>
        )}
      </div>

      {loaded && areas.length > 0 && (
        // A wrapping, centred cloud of area chips: every area shows on any
        // screen size, no sideways scrolling. Tap one to filter today's habits.
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {areas.map((area) => (
            <AreaChip
              key={area.id}
              area={area}
              selected={activeFilter === area.id}
              onClick={() => toggleAreaFilter(area.id)}
              onLongPress={() => setEditingArea(area)}
            />
          ))}
        </div>
      )}

      <div className="mt-9">
        <div className="flex w-full rounded-full bg-parchment-200 p-0.5">
          {(['today', 'all'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={[
                'flex-1 rounded-full py-1.5 text-sm font-medium capitalize transition-colors',
                view === v ? 'bg-parchment-50 text-ink-900 shadow-card' : 'text-ink-500',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>
        {loaded && shownHabits.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <SortMenu value={sortBy} options={SORT_OPTIONS} onChange={chooseSort} />
            <p className="text-xs text-ink-300">
              {doneCount} of {shownHabits.length} tended to
            </p>
          </div>
        )}

        <div className="mt-3">
          {!loaded ? (
            <div className="space-y-2.5">
              <Skeleton className="h-[58px] w-full" />
              <Skeleton className="h-[58px] w-full" />
            </div>
          ) : habits.length === 0 ? (
            <p className="text-sm text-ink-300">Your habits will appear here once you add one.</p>
          ) : shownHabits.length === 0 ? (
            <p className="text-sm text-ink-300">
              {activeFilter
                ? 'Nothing here. Tap the area again to see everything.'
                : view === 'today'
                  ? 'Nothing scheduled for today. Rest counts too.'
                  : 'No habits yet.'}
            </p>
          ) : (
            <motion.div
              variants={listContainer}
              initial="initial"
              animate="animate"
              className="space-y-2.5"
            >
              {sortedHabits.map((habit) => {
                const area = areaById.get(habit.areaId);
                if (!area) return null;
                return (
                  // `layout` animates a card gliding to its new place when the
                  // order changes (e.g. tapping one done under "Still to do"
                  // eases it down and lifts the rest up), instead of jumping.
                  <motion.div
                    key={habit.id}
                    layout
                    variants={listItem}
                    transition={{ layout: { type: 'spring', stiffness: 500, damping: 42 } }}
                  >
                    <HabitCard
                      habit={habit}
                      area={area}
                      done={doneIds.has(habit.id)}
                      onToggle={() => void toggle(habit)}
                      onOpen={() => openHabit(habit.id)}
                      onLongPress={() => setNoteHabit(habit)}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {loaded && (habits.length > 0 || rituals.length > 0) && (
        <div className="mt-9">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-300">Rituals</p>
            <button type="button" onClick={() => setRitualEditing(null)} className="flex items-center gap-1 text-xs font-medium text-iris-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              New
            </button>
          </div>
          {rituals.length === 0 ? (
            <p className="mt-1 text-xs text-ink-300">Gather a few habits into a flow you move through together, like a morning ritual.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {rituals.map((r) => {
                const steps = ritualHabits(r, habits);
                const doneCount = steps.filter((h) => doneIds.has(h.id)).length;
                const complete = steps.length > 0 && doneCount === steps.length;
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-card bg-parchment-50 px-3.5 py-3 shadow-card">
                    <button type="button" onClick={() => setRitualEditing(r)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm text-ink-900">{r.name}</span>
                      <span className="text-xs text-ink-300">
                        {steps.length} step{steps.length === 1 ? '' : 's'}
                        {steps.length > 0 && ` · ${complete ? 'all done today' : `${doneCount}/${steps.length} today`}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayingRitual(r)}
                      disabled={steps.length === 0}
                      className="shrink-0 rounded-full bg-iris-500 px-4 py-1.5 text-xs font-medium text-on-primary disabled:opacity-40"
                    >
                      {complete ? 'Review' : 'Begin'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loaded && tugs.length > 0 && (
        <div className="mt-9">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-300">Tugs</p>
          <p className="mt-1 text-xs text-ink-300">The pulls you're easing off. Tap one if it happened today.</p>
          <div className="mt-3 space-y-2.5">
            {tugs.map((habit) => {
              const loggedToday = doneIds.has(habit.id);
              const pastDates = logs.filter((l) => l.habitId === habit.id).map((l) => l.date);
              const last = pastDates.length ? pastDates.reduce((a, b) => (a > b ? a : b)) : null;
              const daysSince = last ? daysBetween(last, today) : null;
              const note = loggedToday
                ? 'Noted for today. Tomorrow is a clean slate.'
                : daysSince != null
                  ? daysSince === 0
                    ? 'Noted earlier today.'
                    : `${daysSince} day${daysSince === 1 ? '' : 's'} since the last one. Keep going.`
                  : 'Tap if it happened today.';
              return (
                // Same interaction as a tend habit: the circle toggles it noted
                // for today; the rest of the row opens the tug's own page (streak
                // + edit), reached the same way you'd open a habit.
                <div
                  key={habit.id}
                  className="flex w-full items-center gap-3 rounded-card border border-dashed border-[#5a636f]/45 bg-parchment-50 px-3 py-3"
                >
                  <button
                    type="button"
                    onClick={() => void toggle(habit)}
                    aria-pressed={loggedToday}
                    aria-label={loggedToday ? `Unmark ${habit.name}` : `Note ${habit.name} for today`}
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                    style={
                      loggedToday
                        ? { backgroundColor: '#5a636f' }
                        : { boxShadow: 'inset 0 0 0 1.5px #5a636f55' }
                    }
                  >
                    {loggedToday && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openHabit(habit.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <TruncatedText text={habit.name} className="text-sm text-ink-900" />
                      {/* The generated status line wraps to two lines rather than
                          cropping mid-sentence, so it always reads in full. */}
                      <span className="line-clamp-2 text-xs text-ink-500">{note}</span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-300">tug</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && areas.length > 0 && <FAB label="Add habit" onClick={() => setComposeOpen(true)} />}

      <ComposeHabitSheet
        open={composeOpen}
        areas={areas}
        isEdit={false}
        initial={null}
        onClose={() => setComposeOpen(false)}
        onSave={handleCreate}
      />

      <RitualSheet
        open={ritualEditing !== undefined}
        ritual={ritualEditing ?? null}
        habits={activeTendHabits}
        areas={areas}
        onClose={() => setRitualEditing(undefined)}
        onSave={handleSaveRitual}
        onDelete={handleDeleteRitual}
      />

      <RitualPlayer
        open={playingRitual != null}
        ritual={playingRitual}
        habits={habits}
        areas={areas}
        doneIds={doneIds}
        onToggle={(habit) => void toggle(habit)}
        onClose={() => setPlayingRitual(null)}
      />

      <NoteSheet
        open={noteHabit != null}
        habitName={noteHabit?.name ?? ''}
        initialNote={noteForToday}
        onClose={() => setNoteHabit(null)}
        onSave={(note) => {
          if (noteHabit) void setNote(noteHabit, note);
          setNoteHabit(null);
        }}
      />

      <AreaSheet
        open={editingArea != null}
        area={editingArea}
        usedColors={areas.filter((a) => a.id !== editingArea?.id).map((a) => a.color)}
        habits={editingAreaHabits}
        onClose={() => setEditingArea(null)}
        onSave={handleSaveArea}
        onSaveWeights={handleSaveWeights}
        onArchive={handleArchiveArea}
      />
    </TabScreen>
  );
}

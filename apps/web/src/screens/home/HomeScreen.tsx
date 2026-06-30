import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Habit } from '@harmony/shared';
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
import { saveHabit } from '../../lib/db/queries';
import { createHabit } from '../../lib/domain';
import { detectDrift } from '../../lib/drift/detect';
import { compose } from '../../lib/templates/composer';
import { isDriftTemplate } from '../../lib/templates/library';
import { nudgeHistoryForUser, recentTemplateIdsFor, recordNudge } from '../../lib/templates/history';
import { isHabitDueToday } from '../../lib/time/cadence';
import { daysBetween, formatLongDate, greetingWord, todayISO } from '../../lib/time/dates';
import { listContainer, listItem } from '../../lib/motion';
import { useUserData } from '../../lib/useUserData';
import { useLogs } from '../../store/useLogs';

interface Banner {
  text: string;
  color: string;
  areaId: string;
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
  const { profile, areas, habits, logs, loaded, reloadHabits } = useUserData();
  const toggle = useLogs((s) => s.toggle);
  const setNote = useLogs((s) => s.setNote);

  const [composeOpen, setComposeOpen] = useState(false);
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);
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

  const noteForToday = noteHabit
    ? (logs.find((l) => l.habitId === noteHabit.id && l.date === today)?.note ?? '')
    : '';

  async function handleCreate(draft: HabitDraft) {
    if (!profile) return;
    await saveHabit(createHabit(draft, { userId: profile.id, order: habits.length }));
    await reloadHabits(profile.id);
    setComposeOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-36 md:pb-16">
      <p className="text-sm text-ink-300">{formatLongDate()}</p>
      <h1 className="mt-0.5 font-serif text-2xl text-ink-900">
        {greetingWord()}
        {profile ? `, ${profile.firstName.trim()}.` : '.'}
      </h1>

      {profile && <PushPrompt userId={profile.id} />}

      {banner && (
        <div className="mt-6">
          <DriftBanner text={banner.text} color={banner.color} onClick={() => navigate('/areas')} />
        </div>
      )}

      <div className="mt-8">
        {loaded ? (
          <>
            <Bloom
              areas={areas}
              habits={habits}
              logs={logs}
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
          <p className="mt-2 text-right text-xs text-ink-300">
            {doneCount} of {shownHabits.length} tended to
          </p>
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
              {shownHabits.map((habit) => {
                const area = areaById.get(habit.areaId);
                if (!area) return null;
                return (
                  <motion.div key={habit.id} variants={listItem}>
                    <HabitCard
                      habit={habit}
                      area={area}
                      done={doneIds.has(habit.id)}
                      onToggle={() => void toggle(habit)}
                      onOpen={() => navigate(`/habit/${habit.id}`)}
                      onLongPress={() => setNoteHabit(habit)}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

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
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => void toggle(habit)}
                  aria-pressed={loggedToday}
                  className="flex w-full items-center gap-3 rounded-card border border-dashed border-[#5a636f]/45 bg-parchment-50 px-3 py-3 text-left"
                >
                  <span
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
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-900">{habit.name}</span>
                    <span className="block truncate text-xs text-ink-400">{note}</span>
                  </span>
                </button>
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
    </div>
  );
}

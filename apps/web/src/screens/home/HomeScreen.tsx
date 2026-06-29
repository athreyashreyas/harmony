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
import { detectDrift } from '../../lib/drift/detect';
import { compose } from '../../lib/templates/composer';
import { isDriftTemplate } from '../../lib/templates/library';
import { nudgeHistoryForUser, recentTemplateIdsFor, recordNudge } from '../../lib/templates/history';
import { isHabitDueToday } from '../../lib/time/cadence';
import { formatLongDate, greetingWord, todayISO } from '../../lib/time/dates';
import { listContainer, listItem } from '../../lib/motion';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useUser } from '../../store/useUser';

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
  const profile = useUser((s) => s.profile);
  const areas = useAreas((s) => s.areas);
  const loadAreas = useAreas((s) => s.load);
  const areasLoaded = useAreas((s) => s.loadedFor);
  const habits = useHabits((s) => s.habits);
  const loadHabits = useHabits((s) => s.load);
  const habitsLoaded = useHabits((s) => s.loadedFor);
  const logs = useLogs((s) => s.logs);
  const loadLogs = useLogs((s) => s.load);
  const logsLoaded = useLogs((s) => s.loadedFor);
  const toggle = useLogs((s) => s.toggle);
  const setNote = useLogs((s) => s.setNote);

  const [composeOpen, setComposeOpen] = useState(false);
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const composeLock = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    void loadAreas(profile.id);
    void loadHabits(profile.id);
    void loadLogs(profile.id);
  }, [profile, loadAreas, loadHabits, loadLogs]);

  // Drift banner (sections 9.3, 16). Runs once everything has loaded and again
  // whenever logs change (so logging the quiet area clears the banner). The
  // composed text is recorded once per area per day and reused on later opens,
  // so the wording stays put through the day and varies across days.
  useEffect(() => {
    const ready =
      profile && areasLoaded === profile.id && habitsLoaded === profile.id && logsLoaded === profile.id;
    if (!ready) return;

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
  }, [profile, areasLoaded, habitsLoaded, logsLoaded, areas, habits, logs]);

  const loaded = Boolean(
    profile && areasLoaded === profile.id && habitsLoaded === profile.id && logsLoaded === profile.id,
  );

  const today = todayISO();
  const todaysHabits = useMemo(
    () => habits.filter((h) => isHabitDueToday(h)),
    [habits],
  );
  const doneIds = useMemo(
    () => new Set(logs.filter((l) => l.date === today).map((l) => l.habitId)),
    [logs, today],
  );
  const doneCount = todaysHabits.filter((h) => doneIds.has(h.id)).length;

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
    const habit: Habit = {
      id: crypto.randomUUID(),
      userId: profile.id,
      reminderTime: null,
      startDate: today,
      endDate: null,
      order: habits.length,
      createdAt: Date.now(),
      archivedAt: null,
      ...draft,
    };
    await saveHabit(habit);
    await loadHabits(profile.id);
    setComposeOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-36 md:pb-16">
      <p className="text-sm text-ink-300">{formatLongDate()}</p>
      <h1 className="mt-0.5 font-serif text-2xl text-ink-900">
        {greetingWord()}
        {profile ? `, ${profile.firstName}.` : '.'}
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
              onSelectArea={() => navigate('/areas')}
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
        <div className="scroll-ios mt-7 flex gap-2 overflow-x-auto pb-1">
          {areas.map((area) => (
            <AreaChip key={area.id} area={area} onClick={() => navigate('/areas')} />
          ))}
        </div>
      )}

      <div className="mt-9">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-300">Today</p>
          {loaded && todaysHabits.length > 0 && (
            <p className="text-xs text-ink-300">
              {doneCount} of {todaysHabits.length} tended
            </p>
          )}
        </div>

        <div className="mt-3">
          {!loaded ? (
            <div className="space-y-2.5">
              <Skeleton className="h-[58px] w-full" />
              <Skeleton className="h-[58px] w-full" />
            </div>
          ) : habits.length === 0 ? (
            <p className="text-sm text-ink-300">Your habits will appear here once you add one.</p>
          ) : todaysHabits.length === 0 ? (
            <p className="text-sm text-ink-300">Nothing scheduled for today. Rest counts too.</p>
          ) : (
            <motion.div
              variants={listContainer}
              initial="initial"
              animate="animate"
              className="space-y-2.5"
            >
              {todaysHabits.map((habit) => {
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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Habit } from '@harmony/shared';
import AreaChip from '../../components/AreaChip/AreaChip';
import { computeAreaActivity } from '../../components/Bloom/activity';
import Bloom from '../../components/Bloom/Bloom';
import FAB from '../../components/FAB/FAB';
import HabitCard from '../../components/HabitCard/HabitCard';
import { archiveHabit, saveHabit } from '../../lib/db/queries';
import { isHabitDueToday } from '../../lib/time/cadence';
import { formatLongDate, greetingWord, todayISO } from '../../lib/time/dates';
import { listContainer, listItem } from '../../lib/motion';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useUser } from '../../store/useUser';
import ComposeHabitSheet, { type HabitDraft } from './ComposeHabitSheet';

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
  const habits = useHabits((s) => s.habits);
  const loadHabits = useHabits((s) => s.load);
  const logs = useLogs((s) => s.logs);
  const loadLogs = useLogs((s) => s.load);
  const toggle = useLogs((s) => s.toggle);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useEffect(() => {
    if (!profile) return;
    void loadAreas(profile.id);
    void loadHabits(profile.id);
    void loadLogs(profile.id);
  }, [profile, loadAreas, loadHabits, loadLogs]);

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

  function openCreate() {
    setEditingHabit(null);
    setSheetOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setSheetOpen(true);
  }

  async function handleSave(draft: HabitDraft) {
    if (!profile) return;
    const habit: Habit = editingHabit
      ? { ...editingHabit, ...draft }
      : {
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
    setSheetOpen(false);
  }

  async function handleArchive() {
    if (!editingHabit || !profile) return;
    await archiveHabit(editingHabit.id);
    await loadHabits(profile.id);
    setSheetOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-28 md:pb-12">
      <p className="text-sm text-ink-300">{formatLongDate()}</p>
      <h1 className="mt-0.5 font-serif text-2xl text-ink-900">
        {greetingWord()}
        {profile ? `, ${profile.firstName}.` : '.'}
      </h1>

      <div className="mt-8">
        <Bloom areas={areas} habits={habits} logs={logs} onSelectArea={() => navigate('/areas')} />
        <p className="mt-4 text-center text-sm text-ink-500">{bloomCaption(activities)}</p>
      </div>

      {areas.length > 0 && (
        <div className="scroll-ios mt-7 flex gap-2 overflow-x-auto pb-1">
          {areas.map((area) => (
            <AreaChip key={area.id} area={area} onClick={() => navigate('/areas')} />
          ))}
        </div>
      )}

      <div className="mt-9">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-300">Today</p>
          {todaysHabits.length > 0 && (
            <p className="text-xs text-ink-300">
              {doneCount} of {todaysHabits.length} tended
            </p>
          )}
        </div>

        <div className="mt-3">
          {habits.length === 0 ? (
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
                      onOpen={() => openEdit(habit)}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {areas.length > 0 && <FAB label="Add habit" onClick={openCreate} />}

      <ComposeHabitSheet
        open={sheetOpen}
        areas={areas}
        isEdit={editingHabit != null}
        initial={editingHabit}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onArchive={editingHabit ? handleArchive : undefined}
      />
    </div>
  );
}

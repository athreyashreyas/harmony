import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Log } from '@harmony/shared';
import AreaChip from '../../components/AreaChip/AreaChip';
import ComposeHabitSheet, { type HabitDraft } from '../../components/ComposeHabitSheet/ComposeHabitSheet';
import SoftHeatmap from '../../components/SoftHeatmap/SoftHeatmap';
import WatercolorWash from '../../components/WatercolorWash/WatercolorWash';
import { archiveHabit, logsForHabit, saveHabit } from '../../lib/db/queries';
import { detectHabitPatterns } from '../../lib/drift/patterns';
import { blendOver, hexToRgba } from '../../lib/color';
import { useThemeColor } from '../../lib/useThemeColor';
import { formatDateMedium, isoDaysAgo, lastTendedPhrase } from '../../lib/time/dates';
import { BackButton } from '../onboarding/ui';
import { scrollShellToTop } from '../../app/scrollMemory';
import { useOpenHabit } from '../../app/openHabit';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useUser } from '../../store/useUser';

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  );
}

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';

export default function HabitDetailScreen() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const openHabit = useOpenHabit();
  const profile = useUser((s) => s.profile);

  const areas = useAreas((s) => s.areas);
  const loadAreas = useAreas((s) => s.load);
  const habits = useHabits((s) => s.habits);
  const loadHabits = useHabits((s) => s.load);
  const windowLogs = useLogs((s) => s.logs);
  const loadLogs = useLogs((s) => s.load);

  const [habitLogs, setHabitLogs] = useState<Log[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (areas.length === 0) void loadAreas(profile.id);
    if (habits.length === 0) void loadHabits(profile.id);
    if (windowLogs.length === 0) void loadLogs(profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!habitId) return;
    void logsForHabit(habitId).then(setHabitLogs);
  }, [habitId]);

  const habit = habits.find((h) => h.id === habitId) ?? null;
  const area = useMemo(
    () => (habit ? areas.find((a) => a.id === habit.areaId) ?? null : null),
    [habit, areas],
  );

  const lastLog = habitLogs.length > 0 ? habitLogs[habitLogs.length - 1] : null;

  const notes = useMemo(
    () => habitLogs.filter((l) => l.note).slice().reverse(),
    [habitLogs],
  );

  const neighbours = useMemo(() => {
    if (!habit) return [];
    const weekAgo = isoDaysAgo(6);
    return habits
      .filter((h) => h.areaId === habit.areaId && h.id !== habit.id && h.archivedAt == null)
      .map((h) => ({
        habit: h,
        recent: windowLogs.some((l) => l.habitId === h.id && l.date >= weekAgo),
      }));
  }, [habit, habits, windowLogs]);
  const tendNeighbours = neighbours.filter((n) => n.habit.polarity !== 'ease');
  const tugNeighbours = neighbours.filter((n) => n.habit.polarity === 'ease');

  // Pattern observations (section 11.3), computed from the recent all-habits
  // window so adjacency (pairing with another habit) can be detected. Returns
  // empty until something clears the confidence threshold, keeping the section
  // hidden rather than filling space.
  const patterns = useMemo(
    () => (habit ? detectHabitPatterns(habit, windowLogs, habits, new Date()) : []),
    [habit, windowLogs, habits],
  );

  // Tint the status bar to match the top of the wash so it blends seamlessly
  // into this screen instead of leaving a strip of plain paper above it.
  const isTug = habit?.polarity === 'ease';
  const accent = isTug ? '#5a636f' : (habit?.color || area?.color) ?? null;
  useThemeColor(accent ? blendOver(accent, 0.18, '#FBF1E4') : null);

  if (!habit || !area) {
    return (
      <main className="flex h-full flex-col items-center justify-center px-5 pt-safe pb-safe text-center">
        <p className="text-sm text-ink-300">This habit is no longer here.</p>
        <button type="button" onClick={() => navigate('/', { replace: true })} className="mt-4 text-sm text-iris-500 hover:underline">
          Back to home
        </button>
      </main>
    );
  }

  async function handleSave(draft: HabitDraft) {
    if (!habit) return;
    await saveHabit({ ...habit, ...draft });
    if (profile) await loadHabits(profile.id);
    setSheetOpen(false);
  }

  async function handleArchive() {
    if (!habit) return;
    await archiveHabit(habit.id);
    if (profile) await loadHabits(profile.id);
    navigate('/', { replace: true });
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-parchment-100">
      <WatercolorWash color={accent ?? area.color} from="top" height={360} />

      <div className="scroll-ios relative z-10 min-h-0 flex-1 overflow-y-auto pb-safe">
        <header className="flex items-center justify-between px-4 pt-safe">
          <div className="flex h-14 items-center">
            <BackButton
              onClick={() => {
                // A deliberate "take me home": send the tab beneath the overlay to
                // the top, then pop. (An edge-swipe back just pops, leaving the
                // tab's scroll exactly where it was.)
                scrollShellToTop();
                navigate(-1);
              }}
            />
          </div>
          <div className="flex h-14 items-center">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Edit habit"
              className="rounded-full p-2 text-ink-500 hover:text-ink-700"
            >
              <EditIcon />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-5">
          <div className="flex">
            <AreaChip area={area} onClick={() => navigate('/areas', { replace: true })} />
          </div>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-ink-900">{habit.name}</h1>

          {area.whySentence && (
            <div className="my-10 text-center">
              <p className="font-serif text-xl italic leading-relaxed text-ink-700">
                &ldquo;{area.whySentence}&rdquo;
              </p>
              <p className="mt-3 text-xs text-ink-300">your words</p>
            </div>
          )}

          <section className="mt-8">
            <SoftHeatmap
              habit={habit}
              logs={habitLogs}
              color={accent ?? area.color}
              variant={isTug ? 'tug' : 'tend'}
            />
            <p className="mt-3 text-xs text-ink-500">
              {lastLog
                ? isTug
                  ? `Last noted ${lastTendedPhrase(lastLog.date, lastLog.loggedAt)}.`
                  : `Last tended ${lastTendedPhrase(lastLog.date, lastLog.loggedAt)}.`
                : isTug
                  ? 'Not tugged yet. Long may it last.'
                  : 'Not tended yet.'}
            </p>
          </section>

          {!isTug && patterns.length > 0 && (
            <section className="mt-9 space-y-1.5">
              {patterns.map((p) => (
                <p key={p} className="text-sm text-ink-700">
                  {p}
                </p>
              ))}
            </section>
          )}

          {notes.length > 0 && (
            <section className="mt-9">
              <p className={eyebrow}>Notes</p>
              <div className="mt-3 space-y-2">
                {notes.map((log) => (
                  <div key={log.id} className="rounded-card bg-parchment-50 p-3 shadow-card">
                    <p className="text-xs text-ink-300">{formatDateMedium(log.date)}</p>
                    <p className="mt-1 text-sm text-ink-700">{log.note}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tendNeighbours.length > 0 && (
            <section className="mt-9">
              <p className={eyebrow}>Also in {area.name}</p>
              <div className="no-scrollbar scroll-ios mt-3 flex gap-2 overflow-x-auto pb-1">
                {tendNeighbours.map(({ habit: n, recent }) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openHabit(n.id, { replace: true })}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-parchment-50 px-3.5 py-1.5 text-sm text-ink-700 shadow-card"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: recent ? area.color : 'var(--parchment-300)' }}
                    />
                    {n.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {tugNeighbours.length > 0 && (
            <section className="mt-9">
              <p className={eyebrow}>Tugs in {area.name}</p>
              <div className="no-scrollbar scroll-ios mt-3 flex gap-2 overflow-x-auto pb-1">
                {tugNeighbours.map(({ habit: n, recent }) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openHabit(n.id, { replace: true })}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-dashed border-[#5a636f]/45 px-3.5 py-1.5 text-sm text-ink-700"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: recent ? '#5a636f' : 'var(--parchment-300)' }}
                    />
                    {n.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 pb-6">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="w-full rounded-full py-3 text-sm font-medium"
              style={{ backgroundColor: hexToRgba(accent ?? area.color, 0.12), color: accent ?? area.color }}
            >
              {isTug ? 'Edit tug' : 'Edit habit'}
            </button>
          </div>
        </main>
      </div>

      <ComposeHabitSheet
        open={sheetOpen}
        areas={areas}
        isEdit
        initial={{
          areaId: habit.areaId,
          name: habit.name,
          cadence: habit.cadence,
          timeOfDay: habit.timeOfDay,
          color: habit.color,
          reminderTime: habit.reminderTime,
          startDate: habit.startDate,
          endDate: habit.endDate,
          polarity: habit.polarity,
          tugWeight: habit.tugWeight,
        }}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onArchive={handleArchive}
      />
    </div>
  );
}

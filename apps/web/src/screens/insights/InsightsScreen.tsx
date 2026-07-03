import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Log } from '@harmony/shared';
import { AnimatePresence, motion } from 'framer-motion';
import ComposeHabitSheet, { type HabitDraft } from '../../components/ComposeHabitSheet/ComposeHabitSheet';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import Skeleton from '../../components/Skeleton/Skeleton';
import Bars from '../../components/charts/Bars';
import CalendarHeatmap from '../../components/charts/CalendarHeatmap';
import DivergingBars from '../../components/charts/DivergingBars';
import HBars from '../../components/charts/HBars';
import RadarChart from '../../components/charts/RadarChart';
import Sparkline from '../../components/charts/Sparkline';
import TrendChart from '../../components/charts/TrendChart';
import { useOpenHabit } from '../../app/openHabit';
import { hexToRgba } from '../../lib/color';
import { allLogsForUser, saveHabit } from '../../lib/db/queries';
import { createHabit } from '../../lib/domain';
import {
  computeInsights,
  RANGE_OPTIONS,
  SEGMENT_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_NAMES,
  type InsightsRange,
} from '../../lib/insights/analytics';
import { gentleObservations } from '../../lib/insights/observations';
import { composeReflection } from '../../lib/insights/reflection';
import { whatToDoNext, type Suggestion } from '../../lib/insights/suggestions';
import { todayISO } from '../../lib/time/dates';
import { useUserData } from '../../lib/useUserData';
import Garden from './Garden';

type ViewKey = 'insights' | 'garden';
const VIEW_OPTIONS: { value: ViewKey; label: string }[] = [
  { value: 'insights', label: 'Insights' },
  { value: 'garden', label: 'Garden' },
];

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';
const card = 'rounded-card bg-parchment-50 p-4 shadow-card';

const RANGE_WORD: Record<InsightsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'so far',
};
const RANGE_NOUN: Record<InsightsRange, string> = { week: 'week', month: 'month', year: 'year', all: 'stretch' };

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <p className={eyebrow}>{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function InsightsScreen() {
  const goToHabit = useOpenHabit();
  const { profile, areas, habits, logs, loaded, reloadHabits } = useUserData();

  const [view, setView] = useState<ViewKey>('insights');
  const [range, setRange] = useState<InsightsRange>('week');
  const [focus, setFocus] = useState<string | null>(null);
  const [openHabit, setOpenHabit] = useState<string | null>(null);
  const [suggestSheetArea, setSuggestSheetArea] = useState<string | null>(null);

  // Insights and the garden read the full log history from Dexie (Year/All and
  // past-week blooms need all of it), not the 60-day UI window. It's a local
  // read, so no egress; reloaded whenever the recent-log store changes (a proxy
  // for "something was just logged"). Falls back to the window until it lands.
  const [allLogs, setAllLogs] = useState<Log[] | null>(null);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void allLogsForUser(profile.id).then((l) => {
      if (active) setAllLogs(l);
    });
    return () => {
      active = false;
    };
  }, [profile, logs]);
  const fullLogs = allLogs ?? logs;

  const activeAreas = useMemo(() => areas.filter((a) => a.archivedAt == null), [areas]);
  // Self-heal if the focused area disappears.
  const focusId = focus && activeAreas.some((a) => a.id === focus) ? focus : null;
  const focusArea = activeAreas.find((a) => a.id === focusId) ?? null;

  const insights = useMemo(
    () => computeInsights({ areas, habits, logs: fullLogs }, range, { focusAreaId: focusId }),
    [areas, habits, fullLogs, range, focusId],
  );

  const observations = useMemo(() => gentleObservations(areas, habits, fullLogs), [areas, habits, fullLogs]);
  const suggestions = useMemo(() => whatToDoNext(areas, habits, fullLogs), [areas, habits, fullLogs]);
  const reflection = useMemo(
    () => (profile ? composeReflection(insights, { firstName: profile.firstName, areaName: focusArea?.name ?? null }) : []),
    [insights, profile, focusArea],
  );

  const balanceAreas = insights.areas.filter((a) => a.expected > 0 || a.completed > 0 || a.tugCount > 0);
  const radarData = insights.areas
    .filter((a) => a.expected > 0)
    .map((a) => ({ label: a.area.name, value: a.ratio, color: a.area.color }));
  const heatColor = focusArea?.color ?? '#5b7a35';
  const anyTugs = insights.tugStats.some((t) => t.count > 0);

  const momentumCaption =
    range === 'all'
      ? null
      : insights.trendDelta > 0.08
        ? `A little more than the previous ${RANGE_NOUN[range]}.`
        : insights.trendDelta < -0.08
          ? `A gentler ${RANGE_NOUN[range]} than the last. Rest counts too.`
          : `Steady with the previous ${RANGE_NOUN[range]}.`;

  const rhythmCaption =
    insights.bestWeekday != null
      ? insights.bestSegment
        ? `Most often on ${WEEKDAY_NAMES[insights.bestWeekday]}s, usually in the ${SEGMENT_LABELS[insights.bestSegment].toLowerCase()}.`
        : `Most often on ${WEEKDAY_NAMES[insights.bestWeekday]}s.`
      : null;

  function handleSuggestion(s: Suggestion) {
    if (s.kind === 'add-habit') setSuggestSheetArea(s.areaId);
    else goToHabit(s.habitId);
  }

  async function handleCreateHabit(draft: HabitDraft) {
    if (!profile) return;
    await saveHabit(createHabit(draft, { userId: profile.id, order: habits.length }));
    await reloadHabits(profile.id);
    setSuggestSheetArea(null);
  }

  const summaryCards = [
    { value: insights.summary.tends, label: 'tended' },
    { value: insights.summary.daysShownUp, label: 'days shown up' },
    focusArea
      ? { value: insights.summary.activeHabits, label: 'habits active' }
      : { value: insights.summary.activeAreas, label: 'areas active' },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Insights</h1>

      <div className="mt-4">
        <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} ariaLabel="Insights view" />
      </div>

      {view === 'garden' && <Garden areas={areas} habits={habits} logs={fullLogs} />}

      {view === 'insights' && (
        <>
          <div className="mt-4">
            <SegmentedControl value={range} options={RANGE_OPTIONS} onChange={setRange} ariaLabel="Time range" />
          </div>

      {/* Focus: the whole page, scoped to one part of life. */}
      {activeAreas.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <FocusChip label="All of life" active={focusId == null} onClick={() => setFocus(null)} />
          {activeAreas.map((a) => (
            <FocusChip key={a.id} label={a.name} color={a.color} active={focusId === a.id} onClick={() => setFocus(a.id)} />
          ))}
        </div>
      )}

      {!loaded ? (
        <div className="mt-7 space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {summaryCards.map((s) => (
              <div key={s.label} className={`${card} text-center`}>
                <p className="font-serif text-2xl text-ink-900">{s.value}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-ink-300">{s.label}</p>
              </div>
            ))}
          </div>
          {insights.runs.current >= 2 && (
            <p className="mt-3 text-sm text-ink-500">
              You're on a <span className="font-medium text-ink-700">{insights.runs.current}-day</span> run of showing up. Beautiful.
            </p>
          )}

          {!insights.hasData ? (
            <p className="mt-6 text-sm text-ink-300">
              Nothing to show for {RANGE_WORD[range]} yet. Log a habit or two and your patterns will bloom here.
            </p>
          ) : (
            <>
              <Section title="Momentum" hint="How much of what you set out to do you came back to.">
                <div className={card}>
                  <TrendChart points={insights.trend} color={focusArea?.color ?? 'var(--iris-500)'} />
                  {momentumCaption && <p className="mt-2 text-xs text-ink-300">{momentumCaption}</p>}
                </div>
              </Section>

              <Section title="Every day" hint="Each day you showed up, warmer the more you did.">
                <div className={card}>
                  <CalendarHeatmap cells={insights.calendar} color={heatColor} />
                  <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-ink-300">
                    <span>less</span>
                    {[0.2, 0.45, 0.7, 1].map((a) => (
                      <span key={a} className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: hexToRgba(heatColor, a) }} />
                    ))}
                    <span>more</span>
                  </div>
                </div>
              </Section>

              <Section title="Your rhythm" hint={rhythmCaption ?? 'The days and times you show up most.'}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className={card}>
                    <p className="mb-2 text-xs font-medium text-ink-500">By day</p>
                    <Bars data={insights.weekday.map((v, i) => ({ label: WEEKDAY_LABELS[i], value: v }))} color="#3a7ca8" />
                  </div>
                  <div className={card}>
                    <p className="mb-3 text-xs font-medium text-ink-500">By time of day</p>
                    <HBars data={insights.segments.map((s) => ({ label: SEGMENT_LABELS[s.segment], value: s.count }))} />
                  </div>
                </div>
              </Section>

              {!focusArea && radarData.length >= 3 && (
                <Section title="Balance across life" hint="The shape of where your attention has gone.">
                  <div className={card}>
                    <RadarChart data={radarData} />
                  </div>
                </Section>
              )}

              {!focusArea && balanceAreas.length > 0 && (
                <Section title="Your areas" hint="Tap one to see it on its own.">
                  <div className={`${card} space-y-3.5`}>
                    {balanceAreas.map(({ area, ratio, completed, tugCount }) => (
                      <button key={area.id} type="button" onClick={() => setFocus(area.id)} className="block w-full text-left">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />
                            <span className="truncate text-sm text-ink-700">{area.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink-300">
                            {completed}
                            {tugCount > 0 && <span className="ml-1.5">· {tugCount} tug{tugCount === 1 ? '' : 's'}</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-parchment-200">
                          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: hexToRgba(area.color, 0.87) }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {insights.habits.length > 0 && (
                <Section title={focusArea ? `Habits in ${focusArea.name}` : 'Your habits'} hint="Tap one to see its rhythm.">
                  <div className="space-y-2.5">
                    {insights.habits.map((h) => {
                      const expanded = openHabit === h.habit.id;
                      return (
                        <div key={h.habit.id} className={card}>
                          <button
                            type="button"
                            onClick={() => setOpenHabit(expanded ? null : h.habit.id)}
                            aria-expanded={expanded}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: h.color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink-900">{h.habit.name}</span>
                              <span className="text-xs text-ink-300">
                                {h.completed === 0 ? `Quietly waiting ${RANGE_WORD[range]}` : `${h.completed}× ${RANGE_WORD[range]}`}
                                {h.bestWeekday != null && ` · best on ${WEEKDAY_NAMES[h.bestWeekday]}s`}
                              </span>
                            </span>
                            <div className="w-16 shrink-0">
                              <div className="h-1.5 overflow-hidden rounded-full bg-parchment-200">
                                <div className="h-full rounded-full" style={{ width: `${h.ratio * 100}%`, backgroundColor: hexToRgba(h.color, 0.85) }} />
                              </div>
                            </div>
                            <motion.svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className="shrink-0 text-ink-300" animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }} aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </motion.svg>
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3">
                                  <Sparkline values={h.spark} color={h.color} />
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-xs text-ink-300">
                                      {h.lastDate ? `Last on ${new Date(`${h.lastDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Not yet logged'}
                                    </span>
                                    <button type="button" onClick={() => goToHabit(h.habit.id)} className="text-xs font-medium" style={{ color: h.color }}>
                                      Open ›
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {anyTugs && (
                <Section title="Lift and drag" hint="Your habits rise above the line; the tugs you're easing off pull below it.">
                  <div className={card}>
                    <DivergingBars data={insights.tugs} />
                    <div className="mt-3 space-y-1.5">
                      {insights.tugStats.filter((t) => t.count > 0).map((t) => (
                        <div key={t.habit.id} className="flex items-center justify-between text-xs">
                          <span className="text-ink-700">{t.habit.name}</span>
                          <span className="text-ink-300">
                            {t.count}× {RANGE_WORD[range]}
                            {t.daysSince != null && ` · ${t.daysSince === 0 ? 'today' : `${t.daysSince}d ago`}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              )}
            </>
          )}

          {observations.length > 0 && !focusArea && (
            <Section title="Worth noticing">
              <div className="space-y-2">
                {observations.map((text, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-700">{text}</p>
                ))}
              </div>
            </Section>
          )}

          {suggestions.length > 0 && !focusArea && (
            <Section title="A gentle next step">
              <div className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => handleSuggestion(s)} className="w-full rounded-card bg-iris-50 px-4 py-3 text-left text-sm text-iris-500">
                    {s.text}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {reflection.length > 0 && (
            <section className="mt-9 rounded-card bg-parchment-50 p-5 shadow-card">
              <p className={eyebrow}>In reflection</p>
              <div className="mt-3 space-y-3">
                {reflection.map((para, i) => (
                  <p key={i} className={i === 0 ? 'font-serif text-lg leading-relaxed text-ink-900' : 'text-sm leading-relaxed text-ink-700'}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          )}
        </>
      )}
        </>
      )}

      <ComposeHabitSheet
        open={suggestSheetArea != null}
        areas={areas}
        isEdit={false}
        initial={
          suggestSheetArea
            ? {
                areaId: suggestSheetArea,
                name: '',
                cadence: { kind: 'times-per-week', times: 3 },
                timeOfDay: 'anytime',
                reminderTime: null,
                startDate: todayISO(),
                endDate: null,
              }
            : null
        }
        onClose={() => setSuggestSheetArea(null)}
        onSave={handleCreateHabit}
      />
    </div>
  );
}

function FocusChip({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={
        active
          ? color
            ? { backgroundColor: hexToRgba(color, 0.16), color }
            : { backgroundColor: 'var(--iris-50)', color: 'var(--iris-500)' }
          : { backgroundColor: 'var(--parchment-200)', color: 'var(--ink-500)' }
      }
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

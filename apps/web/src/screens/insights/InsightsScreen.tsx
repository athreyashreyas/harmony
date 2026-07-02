import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import ComposeHabitSheet, { type HabitDraft } from '../../components/ComposeHabitSheet/ComposeHabitSheet';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import Skeleton from '../../components/Skeleton/Skeleton';
import Bars from '../../components/charts/Bars';
import DivergingBars from '../../components/charts/DivergingBars';
import TrendChart from '../../components/charts/TrendChart';
import { hexToRgba } from '../../lib/color';
import { saveHabit } from '../../lib/db/queries';
import { createHabit } from '../../lib/domain';
import {
  computeInsights,
  RANGE_OPTIONS,
  SEGMENT_LABELS,
  WEEKDAY_LABELS,
  type InsightsRange,
} from '../../lib/insights/analytics';
import { gentleObservations } from '../../lib/insights/observations';
import { composeWeeklyRecap } from '../../lib/insights/recap';
import { whatToDoNext, type Suggestion } from '../../lib/insights/suggestions';
import { todayISO } from '../../lib/time/dates';
import { useUserData } from '../../lib/useUserData';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';
const card = 'rounded-card bg-parchment-50 p-4 shadow-card';

const RANGE_WORD: Record<InsightsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'all time',
};

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
  const navigate = useNavigate();
  const { profile, areas, habits, logs, loaded, reloadHabits } = useUserData();

  const [range, setRange] = useState<InsightsRange>('week');
  const [suggestSheetArea, setSuggestSheetArea] = useState<string | null>(null);

  const insights = useMemo(() => computeInsights({ areas, habits, logs }, range), [areas, habits, logs, range]);

  const recap = useMemo(
    () => (profile ? composeWeeklyRecap({ areas, habits, logs, profile }) : []),
    [areas, habits, logs, profile],
  );
  const observations = useMemo(() => gentleObservations(areas, habits, logs), [areas, habits, logs]);
  const suggestions = useMemo(() => whatToDoNext(areas, habits, logs), [areas, habits, logs]);

  // A couple of habits coming easily, and a couple quietly waiting, for the
  // gentle highlights. Only habits with something expected of them qualify.
  const scored = insights.habits.filter((h) => h.expected > 0);
  const easy = scored.filter((h) => h.ratio >= 0.6).slice(0, 2);
  const waiting = scored.filter((h) => h.ratio < 0.4).slice(-2).reverse();

  const activeAreas = insights.areas.filter((a) => a.expected > 0 || a.completed > 0 || a.tugCount > 0);
  const anyTugs = insights.tugTotals.length > 0;

  function handleSuggestion(s: Suggestion) {
    if (s.kind === 'add-habit') setSuggestSheetArea(s.areaId);
    else navigate(`/habit/${s.habitId}`);
  }

  async function handleCreateHabit(draft: HabitDraft) {
    if (!profile) return;
    await saveHabit(createHabit(draft, { userId: profile.id, order: habits.length }));
    await reloadHabits(profile.id);
    setSuggestSheetArea(null);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Insights</h1>

      <div className="mt-4">
        <SegmentedControl value={range} options={RANGE_OPTIONS} onChange={setRange} ariaLabel="Time range" />
      </div>

      {!loaded ? (
        <div className="mt-7 space-y-2.5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          {/* Summary stat cards. */}
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {[
              { value: insights.summary.tends, label: 'tends' },
              { value: insights.summary.daysShownUp, label: 'days shown up' },
              { value: insights.summary.activeAreas, label: 'areas tended' },
            ].map((s) => (
              <div key={s.label} className={`${card} text-center`}>
                <p className="font-serif text-2xl text-ink-900">{s.value}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-ink-300">{s.label}</p>
              </div>
            ))}
          </div>
          {insights.summary.topAreaName && (
            <p className="mt-3 text-sm text-ink-500">
              You leaned most into <span className="font-medium text-ink-700">{insights.summary.topAreaName}</span> {RANGE_WORD[range]}.
            </p>
          )}

          {!insights.hasData && (
            <p className="mt-6 text-sm text-ink-300">
              Nothing to show for {RANGE_WORD[range]} yet. Tend to a few things and your patterns will bloom here.
            </p>
          )}

          {insights.hasData && (
            <>
              <Section title="Tending momentum" hint="How much of what you set out to do you came back to.">
                <div className={card}>
                  <TrendChart points={insights.trend} />
                </div>
              </Section>

              <Section title="Your rhythm" hint="When tending tends to happen for you.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className={card}>
                    <p className="mb-2 text-xs font-medium text-ink-500">By day</p>
                    <Bars data={insights.weekday.map((v, i) => ({ label: WEEKDAY_LABELS[i], value: v }))} color="#3a7ca8" />
                  </div>
                  <div className={card}>
                    <p className="mb-2 text-xs font-medium text-ink-500">By time of day</p>
                    <Bars
                      data={insights.segments.map((s) => ({ label: SEGMENT_LABELS[s.segment].slice(0, 3), value: s.count }))}
                      color="#b7902a"
                    />
                  </div>
                </div>
              </Section>

              {activeAreas.length > 0 && (
                <Section title="Area balance" hint={`Completion across ${RANGE_WORD[range]}, each in its own colour.`}>
                  <div className={`${card} space-y-3.5`}>
                    {activeAreas.map(({ area, ratio, completed, tugCount }) => (
                      <div key={area.id}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />
                            <span className="truncate text-sm text-ink-700">{area.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink-300">
                            {completed}
                            {tugCount > 0 && <span className="ml-1.5 text-ink-300">· {tugCount} tug{tugCount === 1 ? '' : 's'}</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-parchment-200">
                          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: hexToRgba(area.color, 0.87) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {(easy.length > 0 || waiting.length > 0) && (
                <Section title="Habit highlights">
                  <div className="space-y-2.5">
                    {easy.map((h) => (
                      <button key={h.habit.id} type="button" onClick={() => navigate(`/habit/${h.habit.id}`)} className={`${card} flex w-full items-center gap-3 text-left`}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: h.color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink-900">{h.habit.name}</span>
                          <span className="text-xs text-ink-300">Coming easily · {h.completed} {RANGE_WORD[range]}</span>
                        </span>
                        <span className="text-xs font-medium" style={{ color: h.color }}>{Math.round(h.ratio * 100)}%</span>
                      </button>
                    ))}
                    {waiting.map((h) => (
                      <button key={h.habit.id} type="button" onClick={() => navigate(`/habit/${h.habit.id}`)} className={`${card} flex w-full items-center gap-3 text-left`}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hexToRgba(h.color, 0.5) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink-900">{h.habit.name}</span>
                          <span className="text-xs text-ink-300">Quietly waiting · a gentle return whenever you like</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {anyTugs && (
                <Section title="Lift and drag" hint="Tending rises above the line; the tugs you're easing off pull below it.">
                  <div className={card}>
                    <DivergingBars data={insights.tugs} />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {insights.tugTotals.map(({ area, count }) => (
                        <span key={area.id} className="text-xs text-ink-500">
                          {area.name}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </Section>
              )}
            </>
          )}

          {recap.length > 0 && (
            <Section title="This week">
              <div className="space-y-2.5">
                {recap.map((line, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-700">{line.text}</p>
                ))}
              </div>
            </Section>
          )}

          {observations.length > 0 && (
            <Section title="Worth noticing">
              <div className="space-y-2">
                {observations.map((text, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-700">{text}</p>
                ))}
              </div>
            </Section>
          )}

          {suggestions.length > 0 && (
            <Section title="What to do next">
              <div className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className="w-full rounded-card bg-iris-50 px-4 py-3 text-left text-sm text-iris-500"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </Section>
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

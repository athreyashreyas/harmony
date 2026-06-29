import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AreaBalanceBar from '../../components/AreaBalanceBar/AreaBalanceBar';
import { computeAreaActivity } from '../../components/Bloom/activity';
import ComposeHabitSheet, { type HabitDraft } from '../../components/ComposeHabitSheet/ComposeHabitSheet';
import Skeleton from '../../components/Skeleton/Skeleton';
import { saveHabit } from '../../lib/db/queries';
import { createHabit } from '../../lib/domain';
import { gentleObservations } from '../../lib/insights/observations';
import { composeWeeklyRecap } from '../../lib/insights/recap';
import { whatToDoNext, type Suggestion } from '../../lib/insights/suggestions';
import { useUserData } from '../../lib/useUserData';

const eyebrow = 'text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300';

export default function InsightsScreen() {
  const navigate = useNavigate();
  const { profile, areas, habits, logs, loaded, reloadHabits } = useUserData();

  const [suggestSheetArea, setSuggestSheetArea] = useState<string | null>(null);

  const recap = useMemo(
    () => (profile ? composeWeeklyRecap({ areas, habits, logs, profile }) : []),
    [areas, habits, logs, profile],
  );

  const observations = useMemo(() => gentleObservations(areas, habits, logs), [areas, habits, logs]);
  const suggestions = useMemo(() => whatToDoNext(areas, habits, logs), [areas, habits, logs]);

  const balances = useMemo(
    () =>
      areas
        .filter((a) => a.archivedAt == null)
        .map((area) => ({ area, activity: computeAreaActivity(area, habits, logs, 30) })),
    [areas, habits, logs],
  );

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

  const hasAnything = recap.length > 0 || balances.length > 0 || observations.length > 0 || suggestions.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Insights</h1>

      {!loaded ? (
        <div className="mt-7 space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : !hasAnything ? (
        <p className="mt-3 text-sm text-ink-300">
          Your weekly recap and observations will appear here once you've tended to a few things.
        </p>
      ) : null}

      {loaded && recap.length > 0 && (
        <section className="mt-7">
          <p className={eyebrow}>This week</p>
          <div className="mt-3 space-y-2.5">
            {recap.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink-700">
                {line.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {loaded && balances.length > 0 && (
        <section className="mt-9">
          <p className={eyebrow}>Area balance</p>
          <div className="mt-4 space-y-4">
            {balances.map(({ area, activity }) => (
              <AreaBalanceBar key={area.id} name={area.name} color={area.color} activity={activity} />
            ))}
          </div>
        </section>
      )}

      {loaded && observations.length > 0 && (
        <section className="mt-9 space-y-2">
          <p className={eyebrow}>Worth noticing</p>
          {observations.map((text, i) => (
            <p key={i} className="text-sm leading-relaxed text-ink-700">
              {text}
            </p>
          ))}
        </section>
      )}

      {loaded && suggestions.length > 0 && (
        <section className="mt-9 space-y-2.5">
          <p className={eyebrow}>What to do next</p>
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
        </section>
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
              }
            : null
        }
        onClose={() => setSuggestSheetArea(null)}
        onSave={handleCreateHabit}
      />
    </div>
  );
}

import { useState } from 'react';
import type { TimeOfDay } from '@harmony/shared';
import { useOnboarding } from '../OnboardingContext';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton, QuietLink } from '../ui';
import { CADENCE_OPTIONS, TIME_OF_DAY_OPTIONS, cadenceKey } from '../../../lib/cadenceOptions';

const selectClass =
  'w-full rounded-card bg-parchment-50 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 focus:ring-2 focus:ring-iris-500';

// Screen 5, shown once per area. One starter habit per area, not three.
export default function HabitsStep({
  stepIndex,
  totalSteps,
  onBack,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { areas, habits, setHabitName, setHabitCadence, setHabitTimeOfDay } = useOnboarding();
  const [index, setIndex] = useState(0);

  const area = areas[index];
  if (!area) return null;

  const habit = habits[area.id] ?? {
    name: '',
    cadence: CADENCE_OPTIONS[0].value,
    timeOfDay: 'anytime' as TimeOfDay,
  };
  const isLast = index === areas.length - 1;
  const canContinue = habit.name.trim().length > 0;

  function goBack() {
    if (index === 0) onBack();
    else setIndex((i) => i - 1);
  }

  function goNext() {
    if (isLast) onNext();
    else setIndex((i) => i + 1);
  }

  return (
    <OnboardingScaffold
      key={area.id}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={goBack}
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={goNext} disabled={!canContinue}>
            {isLast ? 'Continue' : 'Next'}
          </PrimaryButton>
          <div className="text-center">
            <QuietLink onClick={goNext}>Skip this area for now</QuietLink>
          </div>
        </div>
      }
    >
      <div className="py-6">
        <p className="text-xs uppercase tracking-[0.1em] text-ink-300">
          {area.name} ({index + 1} of {areas.length})
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900">
          What's one small thing you'd like to do for your {area.name}?
        </h1>
        <p className="mt-3 text-sm text-ink-500">One is enough. You can add more later.</p>

        <div className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="habit-name"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Habit
            </label>
            <input
              id="habit-name"
              type="text"
              value={habit.name}
              onChange={(e) => setHabitName(area.id, e.target.value)}
              placeholder="Go for a short walk"
              className={selectClass}
            />
          </div>

          <div>
            <label
              htmlFor="habit-frequency"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              How often
            </label>
            <select
              id="habit-frequency"
              value={cadenceKey(habit.cadence)}
              onChange={(e) => {
                const option = CADENCE_OPTIONS.find((o) => cadenceKey(o.value) === e.target.value);
                if (option) setHabitCadence(area.id, option.value);
              }}
              className={selectClass}
            >
              {CADENCE_OPTIONS.map((o) => (
                <option key={cadenceKey(o.value)} value={cadenceKey(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="habit-time"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Time of day
            </label>
            <select
              id="habit-time"
              value={habit.timeOfDay}
              onChange={(e) => setHabitTimeOfDay(area.id, e.target.value as TimeOfDay)}
              className={selectClass}
            >
              {TIME_OF_DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </OnboardingScaffold>
  );
}

import { useState } from 'react';
import type { TimeOfDay } from '@harmony/shared';
import { MAX_HABIT_NAME } from '@harmony/shared';
import SegmentedControl from '../../../components/SegmentedControl/SegmentedControl';
import SelectMenu from '../../../components/SelectMenu/SelectMenu';
import { useOnboarding } from '../OnboardingContext';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton, QuietLink } from '../ui';
import { CADENCE_OPTIONS, TIME_OF_DAY_OPTIONS, cadenceKey } from '../../../lib/cadenceOptions';

const selectClass =
  'w-full rounded-card bg-parchment-surface px-3.5 py-2.5 text-sm text-ink-strong ring-1 ring-inset ring-parchment-edge focus:ring-2 focus:ring-accent-base';

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
        <p className="text-xs uppercase tracking-[0.1em] text-ink-faint">
          {area.name} ({index + 1} of {areas.length})
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-strong">
          What's one small thing you'd like to do for your {area.name}?
        </h1>
        <p className="mt-3 text-sm text-ink-muted">One is enough. You can add more later.</p>

        <div className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="habit-name"
              className="mb-1.5 block text-sm font-medium text-ink-body"
            >
              Habit
            </label>
            <input
              id="habit-name"
              type="text"
              value={habit.name}
              onChange={(e) => setHabitName(area.id, e.target.value)}
              placeholder="Go for a short walk"
              maxLength={MAX_HABIT_NAME}
              className={selectClass}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-body">How often</p>
            <SelectMenu
              value={cadenceKey(habit.cadence)}
              options={CADENCE_OPTIONS.map((o) => ({ value: cadenceKey(o.value), label: o.label }))}
              onChange={(key) => {
                const option = CADENCE_OPTIONS.find((o) => cadenceKey(o.value) === key);
                if (option) setHabitCadence(area.id, option.value);
              }}
              ariaLabel="How often"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-body">Time of day</p>
            <SegmentedControl
              value={habit.timeOfDay}
              options={TIME_OF_DAY_OPTIONS}
              onChange={(v) => setHabitTimeOfDay(area.id, v)}
              ariaLabel="Time of day"
            />
          </div>
        </div>
      </div>
    </OnboardingScaffold>
  );
}

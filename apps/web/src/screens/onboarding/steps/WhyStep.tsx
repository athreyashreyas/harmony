import { useState } from 'react';
import WatercolorWash from '../../../components/WatercolorWash/WatercolorWash';
import { useOnboarding } from '../OnboardingContext';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton, QuietLink } from '../ui';
import { WHY_EXAMPLES } from '../examples';

const MIN_WHY = 10;

// Builds the live preview the way a real drift nudge would. The user's sentence
// is always shown verbatim. The full template engine (Phase 7) replaces this
// single illustrative line; the framing label "A reminder might read" already
// marks it as an example.
function previewNudge(areaName: string, whySentence: string): string {
  const sentence = whySentence.trim();
  if (!sentence) return `${areaName} has been quiet for a little while. You wrote: ...`;
  return `${areaName} has been quiet for a little while. You wrote: “${sentence}”`;
}

// Screen 3, shown once per area. The most important screen in the product.
export default function WhyStep({
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
  const { areas, setWhy } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);

  const area = areas[index];
  if (!area) return null;

  const value = area.whySentence;
  const canContinue = value.trim().length >= MIN_WHY;
  const isLast = index === areas.length - 1;

  function goBack() {
    if (index === 0) onBack();
    else setIndex((i) => i - 1);
  }

  function goNext() {
    if (isLast) onNext();
    else setIndex((i) => i + 1);
  }

  function useStartingPoint() {
    setWhy(area.id, WHY_EXAMPLES[exampleIndex]);
    setExampleIndex((i) => (i + 1) % WHY_EXAMPLES.length);
  }

  return (
    <OnboardingScaffold
      key={area.id}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={goBack}
      background={<WatercolorWash color={area.color} />}
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={goNext} disabled={!canContinue}>
            {isLast ? 'Continue' : 'Next'}
          </PrimaryButton>
          <div className="text-center">
            <QuietLink onClick={goNext}>Skip for now</QuietLink>
            <p className="mt-1 text-xs text-ink-300">Without this, reminders feel less like you.</p>
          </div>
        </div>
      }
    >
      <div className="py-6">
        <p className="text-xs uppercase tracking-[0.1em] text-ink-300">
          {area.name} ({index + 1} of {areas.length})
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900">
          A good week of {area.name}, in your own words.
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          A short sentence is enough. We bring this back to you in reminders.
        </p>

        <textarea
          value={value}
          onChange={(e) => setWhy(area.id, e.target.value)}
          placeholder="Write here."
          rows={3}
          className="mt-6 w-full resize-none rounded-card bg-parchment-50/90 px-3.5 py-3 text-base text-ink-900 ring-1 ring-inset ring-parchment-300 placeholder:text-ink-300 focus:ring-2 focus:ring-iris-500"
        />

        <div className="mt-2">
          <QuietLink onClick={useStartingPoint}>Need a starting point?</QuietLink>
        </div>

        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.1em] text-ink-300">A reminder might read</p>
          <div
            className="mt-2 rounded-card bg-parchment-50/90 p-4 text-sm leading-relaxed"
            style={{ borderLeft: `3px solid ${area.color}` }}
          >
            <span className={value.trim() ? 'text-ink-700' : 'text-ink-300'}>
              {previewNudge(area.name, value)}
            </span>
          </div>
        </div>
      </div>
    </OnboardingScaffold>
  );
}

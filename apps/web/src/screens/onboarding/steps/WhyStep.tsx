import { useState } from 'react';
import { MAX_WHY_SENTENCE } from '@harmony/shared';
import WatercolorWash from '../../../components/WatercolorWash/WatercolorWash';
import { renderTemplate } from '../../../lib/templates/composer';
import { getTemplate } from '../../../lib/templates/library';
import { useOnboarding } from '../OnboardingContext';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton, QuietLink } from '../ui';
import { WHY_EXAMPLES } from '../examples';

const MIN_WHY = 10;

// The live preview renders a real drift template (the daysSince-free one) so
// the user sees exactly how a nudge frames their words. A fixed template keeps
// the preview steady as they type rather than reshuffling on each keystroke.
// The sentence is always shown verbatim.
const PREVIEW_TEMPLATE = getTemplate('drift-quiet-while');

function previewNudge(areaName: string, whySentence: string): string {
  const sentence = whySentence.trim();
  if (!sentence || !PREVIEW_TEMPLATE) {
    return `${areaName} hasn't had a moment in a little while. You wrote: ...`;
  }
  return renderTemplate(PREVIEW_TEMPLATE.body, { areaName, whySentence: sentence });
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
            <p className="mt-1 text-xs text-ink-faint">Without this, reminders feel less like you.</p>
          </div>
        </div>
      }
    >
      <div className="py-6">
        <p className="text-xs uppercase tracking-[0.1em] text-ink-faint">
          {area.name} ({index + 1} of {areas.length})
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-strong">
          A good week of {area.name}, in your own words.
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          A short sentence is enough. We bring this back to you in reminders.
        </p>

        <textarea
          value={value}
          onChange={(e) => setWhy(area.id, e.target.value)}
          placeholder="Write here."
          rows={3}
          maxLength={MAX_WHY_SENTENCE}
          className="mt-6 w-full resize-none rounded-card bg-parchment-surface/90 px-3.5 py-3 text-base text-ink-strong ring-1 ring-inset ring-parchment-edge placeholder:text-ink-faint focus:ring-2 focus:ring-accent-base"
        />
        {value.length > MAX_WHY_SENTENCE - 40 && (
          <p className="mt-1 text-right text-xs text-ink-faint">{MAX_WHY_SENTENCE - value.length} left</p>
        )}

        <div className="mt-2">
          <QuietLink onClick={useStartingPoint}>Need a starting point?</QuietLink>
        </div>

        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.1em] text-ink-faint">A reminder might read</p>
          <div
            className="mt-2 rounded-card bg-parchment-surface/90 p-4 text-sm leading-relaxed"
            style={{ borderLeft: `3px solid ${area.color}` }}
          >
            <span className={value.trim() ? 'text-ink-body' : 'text-ink-faint'}>
              {previewNudge(area.name, value)}
            </span>
          </div>
        </div>
      </div>
    </OnboardingScaffold>
  );
}

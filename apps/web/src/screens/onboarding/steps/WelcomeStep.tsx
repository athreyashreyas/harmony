import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton } from '../ui';

// Screen 1. The only screen where copy is allowed to lean a little poetic.
export default function WelcomeStep({
  stepIndex,
  totalSteps,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
}) {
  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      showProgress={false}
      footer={<PrimaryButton onClick={onNext}>Begin</PrimaryButton>}
    >
      <div className="flex min-h-full flex-col justify-center py-16">
        <span className="font-serif text-2xl text-iris-500">Harmony</span>
        <h1 className="mt-8 font-serif text-4xl leading-tight text-ink-900">Habits, but quieter.</h1>
        <p className="mt-4 text-base text-ink-500">
          We help you tend to the parts of life that make you feel like yourself. Nothing to win.
          Nothing to lose.
        </p>
      </div>
    </OnboardingScaffold>
  );
}

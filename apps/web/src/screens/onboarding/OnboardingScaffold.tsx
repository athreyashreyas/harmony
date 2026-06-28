import type { ReactNode } from 'react';
import ProgressDots from '../../components/ProgressDots/ProgressDots';
import { BackButton } from './ui';

// Common chrome for every onboarding screen: a top row with an optional back
// button and progress dots, a single scrolling content region, and a fixed
// footer that sits above the home indicator. An optional background slot holds
// the watercolour wash on the why screen.
export default function OnboardingScaffold({
  stepIndex,
  totalSteps,
  showProgress = true,
  onBack,
  background,
  children,
  footer,
}: {
  stepIndex: number;
  totalSteps: number;
  showProgress?: boolean;
  onBack?: () => void;
  background?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-parchment-100">
      {background}

      <header className="relative z-10 flex items-center justify-between px-5 pt-safe">
        <div className="flex h-12 items-center">{onBack ? <BackButton onClick={onBack} /> : null}</div>
        <div className="flex h-12 items-center">
          {showProgress && <ProgressDots total={totalSteps} current={stepIndex} />}
        </div>
      </header>

      <main className="scroll-ios relative z-10 min-h-0 flex-1 overflow-y-auto px-5">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>

      {footer && (
        <footer className="relative z-10 px-5 pb-safe pt-4">
          <div className="mx-auto w-full max-w-md pb-4">{footer}</div>
        </footer>
      )}
    </div>
  );
}

import { useState } from 'react';
import { canPromptInstall, detectPlatform, isStandalone, promptInstall } from '../../../lib/push/install';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton, QuietLink } from '../ui';

// Screen 6. The install nudge. Platform aware and skippable. Marking the
// profile onboarded happens in onFinish.
export default function InstallStep({
  stepIndex,
  totalSteps,
  onFinish,
}: {
  stepIndex: number;
  totalSteps: number;
  onFinish: () => void;
}) {
  const platform = detectPlatform();
  const installed = isStandalone();
  const promptable = canPromptInstall();
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    setBusy(true);
    await promptInstall();
    setBusy(false);
    onFinish();
  }

  const showNativePrompt = !installed && promptable && (platform === 'android' || platform === 'desktop');

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      showProgress={false}
      footer={
        <div className="space-y-3">
          {showNativePrompt ? (
            <PrimaryButton onClick={handleInstall} disabled={busy}>
              Add to home screen
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={onFinish}>Done</PrimaryButton>
          )}
          {showNativePrompt && (
            <div className="text-center">
              <QuietLink onClick={onFinish}>Maybe later</QuietLink>
            </div>
          )}
        </div>
      }
    >
      <div className="flex min-h-full flex-col justify-center py-12">
        <h1 className="font-serif text-3xl leading-tight text-ink-900">
          Add Harmony to your home screen.
        </h1>

        {installed ? (
          <p className="mt-4 text-sm text-ink-500">
            You're all set. Harmony is on your home screen.
          </p>
        ) : platform === 'ios-safari' ? (
          <p className="mt-4 text-sm text-ink-500">
            Tap the share icon, then "Add to Home Screen". Notifications only work this way on
            iPhone, by Apple's design.
          </p>
        ) : showNativePrompt ? (
          <p className="mt-4 text-sm text-ink-500">
            Keep Harmony a tap away, with notifications that behave like any other app.
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-500">
            Look for "Install" or "Add to Home Screen" in your browser menu. This keeps Harmony a
            tap away.
          </p>
        )}
      </div>
    </OnboardingScaffold>
  );
}

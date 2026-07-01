import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Area, Habit } from '@harmony/shared';
import { areasForUser, saveOnboarding } from '../../lib/db/queries';
import { createArea, createHabit } from '../../lib/domain';
import { markOnboarded, mirrorOnboarding } from '../../lib/supabase/sync';
import { APP_VERSION } from '../../lib/changelog';
import { useSettings } from '../../store/useSettings';
import { useUser } from '../../store/useUser';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import WelcomeStep from './steps/WelcomeStep';
import AreasStep from './steps/AreasStep';
import WhyStep from './steps/WhyStep';
import ImportanceStep from './steps/ImportanceStep';
import HabitsStep from './steps/HabitsStep';
import InstallStep from './steps/InstallStep';

const STEPS = ['welcome', 'areas', 'why', 'importance', 'habits', 'install'] as const;
type Step = (typeof STEPS)[number];

// Steps that iterate over the chosen areas; meaningless (and blank) with none.
const AREA_STEPS: Step[] = ['why', 'importance', 'habits'];
const STEP_KEY = 'harmony.onboardingStep';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStep(): Step {
  try {
    const saved = localStorage.getItem(STEP_KEY);
    if (saved && (STEPS as readonly string[]).includes(saved)) return saved as Step;
  } catch {
    // ignore
  }
  return 'welcome';
}

function OnboardingInner() {
  const navigate = useNavigate();
  const profile = useUser((s) => s.profile);
  const updateProfile = useUser((s) => s.updateProfile);
  const { areas, habits, clearDraft } = useOnboarding();

  // Step is persisted too, so a reload resumes exactly where the user was
  // rather than dropping them back at the welcome screen.
  const [step, setStep] = useState<Step>(loadStep);
  const [direction, setDirection] = useState(1);
  const committedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STEP_KEY, step);
    } catch {
      // ignore
    }
  }, [step]);

  // Safety net: never sit on an area-dependent step with no areas (which would
  // render blank). Bounce back to the area picker instead.
  useEffect(() => {
    if (AREA_STEPS.includes(step) && areas.length === 0) {
      setStep('areas');
    }
  }, [step, areas.length]);

  // Resume: if a prior run already committed areas (the app was closed on the
  // install screen), skip straight back to it rather than restarting.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    areasForUser(profile.id).then((existing) => {
      if (active && existing.length > 0) {
        committedRef.current = true;
        setStep('install');
      }
    });
    return () => {
      active = false;
    };
  }, [profile]);

  const stepIndex = STEPS.indexOf(step);

  function go(to: Step) {
    setDirection(STEPS.indexOf(to) >= stepIndex ? 1 : -1);
    setStep(to);
  }

  // Commit the draft to Dexie (source of truth) and mirror to Supabase in the
  // background, then move to the install screen. Guarded so re-entry never
  // double-writes.
  async function commitAndContinue() {
    if (!profile) return;
    if (!committedRef.current) {
      committedRef.current = true;
      const now = Date.now();
      const date = todayISO();

      const areaRows: Area[] = areas.map((a, i) =>
        createArea(
          { name: a.name, color: a.color, importance: a.importance, whySentence: a.whySentence },
          { userId: profile.id, order: i, id: a.id, createdAt: now },
        ),
      );

      const habitRows: Habit[] = areas
        .map((a) => ({ areaId: a.id, draft: habits[a.id] }))
        .filter((h) => h.draft && h.draft.name.trim().length > 0)
        .map(({ areaId, draft }) =>
          createHabit(
            {
              areaId,
              name: draft!.name.trim(),
              cadence: draft!.cadence,
              timeOfDay: draft!.timeOfDay,
              reminderTime: null,
              startDate: date,
              endDate: null,
            },
            { userId: profile.id, order: 0, createdAt: now },
          ),
        );

      await saveOnboarding(areaRows, habitRows);
      void mirrorOnboarding(areaRows, habitRows);
    }
    go('install');
  }

  async function finish() {
    if (!profile) return;
    await markOnboarded(profile.id);
    updateProfile({ ...profile, onboardedAt: Date.now() });
    // A brand-new user has just seen the full guide, so mark this version as
    // already seen. That way the "What's new" pop-up (shown to existing users on
    // an update) never greets someone the moment they finish setting up.
    void useSettings.getState().update(profile.id, { lastSeenVersion: APP_VERSION });
    // The draft has served its purpose; clear it so a future visit to
    // onboarding (e.g. a second account) starts clean.
    clearDraft();
    try {
      localStorage.removeItem(STEP_KEY);
    } catch {
      // ignore
    }
    // First stop after onboarding is the full walk-through (the Guide pane), so
    // the very first thing they meet is a kind tour. "Back to Harmony" lands home.
    navigate('/guide?pane=guide', { replace: true });
  }

  // Render-time guard: an area-dependent step with no areas would render blank,
  // so fall back to the area picker without waiting for an effect.
  const effectiveStep: Step =
    AREA_STEPS.includes(step) && areas.length === 0 ? 'areas' : step;
  const common = { stepIndex: STEPS.indexOf(effectiveStep), totalSteps: STEPS.length };

  // No AnimatePresence / mode="wait" here on purpose: a dragging element inside
  // an exiting child (the importance chips) can stop the exit-complete callback
  // from firing, which left the next step unmounted until a manual refresh.
  // Keying a plain motion.div by step gives a snappy enter animation while
  // guaranteeing the new step always mounts immediately.
  return (
    <div className="h-full overflow-hidden">
      <motion.div
        key={effectiveStep}
        initial={{ opacity: 0, x: direction * 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {effectiveStep === 'welcome' && <WelcomeStep {...common} onNext={() => go('areas')} />}
        {effectiveStep === 'areas' && (
          <AreasStep {...common} onBack={() => go('welcome')} onNext={() => go('why')} />
        )}
        {effectiveStep === 'why' && (
          <WhyStep {...common} onBack={() => go('areas')} onNext={() => go('importance')} />
        )}
        {effectiveStep === 'importance' && (
          <ImportanceStep {...common} onBack={() => go('why')} onNext={() => go('habits')} />
        )}
        {effectiveStep === 'habits' && (
          <HabitsStep {...common} onBack={() => go('importance')} onNext={commitAndContinue} />
        )}
        {effectiveStep === 'install' && <InstallStep {...common} onFinish={finish} />}
      </motion.div>
    </div>
  );
}

export default function OnboardingFlow() {
  return (
    <OnboardingProvider>
      <OnboardingInner />
    </OnboardingProvider>
  );
}

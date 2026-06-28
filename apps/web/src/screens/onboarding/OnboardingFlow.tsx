import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Area, Habit } from '@harmony/shared';
import { areasForUser, saveOnboarding } from '../../lib/db/queries';
import { markOnboarded, mirrorOnboarding } from '../../lib/supabase/sync';
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function OnboardingInner() {
  const navigate = useNavigate();
  const profile = useUser((s) => s.profile);
  const updateProfile = useUser((s) => s.updateProfile);
  const { areas, habits } = useOnboarding();

  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState(1);
  const committedRef = useRef(false);

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

      const areaRows: Area[] = areas.map((a, i) => ({
        id: a.id,
        userId: profile.id,
        name: a.name,
        color: a.color,
        importance: a.importance,
        whySentence: a.whySentence,
        order: i,
        createdAt: now,
        archivedAt: null,
      }));

      const habitRows: Habit[] = areas
        .map((a) => ({ areaId: a.id, draft: habits[a.id] }))
        .filter((h) => h.draft && h.draft.name.trim().length > 0)
        .map(({ areaId, draft }) => ({
          id: crypto.randomUUID(),
          userId: profile.id,
          areaId,
          name: draft!.name.trim(),
          cadence: draft!.cadence,
          timeOfDay: draft!.timeOfDay,
          reminderTime: null,
          startDate: date,
          endDate: null,
          order: 0,
          createdAt: now,
          archivedAt: null,
        }));

      await saveOnboarding(areaRows, habitRows);
      void mirrorOnboarding(areaRows, habitRows);
    }
    go('install');
  }

  async function finish() {
    if (!profile) return;
    await markOnboarded(profile.id);
    updateProfile({ ...profile, onboardedAt: Date.now() });
    navigate('/', { replace: true });
  }

  const common = { stepIndex, totalSteps: STEPS.length };

  return (
    <div className="h-full overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          {step === 'welcome' && <WelcomeStep {...common} onNext={() => go('areas')} />}
          {step === 'areas' && (
            <AreasStep {...common} onBack={() => go('welcome')} onNext={() => go('why')} />
          )}
          {step === 'why' && (
            <WhyStep {...common} onBack={() => go('areas')} onNext={() => go('importance')} />
          )}
          {step === 'importance' && (
            <ImportanceStep {...common} onBack={() => go('why')} onNext={() => go('habits')} />
          )}
          {step === 'habits' && (
            <HabitsStep {...common} onBack={() => go('importance')} onNext={commitAndContinue} />
          )}
          {step === 'install' && <InstallStep {...common} onFinish={finish} />}
        </motion.div>
      </AnimatePresence>
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

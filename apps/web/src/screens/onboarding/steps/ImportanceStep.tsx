import { useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import type { Importance } from '@harmony/shared';
import { hexToRgba } from '../../../lib/color';
import { spring } from '../../../lib/motion';
import { useOnboarding } from '../OnboardingContext';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton } from '../ui';

const BUCKETS: { id: Importance; label: string; hint: string }[] = [
  { id: 'core', label: 'Really matters', hint: 'We pay the most attention here.' },
  { id: 'matters', label: 'Matters', hint: 'Gentle reminders when it goes quiet.' },
  { id: 'optional', label: 'Nice to have', hint: 'Only the reminders you schedule.' },
];

const NEXT_TIER: Record<Importance, Importance> = {
  matters: 'core',
  core: 'optional',
  optional: 'matters',
};

function clientYFromEvent(e: MouseEvent | TouchEvent | PointerEvent): number {
  if ('clientY' in e) return e.clientY;
  const touch = (e as TouchEvent).changedTouches?.[0];
  return touch ? touch.clientY : 0;
}

// Screen 4. Drag chips between the three buckets, or tap a chip to move it to
// the next bucket. Default is "Matters".
export default function ImportanceStep({
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
  const { areas, setImportance } = useOnboarding();
  const bucketRefs = useRef<Record<Importance, HTMLDivElement | null>>({
    core: null,
    matters: null,
    optional: null,
  });

  function bucketAt(y: number): Importance | null {
    for (const bucket of BUCKETS) {
      const el = bucketRefs.current[bucket.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) return bucket.id;
    }
    return null;
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}
    >
      <div className="py-6">
        <h1 className="font-serif text-3xl leading-tight text-ink-900">
          Which areas matter most?
        </h1>
        <p className="mt-3 text-sm text-ink-500">These don't have to be in stone. Tweak any time.</p>
        <p className="mt-1 text-xs text-ink-300">Drag a chip, or tap it to move it along.</p>

        <LayoutGroup>
          <div className="mt-6 space-y-3">
            {BUCKETS.map((bucket) => {
              const inBucket = areas.filter((a) => a.importance === bucket.id);
              return (
                <div
                  key={bucket.id}
                  ref={(el) => {
                    bucketRefs.current[bucket.id] = el;
                  }}
                  className="rounded-sheet bg-parchment-200/70 p-4"
                >
                  <p className="text-sm font-medium text-ink-700">{bucket.label}</p>
                  <p className="text-xs text-ink-300">{bucket.hint}</p>
                  <div className="mt-3 flex min-h-[2.5rem] flex-wrap gap-2">
                    {inBucket.map((area) => (
                      <motion.button
                        key={area.id}
                        type="button"
                        layout
                        layoutId={area.id}
                        transition={spring}
                        drag
                        dragSnapToOrigin
                        whileDrag={{ scale: 1.06, zIndex: 20 }}
                        onTap={() => setImportance(area.id, NEXT_TIER[area.importance])}
                        onDragEnd={(event) => {
                          const target = bucketAt(clientYFromEvent(event));
                          if (target && target !== area.importance) {
                            setImportance(area.id, target);
                          }
                        }}
                        className="flex cursor-grab items-center gap-2 rounded-full px-4 py-2 text-sm font-medium active:cursor-grabbing"
                        style={{ backgroundColor: hexToRgba(area.color, 0.12), color: area.color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: area.color }}
                        />
                        {area.name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </OnboardingScaffold>
  );
}

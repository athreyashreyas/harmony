import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import type { Area, Habit, Log } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';
import { softSpring } from '../../lib/motion';
import { computeAreaActivity } from './activity';
import { describeDonutSegment } from './geometry';

const SIZE = 220;
const CENTER = SIZE / 2;
const MIN_RADIUS = 22;
const MAX_RADIUS = 80;
const CENTER_RADIUS = 20;
const GAP_DEGREES = 4;
const RING_1 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.33;
const RING_2 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.66;
// A press held this long magnifies the petal; a quicker tap selects (filters).
const HOLD_MS = 240;

function Petal({
  area,
  activity,
  startAngle,
  endAngle,
  dimmed,
  onTap,
  onHoldStart,
  onHoldEnd,
}: {
  area: Area;
  activity: number;
  startAngle: number;
  endAngle: number;
  dimmed: boolean;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const target = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * activity;
  const radius = useSpring(MIN_RADIUS, softSpring);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  useEffect(() => {
    radius.set(target);
  }, [target, radius]);

  const fillPath = useTransform(radius, (r) =>
    describeDonutSegment(CENTER, CENTER, MIN_RADIUS, r, startAngle, endAngle),
  );
  const trackPath = describeDonutSegment(CENTER, CENTER, MIN_RADIUS, MAX_RADIUS, startAngle, endAngle);

  function startPress() {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      onHoldStart();
    }, HOLD_MS);
  }
  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    if (held.current) onHoldEnd();
    else onTap();
  }
  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
    if (held.current) onHoldEnd();
  }

  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={area.name}
      // Suppress the browser focus ring for pointer input (mouse click, touch
      // tap) but keep it for keyboard Tab focus, so the slice stays accessible
      // without flashing a box on every tap.
      className="[&:focus:not(:focus-visible)]:outline-none"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={cancelPress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap();
      }}
      animate={{ opacity: dimmed ? 0.22 : 1 }}
      transition={{ duration: 0.25 }}
      style={{ cursor: 'pointer' }}
    >
      <path d={trackPath} fill={hexToRgba(area.color, 0.13)} />
      <motion.path d={fillPath} fill={hexToRgba(area.color, 0.87)} />
    </motion.g>
  );
}

export default function Bloom({
  areas,
  habits,
  logs,
  activities: activitiesProp,
  selectedAreaId,
  onSelectArea,
}: {
  areas: Area[];
  habits: Habit[];
  logs: Log[];
  // Optional: the per-area fill values, when the caller already computed them
  // (Home does, for the caption), so the same pass isn't run twice per render.
  activities?: number[];
  selectedAreaId?: string | null;
  onSelectArea: (areaId: string) => void;
}) {
  const sliceAngle = areas.length > 0 ? 360 / areas.length : 0;
  const [magnified, setMagnified] = useState<Area | null>(null);

  // Use the caller's values when given; only compute here as a fallback, so the
  // map doesn't run a second time when Home already has it.
  const activities = useMemo(
    () => activitiesProp ?? areas.map((area) => computeAreaActivity(area, habits, logs)),
    [activitiesProp, areas, habits, logs],
  );

  // Responsive and prominent: fills the column up to a generous cap, so the
  // Bloom reads as the centrepiece on phones and tablets alike.
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Your bloom">
        <circle cx={CENTER} cy={CENTER} r={RING_1} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
        <circle cx={CENTER} cy={CENTER} r={RING_2} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />

        {areas.map((area, i) => {
          const start = i * sliceAngle + GAP_DEGREES / 2;
          const end = (i + 1) * sliceAngle - GAP_DEGREES / 2;
          // Dim petals that aren't the active filter (or the one being held).
          const focusId = magnified?.id ?? selectedAreaId ?? null;
          return (
            <Petal
              key={area.id}
              area={area}
              activity={activities[i]}
              startAngle={start}
              endAngle={end}
              dimmed={focusId != null && focusId !== area.id}
              onTap={() => onSelectArea(area.id)}
              onHoldStart={() => setMagnified(area)}
              onHoldEnd={() => setMagnified(null)}
            />
          );
        })}

        <circle cx={CENTER} cy={CENTER} r={CENTER_RADIUS} fill="var(--parchment-50)" />
        <text
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fill="var(--iris-500)"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          h
        </text>
      </svg>

      {/* Hold a petal to lift the area out of the wheel with its own words. */}
      <AnimatePresence>
        {magnified && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="flex h-[92%] w-[92%] flex-col items-center justify-center rounded-full p-6 text-center shadow-sheet"
              style={{ backgroundColor: magnified.color }}
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.45, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              <p className="font-serif text-xl text-white">{magnified.name}</p>
              {magnified.whySentence && (
                <p className="mt-2 line-clamp-4 px-2 text-sm italic leading-snug text-white/90">
                  &ldquo;{magnified.whySentence}&rdquo;
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { Area, Habit, Log } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';
import { softSpring } from '../../lib/motion';
import { computeAreaActivity } from './activity';
import { describeDonutSegment, petalCenter } from './geometry';

const SIZE = 220;
const CENTER = SIZE / 2;
const MIN_RADIUS = 22;
const MAX_RADIUS = 80;
const CENTER_RADIUS = 20;
const GAP_DEGREES = 4;
// Reference rings mark progress through the min-to-max fill band, at a third
// and two thirds of the way, rather than at a fixed radius (section 9.2 gives
// percentages without a stated reference, so this reads them against the band
// the petals actually fill).
const RING_1 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.33;
const RING_2 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.66;
const LONG_PRESS_MS = 500;

function Petal({
  area,
  activity,
  startAngle,
  endAngle,
  onTap,
  onLongPress,
}: {
  area: Area;
  activity: number;
  startAngle: number;
  endAngle: number;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const target = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * activity;
  const radius = useSpring(MIN_RADIUS, softSpring);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedWasLong = useRef(false);

  useEffect(() => {
    radius.set(target);
  }, [target, radius]);

  const fillPath = useTransform(radius, (r) =>
    describeDonutSegment(CENTER, CENTER, MIN_RADIUS, r, startAngle, endAngle),
  );
  const trackPath = describeDonutSegment(CENTER, CENTER, MIN_RADIUS, MAX_RADIUS, startAngle, endAngle);

  function startPress() {
    pressedWasLong.current = false;
    pressTimer.current = setTimeout(() => {
      pressedWasLong.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!pressedWasLong.current) onTap();
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={area.name}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={cancelPress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap();
      }}
      style={{ cursor: 'pointer' }}
    >
      <path d={trackPath} fill={hexToRgba(area.color, 0.13)} />
      <motion.path d={fillPath} fill={hexToRgba(area.color, 0.87)} />
    </g>
  );
}

export default function Bloom({
  areas,
  habits,
  logs,
  onSelectArea,
  size = SIZE,
}: {
  areas: Area[];
  habits: Habit[];
  logs: Log[];
  onSelectArea: (areaId: string) => void;
  size?: number;
}) {
  const sliceAngle = areas.length > 0 ? 360 / areas.length : 0;
  const [tooltipArea, setTooltipArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!tooltipArea) return;
    function dismiss() {
      setTooltipArea(null);
    }
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [tooltipArea]);

  const activities = useMemo(
    () => areas.map((area) => computeAreaActivity(area, habits, logs)),
    [areas, habits, logs],
  );

  const tooltipPos = useMemo(() => {
    if (!tooltipArea) return null;
    const i = areas.findIndex((a) => a.id === tooltipArea.id);
    if (i === -1) return null;
    const start = i * sliceAngle + GAP_DEGREES / 2;
    const end = (i + 1) * sliceAngle - GAP_DEGREES / 2;
    return petalCenter(CENTER, CENTER, (MIN_RADIUS + MAX_RADIUS) / 2, start, end);
  }, [tooltipArea, areas, sliceAngle]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} role="img" aria-label="Your bloom">
        <circle cx={CENTER} cy={CENTER} r={RING_1} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
        <circle cx={CENTER} cy={CENTER} r={RING_2} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />

        {areas.map((area, i) => {
          const start = i * sliceAngle + GAP_DEGREES / 2;
          const end = (i + 1) * sliceAngle - GAP_DEGREES / 2;
          return (
            <Petal
              key={area.id}
              area={area}
              activity={activities[i]}
              startAngle={start}
              endAngle={end}
              onTap={() => onSelectArea(area.id)}
              onLongPress={() => setTooltipArea(area)}
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

      {tooltipArea && tooltipPos && (
        <div
          className="absolute z-10 w-44 -translate-x-1/2 rounded-card bg-parchment-50 p-3 text-center shadow-sheet"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
        >
          <p className="text-sm font-medium text-ink-900">{tooltipArea.name}</p>
          {tooltipArea.whySentence && (
            <p className="mt-1 text-xs italic text-ink-500">&ldquo;{tooltipArea.whySentence}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { Area } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';

// Long enough not to trigger on a normal tap, short enough to feel responsive.
const HOLD_MS = 420;

// An area chip on Home. A quick tap filters today's habits to that area (tapping
// again clears). Pressing and holding opens the area's edit pane. Wraps freely
// so every area shows on any screen.
export default function AreaChip({
  area,
  selected = false,
  onClick,
  onLongPress,
}: {
  area: Area;
  selected?: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  function startPress() {
    held.current = false;
    if (!onLongPress) return;
    timer.current = setTimeout(() => {
      held.current = true;
      onLongPress();
    }, HOLD_MS);
  }
  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    if (!held.current) onClick(); // a tap, not a hold
  }
  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
  }

  return (
    <motion.button
      type="button"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={cancelPress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      whileTap={{ scale: 0.95 }}
      aria-pressed={selected}
      className="flex select-none items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
      style={
        selected
          ? { backgroundColor: area.color, color: '#fff' }
          : { backgroundColor: hexToRgba(area.color, 0.12), color: area.color }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: selected ? '#fff' : area.color }}
      />
      {area.name}
    </motion.button>
  );
}

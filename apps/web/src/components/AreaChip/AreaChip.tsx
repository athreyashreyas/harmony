import { motion } from 'framer-motion';
import type { Area } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';

// An area chip on Home. Tapping it filters today's habits to that area; the
// selected chip fills with its colour (like the chosen areas in onboarding),
// tapping again clears. Wraps freely so every area shows on any screen.
export default function AreaChip({
  area,
  selected = false,
  onClick,
}: {
  area: Area;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      aria-pressed={selected}
      className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
      style={
        selected
          ? { backgroundColor: area.color, color: 'var(--parchment-50)' }
          : { backgroundColor: hexToRgba(area.color, 0.12), color: area.color }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: selected ? 'var(--parchment-50)' : area.color }}
      />
      {area.name}
    </motion.button>
  );
}

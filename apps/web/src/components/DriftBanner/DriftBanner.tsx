import { motion } from 'framer-motion';
import { hexToRgba } from '../../lib/color';
import { spring } from '../../lib/motion';

// Section 9.3. A soft banner above the Bloom, shown only when the drift engine
// has fired today. Tapping it goes to that area.
export default function DriftBanner({
  text,
  color,
  onClick,
}: {
  text: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="w-full rounded-card px-4 py-3 text-left text-sm leading-relaxed text-ink-700"
      style={{ backgroundColor: hexToRgba(color, 0.12), borderLeft: `3px solid ${color}` }}
    >
      {text}
    </motion.button>
  );
}

import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';

// A small reusable toggle for the notification preferences (section 14).
export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors"
      style={{ backgroundColor: checked ? 'var(--accent-base)' : 'var(--parchment-edge)' }}
    >
      <motion.span
        className="block h-5 w-5 rounded-full bg-parchment-surface shadow-card"
        animate={{ x: checked ? 16 : 0 }}
        transition={spring}
      />
    </button>
  );
}

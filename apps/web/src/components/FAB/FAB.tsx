import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Floating action button, fixed position per section 5.5.
export default function FAB({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      aria-label={label}
      className="fixed bottom-[calc(5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-30 flex h-14 w-14 items-center justify-center rounded-fab bg-iris-500 text-parchment-50 shadow-fab md:bottom-[calc(2rem+var(--safe-bottom))] md:right-[calc(2rem+var(--safe-right))]"
    >
      {icon ?? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </motion.button>
  );
}

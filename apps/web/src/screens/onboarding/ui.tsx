import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Shared onboarding controls, kept here so every step reads the same.

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-accent-base py-3 text-sm font-medium text-on-accent transition-opacity disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}

export function QuietLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-ink-muted underline-offset-2 hover:text-accent-emphasis hover:underline"
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="-ml-2 rounded-full p-2 text-ink-muted hover:text-ink-body"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}

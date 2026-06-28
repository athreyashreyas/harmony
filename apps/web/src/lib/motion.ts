// Motion tokens (section 4.5). Keep durations 0.2 to 0.4s. Respect
// prefers-reduced-motion at the point of use.
import type { Variants } from 'framer-motion';

export const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;
export const softSpring = { type: 'spring', stiffness: 120, damping: 20 } as const;

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
};

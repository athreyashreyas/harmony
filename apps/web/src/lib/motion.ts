// Motion tokens (section 4.5). The spec's verbatim values (spring 400/30,
// softSpring 120/20) read as sluggish in practice, especially softSpring,
// used for the Bloom's petal fill and the Switch toggle. Tuned stiffer and
// less damped here for a snappier, more reactive feel; still springs, not
// linear tweens, so motion stays physical rather than mechanical. Keep
// durations short. Respect prefers-reduced-motion at the point of use.
import type { Variants } from 'framer-motion';

export const spring = { type: 'spring', stiffness: 560, damping: 32 } as const;
export const softSpring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.025 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
};

// A calm placeholder block (section 12 "Polish": skeletons, not spinners,
// while a screen's data is still loading from Dexie). Reduced motion turns
// the pulse off via the global override in styles/index.css.
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-card bg-parchment-200 ${className}`} />;
}

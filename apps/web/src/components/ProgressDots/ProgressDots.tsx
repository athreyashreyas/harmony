// Onboarding progress (section 8). One dot per screen: filled for completed
// screens, a slightly larger iris dot for the current one, dim for upcoming.
export default function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="presentation">
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        return (
          <span
            key={i}
            className={[
              'h-1.5 rounded-full transition-all',
              isCurrent ? 'w-4 bg-iris-500' : 'w-1.5',
              isDone ? 'bg-iris-500' : isCurrent ? '' : 'bg-parchment-300',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}

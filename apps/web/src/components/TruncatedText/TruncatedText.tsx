import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

// A one-line label that stays truncated, but ONLY when it is actually cropped it
// gains a chevron button and becomes tappable to expand in place: the name
// un-truncates and wraps to full, growing the card to fit (no popover, no hover).
// Tap again to collapse. The chevron is a real button with a generous hit area,
// and the reveal stops propagation, so expanding never misfires into opening the
// row. When the text fits, it is inert and taps fall through to the row.
export default function TruncatedText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cropped, setCropped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (expanded) return; // only measure overflow while collapsed
    const measure = () => {
      const el = ref.current;
      if (el) setCropped(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, expanded]);

  const interactive = cropped || expanded;

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded((v) => !v);
  };

  return (
    <span className="flex items-start gap-0.5">
      <span
        ref={ref}
        onClick={interactive ? toggle : undefined}
        className={`min-w-0 ${expanded ? 'whitespace-normal break-words' : 'truncate'} ${interactive ? 'cursor-pointer' : ''} ${className}`}
      >
        {text}
      </span>
      {interactive && (
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? 'Show less' : 'Show full name'}
          aria-expanded={expanded}
          // A large, forgiving tap target (negative margins keep the layout tight)
          // so expanding is easy and never misfires into opening the row.
          className="-my-2 -mr-2 flex shrink-0 items-center p-2 text-ink-300"
        >
          <svg
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </span>
  );
}

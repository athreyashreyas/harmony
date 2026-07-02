import { useLayoutEffect, useRef, useState } from 'react';

// A one-line label that stays truncated, but ONLY when it is actually cropped it
// gains a small chevron and becomes tappable to expand in place: the name
// un-truncates and wraps to full, growing the card to fit the text (no floating
// popover, no hover). Tap again to collapse. When the text fits, it is inert and
// taps fall through to whatever the row does (e.g. opening the habit).
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

  return (
    <span
      className={`flex items-start gap-1 ${interactive ? 'cursor-pointer' : ''}`}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              e.preventDefault();
              setExpanded((v) => !v);
            }
          : undefined
      }
    >
      <span ref={ref} className={`min-w-0 ${expanded ? 'whitespace-normal break-words' : 'truncate'} ${className}`}>
        {text}
      </span>
      {interactive && (
        <svg
          className={`mt-[3px] shrink-0 text-ink-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      )}
    </span>
  );
}

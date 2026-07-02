import { useLayoutEffect, useRef, useState } from 'react';
import { useDismiss } from '../../lib/useDismiss';

// A one-line label that stays truncated, but becomes tappable to reveal the full
// text in a small popover ONLY when it is actually cropped. When the text fits,
// it is inert and taps fall through to whatever the row does (e.g. opening the
// habit). Touch-first: no hover needed. The reveal tap stops propagation so it
// doesn't also trigger the row.
export default function TruncatedText({ text, className = '' }: { text: string; className?: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const [cropped, setCropped] = useState(false);
  const [open, setOpen] = useState(false);
  useDismiss(open, rootRef, () => setOpen(false));

  useLayoutEffect(() => {
    const measure = () => {
      const el = spanRef.current;
      if (el) setCropped(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

  return (
    <span ref={rootRef} className="relative block">
      <span
        ref={spanRef}
        className={`block truncate ${className}`}
        title={cropped ? text : undefined}
        onClick={
          cropped
            ? (e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpen((o) => !o);
              }
            : undefined
        }
      >
        {text}
      </span>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block max-w-[16rem] rounded-card border border-parchment-300/60 bg-parchment-50 px-3 py-2 text-sm font-normal leading-snug text-ink-900 shadow-lift">
          {text}
        </span>
      )}
    </span>
  );
}

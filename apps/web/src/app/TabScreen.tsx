import type { ReactNode } from 'react';
import SyncDot from '../components/SyncDot/SyncDot';

// The shared root for every top-level tab screen (Home, Areas, Log, Insights,
// Me). It centres the content column and, crucially, is `relative` so the
// SyncDot anchors to the top-right of *this column* — not the viewport and not
// the full-width scroller. That keeps the dot in the same spot on every tab and
// at every width: on a phone the column is full-bleed, on a tablet or desktop
// it's a centred max-w-2xl, and the dot rides its right edge either way. Because
// the anchor lives here (and the offset lives in SyncDot), a new tab gets
// correct, drift-free sync placement for free just by rendering through here —
// there's no per-screen positioning to keep in sync.
//
// Padding differs per screen (Home leads with a date line, others with a
// title), so callers pass their own pt/pb via `className`. The dot's vertical
// offset is deliberately independent of that padding, so those differences
// never move it.
export default function TabScreen({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative mx-auto w-full max-w-2xl px-5 ${className}`}>
      <SyncDot />
      {children}
    </div>
  );
}

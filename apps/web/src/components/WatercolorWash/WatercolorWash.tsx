import { hexToRgba } from '../../lib/color';

// The signature element (section 4.3). Bleeds the given hex colour from one
// edge of its container toward the other. Place inside a relatively positioned
// container. Opacity ramps from ~0.18 at the source edge to 0 across the band.
// A single absolutely positioned div with a three stop vertical gradient.
//
// from='bottom' (default) is uses 1 and 3 (onboarding why screen, compose
// sheet). from='top' is the inverted use 2 (the habit detail header), where
// the wash fades downward behind the mantra and the crown of the header.
export default function WatercolorWash({
  color,
  height = 480,
  from = 'bottom',
  className = '',
}: {
  color: string;
  height?: number;
  from?: 'bottom' | 'top';
  className?: string;
}) {
  const direction = from === 'bottom' ? 'to top' : 'to bottom';
  const anchor = from === 'bottom' ? 'bottom-0' : 'top-0';
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 ${anchor} ${className}`}
      style={{
        height,
        background: `linear-gradient(${direction}, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(
          color,
          0.06,
        )} 50%, ${hexToRgba(color, 0)} 100%)`,
      }}
    />
  );
}

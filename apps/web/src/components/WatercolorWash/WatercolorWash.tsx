import { hexToRgba } from '../../lib/color';

// The signature element (section 4.3). Bleeds the given hex colour from the
// bottom of its container upward. Place inside a relatively positioned
// container. Opacity ramps from ~0.18 at the bottom to 0 by the top of the
// band. A single absolutely positioned div with a three stop vertical gradient.
export default function WatercolorWash({
  color,
  height = 480,
  className = '',
}: {
  color: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 ${className}`}
      style={{
        height,
        background: `linear-gradient(to top, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(
          color,
          0.06,
        )} 50%, ${hexToRgba(color, 0)} 100%)`,
      }}
    />
  );
}

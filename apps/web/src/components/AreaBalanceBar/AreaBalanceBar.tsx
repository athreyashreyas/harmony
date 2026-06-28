import { hexToRgba } from '../../lib/color';

// Section 13.2. A horizontal bar per area, rolling 30 day completion ratio in
// the area's colour. No percentage labels, just the bar. The subtle iris line
// marks where a "typical" rhythm sits, the same 0.7 mark the Bloom uses.
const TYPICAL_MARK = 0.7;

export default function AreaBalanceBar({
  name,
  color,
  activity,
}: {
  name: string;
  color: string;
  activity: number;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-ink-500">{name}</p>
      <div className="relative h-2 overflow-hidden rounded-full bg-parchment-200">
        <div
          className="h-full rounded-full"
          style={{ width: `${activity * 100}%`, backgroundColor: hexToRgba(color, 0.87) }}
        />
        <div className="absolute inset-y-0" style={{ left: `${TYPICAL_MARK * 100}%` }}>
          <div className="h-full w-px bg-iris-400/60" />
        </div>
      </div>
    </div>
  );
}

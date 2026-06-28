import type { Area } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';

// The horizontal area chip row on Home (section 9.1). A quieter cousin of the
// onboarding area chip: no selection state, just a dot and a name, tapping
// takes you toward that area.
export default function AreaChip({ area, onClick }: { area: Area; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium"
      style={{ backgroundColor: hexToRgba(area.color, 0.12), color: area.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
      {area.name}
    </button>
  );
}

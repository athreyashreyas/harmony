import { useMemo } from 'react';
import { AREA_PALETTE } from '@harmony/shared';

// A themed colour picker. The palette is laid out in one responsive grid that
// flows to fill the available width (so it uses landscape space instead of
// leaving a tall column of dead space), while the swatches keep a generous size.
// Colours run in hue order, so contrasting choices sit a glance apart, and any
// already used by another area are marked so the wheel stays legibly varied.
export default function ColorPicker({
  value,
  onChange,
  usedColors = [],
}: {
  value: string | null;
  onChange: (hex: string) => void;
  usedColors?: string[];
}) {
  const used = useMemo(() => new Set(usedColors.map((c) => c.toLowerCase())), [usedColors]);

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2.25rem, 1fr))' }}>
      {AREA_PALETTE.map((swatch) => {
        const selected = value?.toLowerCase() === swatch.hex.toLowerCase();
        const inUse = !selected && used.has(swatch.hex.toLowerCase());
        return (
          <button
            key={swatch.hex}
            type="button"
            aria-label={inUse ? `${swatch.name} (in use)` : swatch.name}
            aria-pressed={selected}
            title={inUse ? `${swatch.name} — already used by another area` : swatch.name}
            onClick={() => onChange(swatch.hex)}
            className="relative aspect-square w-full rounded-full transition-transform active:scale-95"
            style={{
              backgroundColor: swatch.hex,
              boxShadow: selected ? `0 0 0 2px var(--parchment-50), 0 0 0 4px ${swatch.hex}` : undefined,
            }}
          >
            {selected && (
              <svg className="absolute inset-0 m-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            {inUse && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2" style={{ backgroundColor: swatch.hex, borderColor: 'var(--parchment-50)' }} aria-hidden="true">
                <span className="absolute inset-0 m-auto h-1 w-1 rounded-full bg-white/90" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

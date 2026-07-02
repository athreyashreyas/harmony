import { useMemo } from 'react';
import { AREA_PALETTE, COLOR_FAMILIES } from '@harmony/shared';

// A themed colour picker laid out by hue family, so a person can pick a colour
// that clearly contrasts with the ones they already use (reach for a different
// family) instead of hunting through near-identical shades. Colours already in
// use by other areas are marked, so the wheel stays legibly varied.
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
  const byFamily = useMemo(
    () => COLOR_FAMILIES.map((family) => ({ family, swatches: AREA_PALETTE.filter((s) => s.family === family) })),
    [],
  );

  return (
    <div className="space-y-3">
      {byFamily.map(({ family, swatches }) => (
        <div key={family}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{family}</p>
          <div className="flex flex-wrap gap-2.5">
            {swatches.map((swatch) => {
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
                  className="relative h-9 w-9 rounded-full transition-transform active:scale-95"
                  style={{
                    backgroundColor: swatch.hex,
                    boxShadow: selected ? `0 0 0 2px var(--parchment-50), 0 0 0 4px ${swatch.hex}` : undefined,
                  }}
                >
                  {selected && (
                    <svg
                      className="absolute inset-0 m-auto"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {inUse && (
                    // A small ring dot marks a colour another area already wears.
                    <span
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2"
                      style={{ backgroundColor: swatch.hex, borderColor: 'var(--parchment-50)' }}
                      aria-hidden="true"
                    >
                      <span className="absolute inset-0 m-auto h-1 w-1 rounded-full bg-white/90" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Small colour helpers. Area accent colours are stored as hex; the UI often
// needs them at a soft opacity (chip fills, the watercolour wash, petal tracks).

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
}

// Flattens `hex` at `alpha` composited over `baseHex` into a solid hex. Used to
// tint the status bar to match the top of a watercolour wash (which is the
// accent colour at low opacity over the paper).
export function blendOver(hex: string, alpha: number, baseHex: string): string {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(baseHex);
  const r = fg.r * alpha + bg.r * (1 - alpha);
  const g = fg.g * alpha + bg.g * (1 - alpha);
  const b = fg.b * alpha + bg.b * (1 - alpha);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

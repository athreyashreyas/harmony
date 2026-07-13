// Habit weights within an area. Stored as plain relative numbers and read as
// `share = weight / totalWeight` in computeAreaActivity, so any positive set is
// valid. The editor, though, works in whole percentages that sum to exactly 100
// so a share can be tuned to the precise percent (down to 1%) rather than nudged
// in coarse relative steps. When one habit is dragged, the rest auto-adjust in
// proportion to keep the total at 100, each never dropping below 1%.

// Round real-valued targets to integers that sum to exactly `total`, each at
// least `min` (largest-remainder / Hare quota, so the rounding is fair and the
// sum is exact rather than drifting to 99 or 101).
function apportion(targets: number[], total: number, min: number): number[] {
  const n = targets.length;
  if (n === 0) return [];
  const extra = total - n * min; // spread this on top of the floor each gets
  if (extra <= 0) return targets.map(() => min);
  const sum = targets.reduce((a, b) => a + b, 0) || n;
  const raw = targets.map((t) => (Math.max(0, t) / sum) * extra);
  const floored = raw.map((r) => Math.floor(r));
  const leftover = extra - floored.reduce((a, b) => a + b, 0);
  // Hand the leftover units to the largest fractional remainders.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const add = new Array(n).fill(0);
  for (let k = 0; k < leftover && k < n; k++) add[order[k].i] = 1;
  return floored.map((f, i) => min + f + add[i]);
}

// Convert any stored weights (relative, e.g. legacy 1..10) into whole
// percentages that sum to 100, preserving their proportions. Seeds the editor so
// the sliders always start from a clean, exact split.
export function normalizeToPercents(
  raw: Record<string, number>,
  ids: string[],
): Record<string, number> {
  if (ids.length === 0) return {};
  if (ids.length === 1) return { [ids[0]]: 100 };
  const pcts = apportion(
    ids.map((id) => raw[id] ?? 1),
    100,
    1,
  );
  const out: Record<string, number> = {};
  ids.forEach((id, i) => (out[id] = pcts[i]));
  return out;
}

// Set `changedId` to `rawValue` percent and re-apportion the rest in proportion
// to their current shares, so every habit stays at least 1% and the whole set
// sums to 100. The dragged habit is pinned to (a clamped) exact value; the
// others float to make room.
export function redistributePercents(
  pcts: Record<string, number>,
  ids: string[],
  changedId: string,
  rawValue: number,
): Record<string, number> {
  if (ids.length === 0) return {};
  if (ids.length === 1) return { [ids[0]]: 100 };

  const others = ids.filter((id) => id !== changedId);
  // The dragged habit can rise until the others would fall below 1% each.
  const maxForChanged = 100 - others.length;
  const value = Math.max(1, Math.min(maxForChanged, Math.round(rawValue)));
  const remaining = 100 - value;

  const apportioned = apportion(
    others.map((id) => pcts[id] ?? 1),
    remaining,
    1,
  );
  const out: Record<string, number> = { [changedId]: value };
  others.forEach((id, i) => (out[id] = apportioned[i]));
  return out;
}

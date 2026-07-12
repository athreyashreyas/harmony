import { useEffect, useRef, type RefObject } from 'react';
import type { Area } from '@harmony/shared';
import { fireConfetti } from './confetti';
import { decideCelebrations, isWholeBloom, type CelebrationRecord } from './celebration';

// What kind of moment this was, so Home can word it and time it right.
export interface CelebrationMeta {
  // The person's very first section ever to reach full bloom.
  firstEver: boolean;
  // Every section full at once — the whole wheel in bloom.
  allBloom: boolean;
}

// A short, gentle buzz on devices that support it (Android; iOS Safari has no
// Vibration API and simply no-ops). Kept in step with the confetti — the hook
// only calls this when celebrations are enabled.
function celebrateHaptics(grand: boolean): void {
  try {
    navigator.vibrate?.(grand ? [20, 40, 30] : 15);
  } catch {
    // ignore — vibration is a nicety, never load-bearing
  }
}

// When a Bloom section reaches full bloom, set off a confetti burst tinted to
// that section's colour and hand the celebrated areas back so Home can show a
// congratulatory note. Watches the live per-area fill (`activities`, aligned to
// `areas`) and fires only on a genuine crossing into full — see decideCelebrations.
//
// The "last celebrated" bookkeeping lives in localStorage, per account, rather
// than on the synced settings row: it changes each time a section fills, and
// mirroring that up would add write traffic for something that only needs to be
// remembered on this device. The cost is that each device celebrates a given
// achievement once of its own — which reads fine, even nice.

const STORAGE_PREFIX = 'harmony.celebrations.';

function loadRecords(userId: string): CelebrationRecord {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as CelebrationRecord;
  } catch {
    // ignore malformed / unavailable storage
  }
  return {};
}

function saveRecords(userId: string, records: CelebrationRecord): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(records));
  } catch {
    // ignore quota / unavailable storage
  }
}

// Normalised viewport centre of an element, so confetti bursts from the Bloom
// itself. Falls back to the launcher's default when we can't measure it.
function originFrom(ref: RefObject<HTMLElement>): { x: number; y: number } | undefined {
  const el = ref.current;
  if (!el || typeof window === 'undefined') return undefined;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return undefined;
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}

export function useCelebrations({
  userId,
  areas,
  activities,
  enabled,
  originRef,
  onCelebrate,
}: {
  userId: string | undefined;
  areas: Area[];
  activities: number[];
  enabled: boolean;
  originRef: RefObject<HTMLElement>;
  onCelebrate: (areas: Area[], meta: CelebrationMeta) => void;
}): void {
  // Previous per-area fill, so we can spot a crossing. `null` until the first
  // real snapshot, which we seed without firing (so opening on a full bloom is
  // calm). Records mirror localStorage in memory to avoid re-reading each tick.
  const prev = useRef<Map<string, number> | null>(null);
  const records = useRef<CelebrationRecord>({});

  // Keep the latest callback without making it a hook dependency, so a fresh
  // closure from Home each render doesn't re-run the watch effect.
  const onCelebrateRef = useRef(onCelebrate);
  onCelebrateRef.current = onCelebrate;

  // Reset all bookkeeping when the account changes (e.g. sign out / sign in).
  useEffect(() => {
    prev.current = null;
    records.current = userId ? loadRecords(userId) : {};
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Fill keyed by area id — ids are stable across edits/reorders, the index isn't.
    const current = new Map<string, number>();
    areas.forEach((a, i) => current.set(a.id, activities[i] ?? 0));

    // First snapshot (or just after an account switch): seed and never fire.
    if (prev.current === null) {
      prev.current = current;
      return;
    }

    // When off, keep `prev` current so turning it back on later doesn't treat an
    // already-full section as a fresh crossing.
    if (!enabled) {
      prev.current = current;
      return;
    }

    // Their very first bloom ever is a milestone: true only when nothing has
    // been celebrated before this tick.
    const firstEver = Object.keys(records.current).length === 0;

    const { celebrate, records: nextRecords } = decideCelebrations({
      prev: prev.current,
      current,
      records: records.current,
      now: Date.now(),
    });
    prev.current = current;
    if (celebrate.length === 0) return;

    records.current = nextRecords;
    saveRecords(userId, nextRecords);

    const celebrated = celebrate
      .map((id) => areas.find((a) => a.id === id))
      .filter((a): a is Area => a != null);
    if (celebrated.length === 0) return;

    // A whole-Bloom moment: this celebration completed the set, every section
    // full at once. It gets the grand shower, in the colours of the whole wheel.
    const allBloom = isWholeBloom(current);
    const colors = allBloom ? areas.map((a) => a.color) : celebrated.map((a) => a.color);

    fireConfetti({ colors, origin: originFrom(originRef), grand: allBloom });
    celebrateHaptics(allBloom);
    onCelebrateRef.current(celebrated, { firstEver, allBloom });
    // originRef is a stable ref; onCelebrate is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, areas, activities, enabled]);
}

// "What's new" is shown once when the account first meets a newer app version.
// The seen-marker is tracked two ways, and a release is shown only when it is
// newer than BOTH:
//   - a synced value on the settings row (so seeing it on one device suppresses
//     it on the others), read/written by AuthGate;
//   - this per-device localStorage value, which a Supabase pull can never clobber
//     (the synced value can briefly reset to its pre-sync state when a pull lands
//     before the write propagates, which would otherwise re-trigger the pop-up).
// Together they give "once per account, and never repeated on a device".

const KEY = 'harmony.lastSeenVersion';

export function getSeenVersionLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSeenVersionLocal(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

// True if `a` ("x.y.z") is a strictly newer version than `b`. A null/empty `b`
// counts as older than anything, so a first-ever run is treated as new.
export function isNewerVersion(a: string, b: string | null): boolean {
  if (!b) return true;
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

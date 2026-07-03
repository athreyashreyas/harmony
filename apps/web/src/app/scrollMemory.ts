// Scroll restoration for the single shell scroller. The habit detail screen
// renders outside the shell, so returning home remounts the shell with a fresh
// scroller at the top. We remember each route's last scroll offset (module-level,
// so it survives that unmount) and restore it when the user comes back via a
// back gesture (a history POP) — landing them exactly where they left. A tap on
// the top-left back arrow instead asks for the top explicitly (see forceTop),
// because that reads as a deliberate "take me home", not a reflexive swipe.

const positions = new Map<string, number>();
let forceTop = false;

export function saveScroll(key: string, top: number): void {
  positions.set(key, top);
}

export function getScroll(key: string): number {
  return positions.get(key) ?? 0;
}

// The back arrow calls this just before navigating, so the next shell mount
// scrolls to the top rather than restoring the remembered offset.
export function requestScrollTop(): void {
  forceTop = true;
}

// Returns whether a "scroll to top" was requested, and clears the request on a
// microtask — so React StrictMode's double-invoked mount effects (dev) both see
// it, while it never leaks to a later, unrelated navigation.
export function takeForceTop(): boolean {
  if (!forceTop) return false;
  queueMicrotask(() => {
    forceTop = false;
  });
  return true;
}

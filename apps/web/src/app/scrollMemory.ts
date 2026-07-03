// The habit detail now renders as an overlay above the tab (see AppRoutes), so
// the tab underneath stays mounted and keeps its scroll naturally across a habit
// open/close — no per-route offset bookkeeping needed. All that remains is the
// one deliberate exception: tapping the top-left back arrow on a habit should
// land Home at the top, not where it was. Since the shell (and its scroller) is
// still mounted beneath the overlay, the arrow just scrolls it to the top
// imperatively, then navigates back to reveal it there.

let scrollerEl: HTMLElement | null = null;

// The Shell registers its live scroller so the arrow can reach it from the
// overlay without threading refs through the router.
export function registerScroller(el: HTMLElement | null): void {
  scrollerEl = el;
}

export function scrollShellToTop(): void {
  scrollerEl?.scrollTo({ top: 0 });
}

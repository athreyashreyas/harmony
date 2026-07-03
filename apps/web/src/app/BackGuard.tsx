import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Neutralises the browser Back gesture (edge-swipe) and Back button, so the app
// is navigated only through its own controls — the bottom nav, the arrows, the
// buttons — never a reflexive swipe. `replace`-only navigation isn't enough: the
// browser can still pop past the app's first entry (a blank previous page) or
// through any entry the gesture reaches.
//
// Technique: keep a duplicate "trap" history entry on top at all times. A back
// gesture lands on the trap, whose URL is identical to the current one, so the
// visible view never changes — then we immediately re-arm the trap so the next
// back is absorbed too. The trap is also re-armed after every in-app navigation,
// so it's always the topmost entry. We duplicate react-router's own history
// state into the trap (rather than null) so react-router's internal bookkeeping
// stays consistent and route state (e.g. a habit overlay's backgroundLocation)
// is never lost. The one place that used history-back — the habit screen's
// arrow — navigates forward instead.
//
// Scoped to touch devices (coarse pointer): the reflexive edge-swipe only exists
// there. On desktop the Back button is a deliberate, expected control, so it's
// left working normally.
const isTouch = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export default function BackGuard() {
  const location = useLocation();

  // Re-arm the trap on top of whatever entry react-router just created, on mount
  // and after every navigation.
  useEffect(() => {
    if (!isTouch()) return;
    window.history.pushState(window.history.state, '', window.location.href);
  }, [location.key]);

  // Absorb every back press: it pops our trap (URL unchanged, so no visible
  // navigation), and we re-arm immediately so the next one is caught as well.
  useEffect(() => {
    if (!isTouch()) return;
    const onPopState = () => {
      window.history.pushState(window.history.state, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return null;
}

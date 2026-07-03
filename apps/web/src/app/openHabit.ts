import { useCallback } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';

// Opens a habit's detail as an overlay above the current tab. It passes the
// current location as `backgroundLocation`, which the router uses to keep the
// tab (Home / Areas / Insights) mounted underneath and render the habit on top.
// A back gesture then simply removes the overlay, revealing the screen exactly
// as it was — same scroll, same cards, no remount, no reload, no flash. This is
// how a native push/pop nav stack behaves.
export function useOpenHabit() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (habitId: string, opts?: { replace?: boolean }) => {
      // On a habit→habit jump (a neighbour chip), keep the original background so
      // back still returns to the tab the journey started from, not the last
      // habit visited.
      const backgroundLocation =
        (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation ?? location;
      navigate(`/habit/${habitId}`, { replace: opts?.replace, state: { backgroundLocation } });
    },
    [navigate, location],
  );
}

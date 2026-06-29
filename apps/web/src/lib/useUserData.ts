import { useEffect } from 'react';
import { useAreas } from '../store/useAreas';
import { useHabits } from '../store/useHabits';
import { useLogs } from '../store/useLogs';
import { useUser } from '../store/useUser';

// Loads the three core collections (areas, habits, the trailing log window) for
// the signed-in user and reports when they have all settled. Every main screen
// needs exactly this, so it lives here once instead of being re-spelled (and
// drifting) in each screen's effect.
//
// `reload*` are the stores' load actions, exposed for screens that mutate and
// want to refresh a collection (e.g. after creating a habit).
export function useUserData() {
  const profile = useUser((s) => s.profile);

  const areas = useAreas((s) => s.areas);
  const reloadAreas = useAreas((s) => s.load);
  const areasLoadedFor = useAreas((s) => s.loadedFor);

  const habits = useHabits((s) => s.habits);
  const reloadHabits = useHabits((s) => s.load);
  const habitsLoadedFor = useHabits((s) => s.loadedFor);

  const logs = useLogs((s) => s.logs);
  const reloadLogs = useLogs((s) => s.load);
  const logsLoadedFor = useLogs((s) => s.loadedFor);

  useEffect(() => {
    if (!profile) return;
    void reloadAreas(profile.id);
    void reloadHabits(profile.id);
    void reloadLogs(profile.id);
  }, [profile, reloadAreas, reloadHabits, reloadLogs]);

  const loaded = Boolean(
    profile &&
      areasLoadedFor === profile.id &&
      habitsLoadedFor === profile.id &&
      logsLoadedFor === profile.id,
  );

  return { profile, areas, habits, logs, loaded, reloadAreas, reloadHabits, reloadLogs };
}

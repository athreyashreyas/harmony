import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cadence, Importance, TimeOfDay } from '@harmony/shared';
import type { DraftArea, DraftHabits } from './onboardingTypes';

interface OnboardingContextValue {
  areas: DraftArea[];
  habits: DraftHabits;
  toggleSuggested: (name: string, color: string) => void;
  addCustomArea: (name: string, color: string) => void;
  removeArea: (id: string) => void;
  isSelected: (name: string) => boolean;
  setWhy: (areaId: string, text: string) => void;
  setImportance: (areaId: string, importance: Importance) => void;
  setHabitName: (areaId: string, name: string) => void;
  setHabitCadence: (areaId: string, cadence: Cadence) => void;
  setHabitTimeOfDay: (areaId: string, timeOfDay: TimeOfDay) => void;
  clearDraft: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const DEFAULT_CADENCE: Cadence = { kind: 'times-per-week', times: 3 };
const DEFAULT_TIME: TimeOfDay = 'anytime';
const DRAFT_KEY = 'harmony.onboardingDraft';

function newId(): string {
  return crypto.randomUUID();
}

// The draft lives in localStorage as well as memory so a reload from any cause
// (a service worker update, an accidental refresh, the OS reclaiming the tab)
// never loses a half-finished onboarding.
function loadDraft(): { areas: DraftArea[]; habits: DraftHabits } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { areas?: DraftArea[]; habits?: DraftHabits };
      return { areas: parsed.areas ?? [], habits: parsed.habits ?? {} };
    }
  } catch {
    // Corrupt or unavailable storage just means we start fresh.
  }
  return { areas: [], habits: {} };
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Lazy initializers so the draft is read from storage once, on mount.
  const [areas, setAreas] = useState<DraftArea[]>(() => loadDraft().areas);
  const [habits, setHabits] = useState<DraftHabits>(() => loadDraft().habits);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ areas, habits }));
    } catch {
      // Best effort: persistence is a safety net, not a hard requirement.
    }
  }, [areas, habits]);

  const value = useMemo<OnboardingContextValue>(() => {
    function ensureHabit(prev: DraftHabits, areaId: string) {
      return prev[areaId] ?? { name: '', cadence: DEFAULT_CADENCE, timeOfDay: DEFAULT_TIME };
    }

    return {
      areas,
      habits,
      isSelected: (name) => areas.some((a) => a.name.toLowerCase() === name.toLowerCase()),
      toggleSuggested: (name, color) =>
        setAreas((prev) => {
          const existing = prev.find((a) => a.name.toLowerCase() === name.toLowerCase());
          if (existing) return prev.filter((a) => a.id !== existing.id);
          return [
            ...prev,
            { id: newId(), name, color, isCustom: false, importance: 'matters', whySentence: '' },
          ];
        }),
      addCustomArea: (name, color) =>
        setAreas((prev) => [
          ...prev,
          { id: newId(), name, color, isCustom: true, importance: 'matters', whySentence: '' },
        ]),
      removeArea: (id) => setAreas((prev) => prev.filter((a) => a.id !== id)),
      setWhy: (areaId, text) =>
        setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, whySentence: text } : a))),
      setImportance: (areaId, importance) =>
        setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, importance } : a))),
      setHabitName: (areaId, name) =>
        setHabits((prev) => ({ ...prev, [areaId]: { ...ensureHabit(prev, areaId), name } })),
      setHabitCadence: (areaId, cadence) =>
        setHabits((prev) => ({ ...prev, [areaId]: { ...ensureHabit(prev, areaId), cadence } })),
      setHabitTimeOfDay: (areaId, timeOfDay) =>
        setHabits((prev) => ({ ...prev, [areaId]: { ...ensureHabit(prev, areaId), timeOfDay } })),
      clearDraft: () => {
        setAreas([]);
        setHabits({});
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
      },
    };
  }, [areas, habits]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

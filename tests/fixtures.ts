import type { Area, Cadence, Habit, Log } from '@harmony/shared';

// Minimal builders so each test states only the fields it cares about. Defaults
// are deliberately boring (a daily tend habit, a "matters" area) so overrides
// read as the thing under test.

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function makeArea(over: Partial<Area> = {}): Area {
  return {
    id: over.id ?? nextId('area'),
    userId: 'user-1',
    name: 'Body',
    color: '#9E343C',
    importance: 'matters',
    whySentence: 'It keeps me steady.',
    order: 0,
    createdAt: Date.parse('2026-01-01T00:00:00Z'),
    archivedAt: null,
    ...over,
  };
}

export function makeHabit(over: Partial<Habit> = {}): Habit {
  const cadence: Cadence = over.cadence ?? { kind: 'daily' };
  return {
    id: over.id ?? nextId('habit'),
    userId: 'user-1',
    areaId: 'area-1',
    name: 'Walk',
    cadence,
    timeOfDay: 'anytime',
    reminderTime: null,
    startDate: '2026-01-01',
    endDate: null,
    order: 0,
    createdAt: Date.parse('2026-01-01T00:00:00Z'),
    archivedAt: null,
    polarity: 'tend',
    ...over,
  };
}

export function makeLog(over: Partial<Log> = {}): Log {
  return {
    id: over.id ?? nextId('log'),
    userId: 'user-1',
    habitId: 'habit-1',
    areaId: 'area-1',
    date: '2026-01-01',
    loggedAt: Date.parse('2026-01-01T09:00:00Z'),
    note: null,
    ...over,
  };
}

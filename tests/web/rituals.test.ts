import { describe, expect, it } from 'vitest';
import type { Ritual } from '@harmony/shared';
import { ritualHabits } from '../../apps/web/src/lib/rituals';
import { makeHabit } from '../fixtures';

describe('ritualHabits', () => {
  const a = makeHabit({ id: 'a', name: 'Stretch' });
  const b = makeHabit({ id: 'b', name: 'Journal' });
  const archived = makeHabit({ id: 'c', name: 'Old', archivedAt: Date.now() });

  it('returns the habits in the ritual order', () => {
    const ritual: Ritual = { id: 'r', name: 'Morning', habitIds: ['b', 'a'] };
    expect(ritualHabits(ritual, [a, b]).map((h) => h.id)).toEqual(['b', 'a']);
  });

  it('skips ids that no longer exist or are archived', () => {
    const ritual: Ritual = { id: 'r', name: 'Morning', habitIds: ['a', 'gone', 'c'] };
    expect(ritualHabits(ritual, [a, b, archived]).map((h) => h.id)).toEqual(['a']);
  });
});

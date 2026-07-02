import { describe, expect, it } from 'vitest';
import type { HabitDraft } from '../../apps/web/src/lib/domain';
import { createArea, createHabit } from '../../apps/web/src/lib/domain';
import type { AreaFields } from '../../apps/web/src/lib/domain';

const draft: HabitDraft = {
  areaId: 'area-1',
  name: 'Stretch',
  cadence: { kind: 'daily' },
  timeOfDay: 'morning',
  reminderTime: null,
  startDate: '2026-01-01',
  endDate: null,
};

describe('createHabit', () => {
  it('merges the draft and assigns ownership, order, and timestamps', () => {
    const h = createHabit(draft, { userId: 'user-9', order: 3, createdAt: 1234 });
    expect(h).toMatchObject({
      userId: 'user-9',
      order: 3,
      createdAt: 1234,
      archivedAt: null,
      name: 'Stretch',
      areaId: 'area-1',
      timeOfDay: 'morning',
      startDate: '2026-01-01',
    });
    expect(typeof h.id).toBe('string');
    expect(h.id.length).toBeGreaterThan(0);
  });

  it('defaults createdAt to now and mints a unique id each time', () => {
    const before = Date.now();
    const a = createHabit(draft, { userId: 'u', order: 0 });
    const b = createHabit(draft, { userId: 'u', order: 1 });
    expect(a.createdAt).toBeGreaterThanOrEqual(before);
    expect(a.id).not.toBe(b.id);
  });
});

describe('createArea', () => {
  const fields: AreaFields = {
    name: 'Mind',
    color: '#404780',
    importance: 'core',
    whySentence: 'Clear head.',
    driftSensitivity: 'default',
    reminderTimeOfDay: 'anytime',
  };

  it('mints an id when none is supplied', () => {
    const area = createArea(fields, { userId: 'u', order: 2 });
    expect(area).toMatchObject({ userId: 'u', order: 2, archivedAt: null, name: 'Mind', importance: 'core' });
    expect(typeof area.id).toBe('string');
  });

  it('honours an explicit id and createdAt (onboarding builds area + habits together)', () => {
    const area = createArea(fields, { userId: 'u', order: 0, id: 'fixed-id', createdAt: 999 });
    expect(area.id).toBe('fixed-id');
    expect(area.createdAt).toBe(999);
  });
});

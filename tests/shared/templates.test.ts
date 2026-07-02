import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@harmony/shared';
import { compose, getTemplate, isDriftTemplate, renderTemplate } from '@harmony/shared';
import { makeArea } from '../fixtures';

const profile: UserProfile = { id: 'u', firstName: 'Sam', onboardedAt: 1, timezone: 'UTC' };
const MORNING = new Date(2026, 0, 1, 8, 0);

describe('renderTemplate', () => {
  it('substitutes simple placeholders', () => {
    expect(renderTemplate('Hello {firstName}.', { firstName: 'Sam' })).toBe('Hello Sam.');
  });

  it('applies the titleCase modifier', () => {
    expect(renderTemplate('{timeOfDay.titleCase} could work.', { timeOfDay: 'tonight' })).toBe(
      'Tonight could work.',
    );
  });

  it('leaves unknown placeholders untouched', () => {
    expect(renderTemplate('Hi {mystery}', {})).toBe('Hi {mystery}');
  });

  it('tidies the space an empty value leaves before punctuation', () => {
    expect(renderTemplate('All done {extra}.', { extra: '' })).toBe('All done.');
  });

  it('collapses the gap an empty value leaves mid-sentence', () => {
    expect(renderTemplate('{weatherPhrase} {areaName} waited.', { weatherPhrase: '', areaName: 'Body' })).toBe(
      'Body waited.',
    );
  });
});

describe('compose', () => {
  it('returns a template of the requested type', () => {
    const out = compose({ type: 'celebration', context: { now: MORNING, profile, random: () => 0 } });
    expect(out).not.toBeNull();
    expect(getTemplate(out!.templateId)?.type).toBe('celebration');
  });

  it('is deterministic given a fixed random', () => {
    const ctx = { now: MORNING, profile, random: () => 0 };
    const a = compose({ type: 'celebration', context: ctx });
    const b = compose({ type: 'celebration', context: ctx });
    expect(a).toEqual(b);
    expect(a!.templateId).toBe('celebrate-tended');
    expect(a!.text).toBe('Tended.');
  });

  it('avoids a recently used template when an alternative exists', () => {
    // With no area, only the placeholder-free celebration lines are usable
    // (celebrate-tended, celebrate-nice). Excluding the first leaves the next.
    const out = compose({
      type: 'celebration',
      context: { now: MORNING, profile, random: () => 0, recentTemplateIds: ['celebrate-tended'] },
    });
    expect(out!.templateId).toBe('celebrate-nice');
    expect(out!.text).toBe('Nice, Sam.');
  });

  it('returns null when nothing is eligible (drift needs an area)', () => {
    expect(compose({ type: 'drift', context: { now: MORNING, profile, random: () => 0 } })).toBeNull();
  });

  it('fills a drift nudge from the area and days-since', () => {
    const area = makeArea({ name: 'Mind', whySentence: 'I want calm.' });
    const out = compose({
      type: 'drift',
      area,
      context: { now: MORNING, profile, daysSinceLastLog: 5, random: () => 0 },
    });
    expect(out!.templateId).toBe('drift-words-days');
    expect(out!.text).toBe('You wrote: "I want calm." It\'s been 5 days. Maybe this morning.');
  });
});

describe('getTemplate / isDriftTemplate', () => {
  it('looks templates up by id', () => {
    expect(getTemplate('drift-words-days')?.type).toBe('drift');
    expect(getTemplate('not-a-real-id')).toBeUndefined();
  });

  it('recognises drift templates only', () => {
    expect(isDriftTemplate('drift-words-days')).toBe(true);
    expect(isDriftTemplate('celebrate-tended')).toBe(false);
    expect(isDriftTemplate('habit-reminder')).toBe(false); // worker sentinel, not in library
  });
});

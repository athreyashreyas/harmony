import { describe, expect, it } from 'vitest';
import { APP_VERSION, CHANGELOG } from '../../apps/web/src/lib/changelog';
import {
  GUIDE,
  GUIDE_ESSENTIALS,
  GUIDE_MORE,
  type GuideArtKind,
} from '../../apps/web/src/lib/guide';
import { isNewerVersion } from '../../apps/web/src/lib/whatsNew';

/**
 * The changelog and the guide are hand-maintained lists carrying load: the
 * first release's version is the app's version, "What's new" is gated on it,
 * and both lists name their illustrations by string. Everything that goes
 * wrong with a list like this is silent at runtime and visible only in the
 * What's-new strip, which is a poor place to find out.
 */

// Every kind GuideArt can draw. The union is erased at runtime, so it is
// restated here and checked against both lists.
const ART_KINDS = new Set<GuideArtKind>([
  'bloom',
  'habit',
  'areas',
  'weights',
  'weightsfine',
  'tug',
  'log',
  'sync',
  'guide',
  'reminder',
  'logo',
  'themes',
  'sort',
  'insights',
  'palette',
  'garden',
  'ritual',
  'confetti',
  'message',
  'darkthemes',
]);

describe('APP_VERSION', () => {
  it('is the newest release, the single number there is to bump', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it('is a plain dotted version isNewerVersion can rank', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isNewerVersion(APP_VERSION, null)).toBe(true);
    expect(isNewerVersion(APP_VERSION, APP_VERSION)).toBe(false);
  });
});

describe('CHANGELOG', () => {
  it('is ordered newest first', () => {
    // What's new reads entry zero and gates on it, so an entry added at the
    // bottom would never reach anybody.
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(isNewerVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(true);
    }
  });

  it('has its dates running newest first too', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    }
  });

  it('lists each version once', () => {
    const versions = CHANGELOG.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('gives every release a version, an ISO date, a title and a note', () => {
    for (const r of CHANGELOG) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.date))).toBe(false);
      expect(r.title.trim().length).toBeGreaterThan(0);
      expect(r.notes.length).toBeGreaterThan(0);
      for (const note of r.notes) expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it('only asks for demonstrations GuideArt can actually draw', () => {
    for (const r of CHANGELOG) {
      for (const art of r.art ?? []) expect(ART_KINDS.has(art)).toBe(true);
    }
  });

  it('does not ask for the same demonstration twice in one release', () => {
    for (const r of CHANGELOG) {
      const art = r.art ?? [];
      expect(new Set(art).size).toBe(art.length);
    }
  });

  it('gives any how-to steps real text rather than empty bullets', () => {
    for (const r of CHANGELOG) {
      for (const step of r.howTo ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks the releases worth reading as major', () => {
    // Every entry so far has earned it; the flag exists so a fix release can
    // stay quiet, not because one has yet.
    expect(CHANGELOG.some((r) => r.major)).toBe(true);
    for (const r of CHANGELOG) {
      if (r.major !== undefined) expect(typeof r.major).toBe('boolean');
    }
  });
});

describe('GUIDE', () => {
  it('gives every section an id, a title and a body', () => {
    for (const s of GUIDE) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      for (const para of s.body) expect(para.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses each section id once, since the guide navigates by it', () => {
    const ids = GUIDE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only asks for illustrations GuideArt can actually draw', () => {
    for (const s of GUIDE) {
      if (s.art) expect(ART_KINDS.has(s.art)).toBe(true);
    }
  });

  it('gives any steps real text', () => {
    for (const s of GUIDE) {
      for (const step of s.steps ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the opening read short, however many features land later', () => {
    // This screen is shown the moment onboarding ends, before anybody has
    // tended a habit. It is worth reading only while it is short, so a new
    // feature is folded away rather than added to what everyone scrolls past.
    expect(GUIDE_ESSENTIALS.length).toBeLessThanOrEqual(5);
    expect(GUIDE_ESSENTIALS.length).toBeGreaterThan(0);
    // And the opening read comes first, since the screen renders it that way.
    expect(GUIDE.slice(0, GUIDE_ESSENTIALS.length)).toEqual(GUIDE_ESSENTIALS);
  });

  it('gives every folded section a summary, which is all a reader sees of it', () => {
    for (const s of GUIDE_MORE) {
      expect(s.summary?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('holds each section to a length somebody will actually read', () => {
    // Two paragraphs and three steps. A section that wants more is usually a
    // screen that should be explaining itself better.
    for (const s of GUIDE) {
      expect(s.body.length).toBeLessThanOrEqual(2);
      expect(s.steps?.length ?? 0).toBeLessThanOrEqual(3);
    }
  });

  it('leaves no illustration unused, so the catalogue and the guide stay in step', () => {
    // A kind nothing reaches is either a section that was dropped or an
    // illustration that was drawn and never wired up.
    const used = new Set<GuideArtKind>();
    for (const s of GUIDE) if (s.art) used.add(s.art);
    for (const r of CHANGELOG) for (const a of r.art ?? []) used.add(a);
    expect([...ART_KINDS].filter((k) => !used.has(k))).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { staleIds } from '../../apps/web/src/lib/sync/reconcile';

// The authoritative-pull deletion decision: a local row is stale only if the
// server no longer has it AND it was written before the grace cutoff (so a
// just-made local write that hasn't mirrored up yet is never deleted).
const NOW = 1_000_000;
const CUTOFF = NOW - 2 * 60_000; // 2-minute grace, like RECONCILE_GRACE_MS
const at = (id: string, writtenAt: number) => ({ id, writtenAt });
const w = (r: { writtenAt: number }) => r.writtenAt;

describe('staleIds', () => {
  it('deletes a local row the server dropped, once it is past the grace window', () => {
    const local = [at('a', CUTOFF - 1)];
    expect(staleIds(local, new Set(), CUTOFF, w)).toEqual(['a']);
  });

  it('keeps a row the server still has', () => {
    const local = [at('a', CUTOFF - 1)];
    expect(staleIds(local, new Set(['a']), CUTOFF, w)).toEqual([]);
  });

  it('keeps a recently-written row absent from the server (grace shields it)', () => {
    const local = [at('fresh', NOW)]; // written after the cutoff
    expect(staleIds(local, new Set(), CUTOFF, w)).toEqual([]);
  });

  it('handles a mix and an empty local set', () => {
    const local = [at('old-gone', CUTOFF - 5), at('kept', CUTOFF - 5), at('new-gone', NOW)];
    expect(staleIds(local, new Set(['kept']), CUTOFF, w)).toEqual(['old-gone']);
    expect(staleIds([], new Set(), CUTOFF, w)).toEqual([]);
  });
});

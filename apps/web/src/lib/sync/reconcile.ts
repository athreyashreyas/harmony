// Pure reconcile helpers, extracted from the Supabase sync layer so the
// data-loss-sensitive logic can be unit-tested without Dexie or the network.
//
// The authoritative pull is "server wins": after fetching the server's rows we
// delete local rows the server no longer has. Two guards make that safe:
//   - a grace window, so a just-made local write (not yet mirrored up) is never
//     reconciled away;
//   - for logs, a scope window, so only recently-relevant local rows are ever
//     candidates for deletion (older history, pulled once at first sign-in, is
//     never touched by an incremental pull).

export interface Reconcilable {
  id: string;
}

// The ids of local rows that should be deleted: present locally, absent on the
// server, and older than the grace cutoff (so recent, unmirrored writes stay).
export function staleIds<T extends Reconcilable>(
  local: T[],
  serverIds: Set<string>,
  cutoff: number,
  writtenAt: (row: T) => number,
): string[] {
  return local.filter((r) => !serverIds.has(r.id) && writtenAt(r) < cutoff).map((r) => r.id);
}

// --- Incremental ("watermark") sync -----------------------------------------
// The extensible channel. Any entity with an `updated_at` (bumped on every
// write) and a soft-delete `deleted_at` can sync incrementally: a device pulls
// only rows changed since its stored watermark, applies inserts/edits and
// deletions, then advances the watermark to the newest change it saw. This
// catches everything missed while offline, of any age, immediately on reconnect
// — and stays cheap. New edge cases join by adopting the same two columns.

// A server row carrying the incremental-sync bookkeeping columns.
export interface Timestamped {
  updated_at: string; // ISO; monotonic per row
  deleted_at: string | null; // ISO when soft-deleted, else null
}

// The newest ISO timestamp among `current` and the given values (ISO strings
// sort lexicographically), or `current` if none is newer. Used to advance the
// watermark to the latest change applied.
export function latestTimestamp(current: string | null, isos: (string | null | undefined)[]): string | null {
  let max = current;
  for (const t of isos) if (t && (max == null || t > max)) max = t;
  return max;
}

// Split a batch of changed rows into the ones to upsert (live) and the ids to
// delete locally (tombstoned). Shared by every incremental entity.
export function partitionChanges<T extends Reconcilable & Timestamped>(rows: T[]): { upserts: T[]; deletedIds: string[] } {
  const upserts: T[] = [];
  const deletedIds: string[] = [];
  for (const r of rows) {
    if (r.deleted_at != null) deletedIds.push(r.id);
    else upserts.push(r);
  }
  return { upserts, deletedIds };
}

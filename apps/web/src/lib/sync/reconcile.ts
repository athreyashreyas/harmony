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

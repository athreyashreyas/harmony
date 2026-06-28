// Section 3 lists this as the worker's mirror of apps/web/src/lib/drift. As
// with templates.ts, the drift engine lives in @harmony/shared so web and
// worker share one byte-identical copy (section 16). This file is the import
// surface the worker uses.
export { detectDrift, daysSinceLastLog } from '@harmony/shared';
export type { DriftCandidate } from '@harmony/shared';

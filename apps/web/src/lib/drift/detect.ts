// Drift detection now lives in @harmony/shared so the web app and the push
// worker share one byte-identical copy (section 16). This file stays as the
// import path the rest of the web app already uses.
export { detectDrift, daysSinceLastLog } from '@harmony/shared';
export type { DriftCandidate } from '@harmony/shared';

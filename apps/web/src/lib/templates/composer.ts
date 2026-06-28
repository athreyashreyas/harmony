// The composer now lives in @harmony/shared so the web app and the push worker
// share one byte-identical copy (section 15.2). This file stays as the import
// path the rest of the web app already uses.
export { compose, renderTemplate } from '@harmony/shared';
export type { ComposeInput, ComposeContext } from '@harmony/shared';

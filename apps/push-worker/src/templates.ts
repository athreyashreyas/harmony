// Section 3 lists this as the worker's mirror of apps/web/src/lib/templates.
// Rather than copy the code (which would drift), the template library and
// composer were hoisted into @harmony/shared in Phase 11, so both the web app
// and this worker import the one byte-identical copy. This file is the import
// surface the worker uses.
export { compose, renderTemplate, getTemplate, isDriftTemplate, TEMPLATES } from '@harmony/shared';
export type { ComposeInput, ComposeContext } from '@harmony/shared';

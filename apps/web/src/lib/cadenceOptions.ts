import type { Cadence, TimeOfDay } from '@harmony/shared';

// A small set of frequencies offered in habit creation and edit sheets. The
// full cadence model (section 6.1) supports specific days and every-n-days
// too, but no screen in the spec asks for editing those directly, so the
// picker stays to this short list. Default is a few times a week.
export interface CadenceOption {
  label: string;
  value: Cadence;
}

export const CADENCE_OPTIONS: CadenceOption[] = [
  { label: 'A few times a week', value: { kind: 'times-per-week', times: 3 } },
  { label: 'Every day', value: { kind: 'daily' } },
  { label: 'Weekdays', value: { kind: 'weekdays' } },
  { label: 'Weekends', value: { kind: 'weekends' } },
  { label: 'Once a week', value: { kind: 'times-per-week', times: 1 } },
];

export function cadenceKey(c: Cadence): string {
  return c.kind === 'times-per-week' ? `times-per-week:${c.times}` : c.kind;
}

export const TIME_OF_DAY_OPTIONS: { label: string; value: TimeOfDay }[] = [
  { label: 'Anytime', value: 'anytime' },
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
];

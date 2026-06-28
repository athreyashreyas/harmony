// Template type definitions, verbatim from section 15 of the spec.

export type TemplateType =
  | 'drift' // an area has gone quiet
  | 'time-of-day-reminder' // scheduled reminder for a habit
  | 'celebration' // in-app toast after logging
  | 'weekly-recap-sentence' // building blocks for the Sunday recap
  | 'morning-greeting' // the small line under the Bloom
  | 'install-nudge'; // gentle prompt to add to home screen

export interface Template {
  id: string;
  type: TemplateType;
  weight?: number; // bias selection
  conditions?: TemplateCondition[];
  body: string; // contains {placeholders}
}

export interface TemplateCondition {
  // any of these may be set; all set conditions must match
  timeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  dayOfWeek?: number[]; // 0-6
  weather?: ('sunny' | 'rainy' | 'cold' | 'hot')[];
  minDaysSince?: number;
  maxDaysSince?: number;
  importance?: ('core' | 'matters' | 'optional')[];
}

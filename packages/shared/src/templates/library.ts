import type { Template } from '../templateTypes';

// The template library (section 15). Bodies use backticks so the straight
// quotes and apostrophes inside read exactly as written, no escaping. The
// drift set is the twelve from section 15.1 verbatim, plus one daysSince-free
// fallback used when the area has only just gone quiet and for the onboarding
// live preview.
//
// This library is mirrored byte for byte into the push worker (section 15.2),
// so it stays plain data with no imports beyond the shared Template type.

export const TEMPLATES: Template[] = [
  // Drift: an area has gone quiet.
  {
    id: 'drift-words-days',
    type: 'drift',
    body: `You wrote: "{whySentence}" It's been {daysSince} days. Maybe {timeOfDay}.`,
  },
  {
    id: 'drift-quiet-days',
    type: 'drift',
    body: `{areaName} has been quiet for {daysSince} days. Your words from then: "{whySentence}"`,
  },
  {
    id: 'drift-since-said',
    type: 'drift',
    body: `{daysSince} days since you tended to {areaName}. You said: "{whySentence}"`,
  },
  {
    id: 'drift-remember',
    type: 'drift',
    body: `Remember writing "{whySentence}"? {timeOfDay.titleCase} could be the night.`,
  },
  {
    id: 'drift-small-return',
    type: 'drift',
    body: `A small return to {areaName}, {firstName}? It's been {daysSince} days. You wrote: "{whySentence}"`,
  },
  {
    id: 'drift-since-lastday',
    type: 'drift',
    body: `You haven't been to {areaName} since {lastDayPhrase}. "{whySentence}" was the reason you gave.`,
  },
  {
    id: 'drift-weather',
    type: 'drift',
    conditions: [{ weather: ['sunny', 'rainy', 'cold', 'hot'] }],
    body: `{weatherPhrase} {areaName} has been waiting {daysSince} days. "{whySentence}"`,
  },
  {
    id: 'drift-on-pause',
    type: 'drift',
    body: `Quietly, {areaName} has been on pause for {daysSince} days. "{whySentence}"`,
  },
  {
    id: 'drift-fortnight',
    type: 'drift',
    conditions: [{ minDaysSince: 10 }],
    body: `It's been almost a fortnight in {areaName}. Your words: "{whySentence}"`,
  },
  {
    id: 'drift-ten-minutes',
    type: 'drift',
    body: `{firstName}, you wrote "{whySentence}". It's been {daysSince} days. Even ten minutes counts.`,
  },
  {
    id: 'drift-called',
    type: 'drift',
    body: `{areaName} called. "{whySentence}" was what you said about it.`,
  },
  {
    id: 'drift-patient',
    type: 'drift',
    conditions: [{ minDaysSince: 8 }],
    body: `Eight days. Nine. {daysSince}. {areaName} is patient, but it's there. "{whySentence}"`,
  },
  {
    // daysSince-free fallback, also used for the onboarding live preview.
    id: 'drift-quiet-while',
    type: 'drift',
    weight: 0.5,
    body: `{areaName} has been quiet for a little while. You wrote: "{whySentence}"`,
  },

  // Morning greeting: the small line under the Bloom.
  { id: 'greet-gentle', type: 'morning-greeting', conditions: [{ timeOfDay: ['morning'] }], body: `A gentle morning, {firstName}.` },
  { id: 'greet-ease', type: 'morning-greeting', conditions: [{ timeOfDay: ['morning'] }], body: `Ease into the day, {firstName}.` },
  { id: 'greet-ready', type: 'morning-greeting', body: `Here when you're ready, {firstName}.` },

  // Time of day reminder: a scheduled nudge for one habit.
  { id: 'remind-q', type: 'time-of-day-reminder', body: `Time for {habitName}?` },
  { id: 'remind-ready', type: 'time-of-day-reminder', body: `{habitName}, when you're ready.` },
  { id: 'remind-moment', type: 'time-of-day-reminder', body: `A moment for {habitName}, {firstName}.` },

  // Celebration: a quiet in-app toast after logging.
  { id: 'celebrate-tended', type: 'celebration', body: `Tended.` },
  { id: 'celebrate-area', type: 'celebration', body: `That's {areaName} today.` },
  { id: 'celebrate-nice', type: 'celebration', body: `Nice, {firstName}.` },
  { id: 'celebrate-return', type: 'celebration', body: `A small return to {areaName}.` },

  // Weekly recap sentences: building blocks for the Sunday recap (section
  // 13.1, Phase 8). recap.ts selects these deterministically from real
  // weekly facts rather than through the random composer, so a few carry
  // extra placeholders (habitName, countPhrase, lastDayName, areaNames) that
  // recap.ts supplies directly.
  { id: 'recap-strong', type: 'weekly-recap-sentence', body: `Your {areaName} had a strong week. You tended to {habitName} {countPhrase}.` },
  { id: 'recap-steady', type: 'weekly-recap-sentence', body: `{areaName} was steady. You tended to {habitName} on {lastDayName}.` },
  { id: 'recap-quiet', type: 'weekly-recap-sentence', body: `{areaName} has been quiet for {daysSince} days. You wrote: "{whySentence}"` },
  { id: 'recap-nice-single', type: 'weekly-recap-sentence', body: `Nice to have areas can wait. {areaNames} is okay where it is.` },
  { id: 'recap-nice-multi', type: 'weekly-recap-sentence', body: `Nice to have areas can wait. {areaNames} are okay where they are.` },
  { id: 'recap-fresh', type: 'weekly-recap-sentence', body: `Sunday's a fresh week. No need to catch up.` },

  // Install nudge.
  { id: 'install-home', type: 'install-nudge', body: `Add Harmony to your home screen for gentle reminders.` },
  { id: 'install-notif', type: 'install-nudge', body: `Notifications live on the home screen. Add Harmony to turn them on.` },
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return BY_ID.get(id);
}

export function isDriftTemplate(id: string): boolean {
  return getTemplate(id)?.type === 'drift';
}

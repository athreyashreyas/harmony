export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  // Feature releases worth reading; minor and fix releases leave this off.
  major?: boolean;
}

// Release notes, newest first. The first entry's version is the single source
// of truth for the app's version (APP_VERSION below). Keep the tone warm and
// plain, the same voice as the rest of the app.
export const CHANGELOG: Release[] = [
  {
    version: '0.4.0',
    date: '2026-06-29',
    major: true,
    title: 'A warmer Harmony, and reminders that arrive on time',
    notes: [
      'A new warm look: terracotta on soft cream paper, with a touch larger type that reads easier.',
      'Give a habit its own time and Harmony will gently remind you to tend to it then.',
      'A quiet evening note rounds up anything still waiting that day, so nothing slips through.',
      'Colour-code habits with a wider palette, each one its own.',
      'Smoother scrolling, snappier motion, and the app now updates itself in the background.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-28',
    major: true,
    title: 'Reminders in your own words',
    notes: [
      'When an area you said mattered goes quiet, Harmony brings your own sentence back to you, on your home screen and as a notification.',
      'Settings to shape it all: how readily each area nudges you, quiet hours, and a switch per area.',
      'Turn on reminders for a device right from settings.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-28',
    major: true,
    title: 'A quiet record, and a weekly recap',
    notes: [
      'The Log: a calm month view of what you tended to, with a note for any day you left one.',
      'Insights: a Sunday recap written from your own week, area balance at a glance, and a gentle nudge or two on what to do next.',
      'Each habit now has its own page: a soft heatmap, your notes, and the patterns in how you show up.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-28',
    major: true,
    title: 'Welcome to Harmony',
    notes: [
      'Name the parts of life that matter to you, in your own words.',
      'Tend to small habits inside them, one tap to log.',
      'Watch your week as the Bloom: petals fill as you show up, and dim quietly when you do not. No streaks, no shame.',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

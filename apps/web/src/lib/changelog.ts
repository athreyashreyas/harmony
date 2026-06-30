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
    version: '0.8.0',
    date: '2026-06-30',
    major: true,
    title: 'Schedule anything, and a livelier home',
    notes: [
      'Far richer scheduling: alongside daily, weekdays, and certain days, you can now repeat every few weeks or every few months, which covers weekly, fortnightly, monthly, quarterly, and yearly.',
      'Tap an area on the home screen (or a petal on the Bloom) to filter the day to just that area; hold a petal to lift it out of the wheel with your own words.',
      'Open an area to reorder the habits inside it, the same way you order the areas themselves.',
      'A larger Bloom that takes its place at the centre, and a clearer status dot that no longer brushes against the cards.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-06-29',
    major: true,
    title: 'Reminders that actually arrive',
    notes: [
      'Notifications now work end to end and land within about a minute of the time you set, on every device you turn them on.',
      'Each device keeps its own reminders in order, and the app heals a device that looked on but had slipped off.',
      'Notification text reads cleanly now: just Harmony, then your message.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-06-29',
    major: true,
    title: 'Schedule habits your way, in kinder words',
    notes: [
      'Shape a habit exactly how it lives: certain days of the week, a number of times a week, or every few days, with a start date and an optional end.',
      'The nudges, observations, and little suggestions are warmer and more personal now, less like an app talking and more like someone who knows you.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-06-29',
    major: true,
    title: 'Your habits, in step across every device',
    notes: [
      'Sign in anywhere and everything is already there. Open Harmony on a new phone or tablet and your areas, habits, and history arrive on their own.',
      'Changes now sync the moment you make them, so your phone and your tablet stay in step without a refresh.',
      'Forgot your password? You can set a new one from the email link and get straight back in.',
      'A handful of small fixes: the greeting reads cleanly, the Me screen loads instantly, and tall sheets stay clear of the status bar while you type.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-06-29',
    major: true,
    title: 'A warmer Harmony, and reminders that arrive on time',
    notes: [
      'A new warm look: terracotta on soft cream paper, with a touch larger type that reads easier.',
      'Give a habit its own time and Harmony will gently remind you to tend to it then.',
      'A gentle evening note rounds up anything still waiting that day, so nothing slips through.',
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
      'When an area you said mattered slips, Harmony brings your own sentence back to you, on your home screen and as a notification.',
      'Settings to shape it all: how readily each area nudges you, do-not-disturb hours, and a switch per area.',
      'Turn on reminders for a device right from settings.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-28',
    major: true,
    title: 'A gentle record, and a weekly recap',
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
      'Watch your week as the Bloom: petals fill as you show up, and ease back when you do not. No streaks, no shame.',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

import type { GuideArtKind } from './guide';

export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  // Feature releases worth reading; minor and fix releases leave this off.
  major?: boolean;
  // Terse, followable steps for finding and using what the release brought,
  // written for how the app navigates today (not how it did at the time), so
  // older entries never point at artefacts that have since been renamed.
  howTo?: string[];
  // Optional little demonstrations, shown under the release when its card is
  // open, so "What's new" can show how to use a feature, not only describe it.
  art?: GuideArtKind[];
}

// Release notes, newest first. The first entry's version is the single source
// of truth for the app's version (APP_VERSION below). Keep the tone warm and
// plain, the same voice as the rest of the app.
export const CHANGELOG: Release[] = [
  {
    version: '1.3.0',
    date: '2026-07-12',
    major: true,
    title: 'A moment of confetti',
    notes: [
      'When an area of your Bloom reaches full bloom, a little confetti lifts off it, in that area\'s own colour, with a warm word to mark your consistency.',
      'It stays a treat, not a habit: once an area is full it rests quietly through a steady streak, and the confetti only returns when you earn full bloom afresh after a while away. Each area celebrates on its own.',
      'Some moments are bigger. Your very first full bloom is marked as the milestone it is, and when your whole Bloom comes into flower at once, the whole screen celebrates with you.',
      'Prefer things calm? Turn the confetti off any time under Me, in Celebrations. The Bloom fills just the same, quietly.',
      'And a finer touch for your areas: the habit weight sliders now move a percent at a time, so you can set each habit\'s exact share of the bloom, right down to 1%. Slide one and the others gently rebalance on their own to keep the total at 100.',
      'A safer goodbye, too: deleting your account now asks you to type the word first, so it can never happen from an accidental tap.',
    ],
    howTo: [
      'Tend an area until every petal is full to see it celebrated.',
      'Open Me and find Celebrations to turn the confetti off or back on.',
      'To weight habits, open an area with two or more habits, tap the pencil, and slide any habit to its exact percent.',
    ],
    art: ['confetti', 'weightsfine'],
  },
  {
    version: '1.2.0',
    date: '2026-07-02',
    major: true,
    title: 'Rituals and the Bloom garden',
    notes: [
      'Rituals: gather a few habits into a flow and move through them together, tap by tap, like a calm morning routine. Build one under Rituals on Home, then tap Begin. They sync across your devices.',
      'A new Garden in Insights: every week of your life, pressed and kept as its own little bloom. Scroll back through the seasons and watch your weeks flower and rest.',
      'The Garden is drawn live from what you have done, so nothing extra is stored and it stays true to your history, for years.',
      'Three new lights, too: a dreamy Lavender and a tender Rose Quartz by day, and two warm-and-restful darks after hours, Espresso and Forest Night. Eight themes in all.',
    ],
    howTo: [
      'On Home, under Rituals, tap New to build a flow, then Begin to move through it step by step.',
      'Open Insights and tap Garden at the top; scroll the weeks and tap any bloom.',
      'Open Me, then Appearance, to try any of the eight themes.',
    ],
    art: ['ritual', 'garden', 'themes'],
  },
  {
    version: '1.1.0',
    date: '2026-07-02',
    major: true,
    title: 'Insights, reimagined',
    notes: [
      'Insights is reborn as a one-stop picture of how you are living. Pick a range (week, month, year, or all time), or focus on a single area, and everything reshapes around it.',
      'Momentum over time, a calendar of every day you showed up, your busiest days and times, a balance constellation of your whole life, per-habit rhythms, and the honest lift and drag of your tugs. Real numbers, always framed around showing up, never streaks to break.',
      'It closes with a warm reflection, written from your own week, to leave you seen and encouraged.',
      'A fuller, clearer palette with more distinct colours, and the picker now marks the ones already in use, so your bloom stays easy to tell apart.',
      "Reminders, dates, and times now use Harmony's own gentle pickers instead of the system's, so every choice feels part of the app.",
      "Little touches: your Home list glides into order when you log something, and the 'Remind me at' time is easier to find and set.",
    ],
    howTo: [
      'Open Insights and tap Week, Month, Year, or All to rescope everything at once.',
      'Tap an area chip to focus the whole page on it; tap any habit to open its rhythm.',
      'Read to the end for a warm reflection written from your own week.',
      "Adding or editing a habit? Set the time and dates with Harmony's own pickers, and choose a colour by family so it stands apart.",
    ],
    art: ['insights', 'palette'],
  },
  {
    version: '1.0.0',
    date: '2026-07-01',
    major: true,
    title: 'Harmony 1.0',
    notes: [
      'The full release: your areas and the living Bloom, tends and tugs, the Log, weekly insights, reminders, five themes, and sync across every device.',
      'Hold an area under the Bloom to edit it on the spot; a quick tap still focuses your day on it.',
      'Tugs now have their own page like habits: tap the circle to note one, tap the row to open its history and edit it.',
      'Sort your Home list by time of day (the default, with anytime habits last), by priority, or by what is still to do.',
      'A calmer open, with one gentle loading screen and no flicker; What is new greets you just once per update across your devices, then steps aside.',
    ],
    howTo: [
      'Name your areas of life, add a small habit or two inside each, and tap a circle daily to tend it.',
      'Order your list with the sort control above it: time of day, priority, or still to do. Your choice follows you across devices.',
      'Press and hold an area chip to edit it; a quick tap filters the day to it.',
      'Add a tug for something to ease off; note it in a tap, or open it for its history.',
      'Make it yours in Me: choose a theme, set reminders and quiet hours, and reread this guide any time.',
    ],
    art: ['logo', 'sort'],
  },
  {
    version: '0.13.0',
    date: '2026-06-30',
    major: true,
    title: 'Choose your light',
    notes: [
      'Themes are here. Five lights to open into: the warm Terracotta you know, a golden Mango Sunshine, a restful Sage Grove, a clear Ocean Blue, and a soft Indigo Night for after dark.',
      'Your areas keep their own colours, so the bloom still means what it means. The theme just changes the light around it.',
      'The weekly recap and the little observations read warmer and more human now, with gentler nudges on where to go next.',
    ],
    howTo: [
      'Open Me, then find Appearance near the top.',
      'Tap any theme to try it on. It changes the whole app at once.',
      'Terracotta stays the default, and your choice is remembered across all devices.',
    ],
    art: ['themes'],
  },
  {
    version: '0.12.0',
    date: '2026-06-30',
    major: true,
    title: 'A guide to it all',
    notes: [
      'A new guide with two sides: What is new, and a gentle walk-through of everything, the Bloom, tending, areas and weights, tugs, the Log, insights, reminders, and syncing across your devices.',
      'It greets you with the full guide once after setting up, so your first moments have a friendly hand to hold. Open it any time under Me to see what is new.',
      'Every past release is here too, tucked under Earlier versions, each with a little picture of the feature it brought.',
    ],
    howTo: [
      'Open Me, then tap How Harmony works.',
      'Stay on What\'s new to read each release, or tap Guide for the full walk-through.',
      'Open Earlier versions to revisit any past release and how to use it.',
    ],
    art: ['guide'],
  },
  {
    version: '0.11.0',
    date: '2026-06-30',
    major: true,
    title: 'Weight what matters',
    notes: [
      'Give each habit its share of an area. Open an area to slide how much each habit counts toward its bloom, with a live split that always adds to a hundred. Equal by default, yours to shape.',
      'The bloom now reads on two levels: how much an area matters to you, where lower-stakes areas fill more readily so your eye is drawn to what you said matters most, and how you are doing on each habit by its weight.',
      "Tugs are clearer on a habit's page: their own heading among an area's habits, an outlined streak, and 'not tugged yet' rather than 'not tended'.",
      'Going back from a habit now returns you home, instead of retracing every neighbour you looked at along the way.',
    ],
    howTo: [
      'Open Areas and tap an area to expand it.',
      'Tap the pencil to edit it; with two or more habits, weight sliders appear.',
      'Slide each habit to set its share of the area. The split always adds to a hundred.',
      'Open a tug from its area to see its own heading, outlined streak, and "not tugged yet".',
    ],
    art: ['weights'],
  },
  {
    version: '0.10.0',
    date: '2026-06-30',
    major: true,
    title: 'Tugs: the whole, honest picture',
    notes: [
      'Add a tug for something you want to ease off. There is no schedule; you note it on the days it happens, and it gently eats into that area of your bloom, so a week shows the lift and the drag, not just the wins.',
      'A Tugs section on the home screen for a one-tap note, with how many days since the last one to keep you going. Stay clear of one for a while and it quietly steps aside, no nagging about something you have moved past.',
      'Added Socialising to the starting areas, and you can now keep up to twelve.',
      '"Archive" is now "Delete", since that is what it really does.',
    ],
    howTo: [
      'Tap the plus to add a habit, choose Ease off to make it a tug, and set how much it sets you back.',
      'On Home, find the Tugs section and tap a tug to note it for today.',
      'See how many days since the last one in that same row.',
    ],
    art: ['tug'],
  },
  {
    version: '0.9.0',
    date: '2026-06-30',
    major: true,
    title: 'Fix the past, sync on demand, see beyond today',
    notes: [
      'Tap any past day in the Log to set the record straight: mark something you forgot to log, or unmark something you tapped by mistake.',
      'A new Sync popup behind the status dot: sync your data on demand, see at a glance whether you are offline, syncing, or up to date, and pick up a new version without closing the app.',
      'On the home screen, switch between Today and All to see every habit, not only the ones due today.',
    ],
    howTo: [
      'Open Log and tap any past day to mark something you forgot, or unmark a mistaken tap.',
      'On Home, use the Today and All switch to see every habit, not only today\'s.',
      'Tap the status dot at the top right to sync now or pick up a new version.',
    ],
    art: ['log', 'sync'],
  },
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
    howTo: [
      'When adding or editing a habit, pick the repeat: daily, certain days, a few times a week, or every few weeks or months.',
      'On Home, tap a petal or an area chip to focus the day on just that area.',
      'Press and hold a petal to lift the area out with your own words.',
      'Open Areas, expand an area, and tap Reorder habits to drag them in order.',
    ],
    art: ['bloom', 'areas'],
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
    howTo: [
      'Open Me and turn on reminders for this device. On iPhone, add Harmony to your home screen first.',
      'Give a habit a time when you add or edit it; the nudge arrives then on days it is due.',
      'Turn reminders on separately on each device you use.',
    ],
    art: ['reminder'],
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
    howTo: [
      'When adding a habit, choose certain days, a number of times a week, or every few days.',
      'Set a start date, and an end date too if it is only for a season.',
    ],
    art: ['habit'],
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
    howTo: [
      'Sign in on any device and your areas, habits, and history arrive on their own.',
      'Changes sync as you make them; check the status dot at the top right.',
      'Forgot your password? Use the link on the sign-in screen and set a new one from your email.',
    ],
    art: ['sync'],
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
    howTo: [
      'Give a habit its own time when you add or edit it for a gentle nudge.',
      'Turn on the evening note in Me to round up anything still unlogged.',
      'Pick a colour for each habit as you create it.',
    ],
    art: ['reminder'],
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
    howTo: [
      'Open Me to set do-not-disturb hours and how readily each area nudges you.',
      'Mute any area there with its own switch.',
      'When an area you said mattered slips, your own sentence comes back on Home and as a nudge.',
    ],
    art: ['areas'],
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
    howTo: [
      'Open Log for a month view of what you tended, with a note on any day you left one.',
      'Open Insights for your weekly recap and area balance at a glance.',
      'Tap any habit to open its page: a soft heatmap, your notes, and your patterns.',
    ],
    art: ['log'],
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
    howTo: [
      'Open Areas to name the parts of life that matter, in your own words.',
      'Add habits inside them; one tap on Home logs a habit for the day.',
      'Watch the Bloom on Home fill as you show up.',
    ],
    art: ['bloom'],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

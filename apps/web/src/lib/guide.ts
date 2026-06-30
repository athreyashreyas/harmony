// The in-app guide (Settings -> How Harmony works, and shown once after
// onboarding). Evergreen: keep this current as features land. The "What's new"
// strip at the top of the guide reads the latest release from changelog.ts, so
// that part updates itself; these sections are the lasting how-to.
//
// Each section may name one illustration, drawn by GuideScreen's GuideArt.

export type GuideArtKind = 'bloom' | 'habit' | 'areas' | 'weights' | 'tug' | 'log' | 'sync' | 'guide' | 'reminder';

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
  steps?: string[];
  art?: GuideArtKind;
}

export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    body: [
      'Harmony is built around the parts of life that matter to you, not a wall of streaks. You name those areas in your own words, tend small habits inside them, and watch a living Bloom reflect how your weeks are going.',
      'There is nothing to break and nothing to lose. A quiet day is just a quiet day.',
    ],
    art: 'bloom',
  },
  {
    id: 'bloom',
    title: 'The Bloom',
    body: [
      'Each petal is one area of life. A petal grows as you tend to that area and eases back when it goes untended. It reads your last two weeks, recalculated daily, so a single missed day never undoes things.',
      'Two things shape a petal: how much that area matters to you (areas you mark lower fill more readily, so your eye is drawn to what matters most), and how each habit is doing, by the weight you give it.',
    ],
    steps: [
      'Tap a petal, or an area chip, to focus the day on just that area.',
      'Press and hold a petal to lift the area out with the words you wrote for it.',
    ],
    art: 'bloom',
  },
  {
    id: 'tending',
    title: 'Tending habits',
    body: [
      'Your habits for today sit under the Bloom. One tap marks a habit tended; tap again to undo. Press and hold a habit to leave a few words about the day.',
      'Switch between Today and All to see everything you keep, not only what is due today.',
    ],
    art: 'habit',
  },
  {
    id: 'areas',
    title: 'Areas',
    body: [
      'Areas are the heart of Harmony. Give each one a colour, a note on why it matters, and a place in your priority order.',
      'Open an area to reorder the habits inside it, set how much each habit counts toward the area, and edit the area itself with the pencil.',
    ],
    steps: [
      'Drag the handle to reorder areas or habits.',
      'In an area, slide each habit to weight its share of the bloom. Equal by default.',
    ],
    art: 'weights',
  },
  {
    id: 'tugs',
    title: 'Tugs',
    body: [
      'A tug is something you would like to ease off. It is never scheduled. You note it on the days it happens, and it gently pulls back that area of your bloom, so a week shows the lift and the drag, the whole honest picture.',
      'Tugs live in their own muted, outlined style so they always read as something apart, never an alarm. No shame, just truth.',
    ],
    steps: [
      'Add one with the Ease off option when creating a habit, and set how much it sets you back.',
      'Note a tug in one tap from the Tugs section on the home screen.',
    ],
    art: 'tug',
  },
  {
    id: 'log',
    title: 'The Log',
    body: [
      'The Log is a calm month view of what you tended to, with your notes alongside.',
      'Tap any past day to set the record straight: mark something you forgot, or unmark something you tapped by mistake.',
    ],
    art: 'log',
  },
  {
    id: 'insights',
    title: 'Insights',
    body: [
      'A weekly recap written from your own week, your areas in balance, and a gentle suggestion or two on what might come next. All of it drawn from what you actually did, in plain language.',
    ],
  },
  {
    id: 'reminders',
    title: 'Reminders',
    body: [
      'Give a habit a time and Harmony will send a soft nudge then, on the days it is due. There is also an optional evening note rounding up anything still unlogged.',
      'You set do-not-disturb hours, and you can mute any area. On iPhone, add Harmony to your home screen first, then turn reminders on for that device.',
    ],
  },
  {
    id: 'themes',
    title: 'Make it yours',
    body: [
      'Harmony comes in a few different lights. Choose the one that makes you happy to open the app: the warm Terracotta, a golden Mango Sunshine, a restful Sage Grove, a clear Ocean Blue, or a soft Indigo Night for the evening.',
      'A theme changes the colours around your habits, never the colours of your areas, so your bloom always means the same thing.',
    ],
    steps: [
      'Open Me, then Appearance, and tap any theme to switch instantly.',
      'Terracotta is the default, and your choice is remembered on this device.',
    ],
  },
  {
    id: 'sync',
    title: 'Across your devices',
    body: [
      'Sign in anywhere and your areas, habits, and history are simply there, staying in sync as you go. It works offline too, and catches up when you reconnect.',
      'The dot at the top right shows where things stand. Tap it any time to sync on the spot or pick up a new version.',
    ],
    steps: [
      'Red means offline, your changes are safe on the device.',
      'Gold means syncing. Green means everything is up to date.',
    ],
    art: 'sync',
  },
];

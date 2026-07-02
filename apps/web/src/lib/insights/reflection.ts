import type { Insights, InsightsRange } from './analytics';
import { SEGMENT_LABELS, WEEKDAY_NAMES } from './analytics';

// The warm, human voice of Insights. Given the computed numbers, it writes a
// short reflection that reads like a perceptive, kind friend (or a wholesome
// Jarvis): an honest, specific read on how the period actually went, real
// encouragement, and a genuine pat on the back. Joyful about wins, gentle and
// shame-free about the quiet, honest about the tugs. Deterministic (a seed keeps
// wording stable within a render) but varied, so it never sounds canned.

const RANGE_NOUN: Record<InsightsRange, string> = { week: 'week', month: 'month', year: 'year', all: 'stretch' };
const RANGE_SPAN: Record<InsightsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'since you began',
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function timesWord(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${n} times`;
}

function daysWord(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

function areasWord(n: number): string {
  return n === 1 ? '1 area' : `${n} areas`;
}

// Whole-life reflection (no focus area).
function reflectOverall(insights: Insights, firstName: string): string[] {
  const { summary, range, trendDelta, runs, areas, bestSegment, bestWeekday } = insights;
  const span = RANGE_SPAN[range];
  const noun = RANGE_NOUN[range];
  const seed = summary.tends * 7 + summary.daysShownUp * 3 + insights.weekday.reduce((s, n) => s + n, 0);
  const name = firstName?.trim() || null;

  if (summary.tends === 0) {
    return [
      pick(
        [
          `Quiet ${noun} so far${name ? `, ${name}` : ''}, and there's honestly no problem with that. Whenever you're ready, one small thing is all it takes to get the wheels turning again.`,
          `Nothing logged ${span} yet${name ? `, ${name}` : ''}, and life gets like that sometimes. No catching up to do. Pick one small thing when you feel like it, and this page will start to fill.`,
        ],
        seed,
      ),
    ];
  }

  const paras: string[] = [];

  // Paragraph 1: the honest headline, plus how it compares.
  const opener = pick(
    [
      `${name ? `${name}, this` : 'This'} ${noun} you showed up ${timesWord(summary.tends)}, across ${areasWord(summary.activeAreas)} and ${daysWord(summary.daysShownUp)}. That's real, and it counts.`,
      `Here's the ${noun} in short${name ? `, ${name}` : ''}: ${timesWord(summary.tends)}, spread over ${daysWord(summary.daysShownUp)} and ${areasWord(summary.activeAreas)}. Genuinely good to see.`,
      `You came back to yourself ${timesWord(summary.tends)} ${span}${name ? `, ${name}` : ''}, over ${daysWord(summary.daysShownUp)} and ${areasWord(summary.activeAreas)}. Not bad at all.`,
    ],
    seed,
  );
  let momentum = '';
  if (range !== 'all') {
    if (trendDelta > 0.08) {
      momentum = pick(
        [` And you did a little more than the ${noun} before, so something's clearly clicking.`, ` That's up on last ${noun}, too. You can feel it building.`],
        seed,
      );
    } else if (trendDelta < -0.08) {
      momentum = pick(
        [
          ` It was a quieter ${noun} than the last, and honestly, that's alright. Nobody runs flat out forever, and rest is part of the work.`,
          ` Things eased off from last ${noun}, which is just life doing its thing. Be kind to yourself about it.`,
        ],
        seed,
      );
    } else {
      momentum = pick([` You held about level with last ${noun}, which is harder than it sounds.`, ` Steady with last ${noun}, and steady is underrated.`], seed);
    }
  }
  paras.push(opener + momentum);

  // Paragraph 2: what stood out, when you're at your best, any run going.
  const bits: string[] = [];
  const top = [...areas].filter((a) => a.completed > 0).sort((a, b) => b.completed - a.completed)[0];
  if (top) {
    bits.push(
      pick(
        [`If one thing stood out, it was ${top.area.name}. You really showed up for it.`, `${top.area.name} got most of your attention this ${noun}, and it shows.`],
        seed + 1,
      ),
    );
  }
  if (bestSegment && bestWeekday != null) {
    bits.push(
      pick(
        [
          `You're at your best in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}, especially on ${WEEKDAY_NAMES[bestWeekday]}s. Worth building around.`,
          `Most of it happened in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}, often on ${WEEKDAY_NAMES[bestWeekday]}s. That's your window; lean into it.`,
        ],
        seed + 2,
      ),
    );
  }
  if (runs.current >= 3) {
    bits.push(pick([`And right now you're on a ${runs.current}-day run. Enjoy that; you built it.`, `You're ${runs.current} days in a row as we speak, which is genuinely great going.`], seed + 3));
  } else if (runs.longest >= 4) {
    bits.push(`Your best stretch was ${runs.longest} days straight, so you clearly have it in you.`);
  }
  if (bits.length) paras.push(bits.join(' '));

  // Paragraph 3: a quiet area, held kindly, and the tugs, honestly.
  const closingBits: string[] = [];
  const quiet = [...areas]
    .filter((a) => a.area.importance !== 'optional' && a.area.whySentence && a.ratio < 0.34 && a.area !== top?.area)
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (quiet) {
    closingBits.push(
      pick(
        [
          `${quiet.area.name} has gone a little quiet, and that happens; life pulls us around. You once said it matters because "${quiet.area.whySentence}", so maybe give it a small hello when you can.`,
          `The one that's been waiting is ${quiet.area.name}. Remember why you chose it: "${quiet.area.whySentence}". No pressure at all, but it would be glad to see you.`,
        ],
        seed + 4,
      ),
    );
  }
  const tugCount = insights.tugTotals.reduce((s, t) => s + t.count, 0);
  if (tugCount > 0) {
    closingBits.push(
      pick(
        [
          `You were also honest about the ${tugCount === 1 ? 'pull' : 'pulls'} going the other way, ${timesWord(tugCount)}. Naming those takes guts, and it's how they start to lose their grip.`,
          `And you owned the ${tugCount === 1 ? 'tug' : 'tugs'} you're easing off, ${timesWord(tugCount)}. That kind of honesty is doing more for you than you probably realise.`,
        ],
        seed + 5,
      ),
    );
  }
  if (closingBits.length) paras.push(closingBits.join(' '));

  // Always close with a real pat on the back.
  paras.push(
    pick(
      [
        `All in all${name ? `, ${name}` : ''}, you're doing better than you give yourself credit for. Keep going.`,
        `Take the win${name ? `, ${name}` : ''}. Showing up for your own life, over and over, is the whole game, and you're playing it.`,
        `Whatever the next ${noun === 'stretch' ? 'while' : noun} brings, be good to yourself. From where I'm sitting, you've earned it.`,
      ],
      seed + 6,
    ),
  );

  return paras;
}

// Focused reflection (one area).
function reflectArea(insights: Insights, firstName: string, areaName: string): string[] {
  const { summary, range, runs, habits, bestSegment } = insights;
  const span = RANGE_SPAN[range];
  const noun = RANGE_NOUN[range];
  const seed = summary.tends * 5 + summary.daysShownUp * 2;
  const name = firstName?.trim() || null;

  if (summary.tends === 0) {
    return [
      `${areaName} has been quiet ${span}${name ? `, ${name}` : ''}, and that's completely fine. One small moment, whenever it feels right, is all it takes to pick it back up.`,
    ];
  }

  const paras: string[] = [];
  paras.push(
    pick(
      [
        `${name ? `${name}, in` : 'In'} ${areaName}, you showed up ${timesWord(summary.tends)} across ${daysWord(summary.daysShownUp)} ${span}. Steady care, and it adds up.`,
        `${areaName} saw you ${timesWord(summary.tends)} ${span}, over ${daysWord(summary.daysShownUp)}. That kind of attention pays off in ways you'll feel.`,
      ],
      seed,
    ),
  );

  const strong = [...habits].filter((h) => h.completed > 0).sort((a, b) => b.ratio - a.ratio)[0];
  const quietHabit = [...habits].filter((h) => h.expected > 0 && h.ratio < 0.34).sort((a, b) => a.ratio - b.ratio)[0];
  const bits: string[] = [];
  if (strong) bits.push(`"${strong.habit.name}" came easiest${bestSegment ? `, usually in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}` : ''}.`);
  if (runs.current >= 3) bits.push(`You're ${runs.current} days deep here right now, which is great to see.`);
  if (quietHabit && quietHabit !== strong) bits.push(`"${quietHabit.habit.name}" has been sitting quietly; whenever you fancy it, it's there.`);
  if (bits.length) paras.push(bits.join(' '));

  paras.push(
    pick(
      [
        `That's what looking after ${areaName} really looks like. Keep it gentle, and keep it going.`,
        `${areaName} is lucky to have your attention${name ? `, ${name}` : ''}. However the next ${noun} goes, be kind to yourself in it.`,
      ],
      seed + 1,
    ),
  );
  return paras;
}

export function composeReflection(
  insights: Insights,
  opts: { firstName: string; areaName?: string | null },
): string[] {
  return opts.areaName ? reflectArea(insights, opts.firstName, opts.areaName) : reflectOverall(insights, opts.firstName);
}

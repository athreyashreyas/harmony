import type { Insights, InsightsRange } from './analytics';
import { SEGMENT_LABELS, WEEKDAY_NAMES } from './analytics';

// The warm, human voice of Insights. Given the computed numbers, it writes a
// short reflection that is accurate and whole-picture, but reads like a kind
// friend who is genuinely glad you showed up: joyful about what went well,
// gentle and shame-free about what went quiet, honest about the tugs, and
// always ending on encouragement. Deterministic (a seed keeps wording stable
// within a render) but varied, so it never feels robotic.

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

// Whole-life reflection (no focus area).
function reflectOverall(insights: Insights, firstName: string): string[] {
  const { summary, range, trendDelta, runs, areas, bestSegment, bestWeekday } = insights;
  const span = RANGE_SPAN[range];
  const noun = RANGE_NOUN[range];
  const seed = summary.tends * 7 + summary.daysShownUp * 3 + insights.weekday.reduce((s, n) => s + n, 0);
  const name = firstName?.trim() || null;
  const paras: string[] = [];

  // Opening: the whole picture, warmly.
  if (summary.tends === 0) {
    return [
      pick(
        [
          `A quiet ${noun}${name ? `, ${name}` : ''} — and that's okay. Nothing here is waiting to judge you. When you're ready, tend to one small thing and watch this space begin to bloom.`,
          `Nothing logged ${span} yet${name ? `, ${name}` : ''}, and there's no rush at all. Harmony isn't going anywhere. One gentle moment is all it takes to begin again.`,
        ],
        seed,
      ),
    ];
  }

  const opener = pick(
    [
      `${name ? `${name}, this` : 'This'} ${noun} you showed up ${timesWord(summary.tends)}, across ${summary.activeAreas} ${summary.activeAreas === 1 ? 'area' : 'areas'} of your life, on ${daysWord(summary.daysShownUp)} you chose to return to yourself.`,
      `${name ? `${name}, you` : 'You'} came back to yourself ${timesWord(summary.tends)} ${span}, spread over ${daysWord(summary.daysShownUp)} and ${summary.activeAreas} ${summary.activeAreas === 1 ? 'area' : 'areas'}. Every one of those was a small yes to the life you want.`,
      `Look at that: ${timesWord(summary.tends)} ${span}, on ${daysWord(summary.daysShownUp)}, across ${summary.activeAreas} ${summary.activeAreas === 1 ? 'area' : 'areas'}. That's you, quietly building a life on purpose.`,
    ],
    seed,
  );

  // Momentum, kindly.
  let momentum = '';
  if (range !== 'all') {
    if (trendDelta > 0.08) {
      momentum = pick(
        [
          ` That's more than the ${noun} before — you can feel it gathering pace.`,
          ` A little more than last ${noun}, too. Something is taking root.`,
        ],
        seed,
      );
    } else if (trendDelta < -0.08) {
      momentum = pick(
        [
          ` It was a gentler ${noun} than the last, and that is completely alright — rest is part of the rhythm, not a failure of it.`,
          ` Things eased off from last ${noun}, and that's human. Life has its seasons, and so do you.`,
        ],
        seed,
      );
    } else {
      momentum = pick(
        [` And you held a steady rhythm — the quiet, underrated kind of consistency that actually lasts.`, ` Steady with last ${noun}, which is its own small triumph.`],
        seed,
      );
    }
  }
  paras.push(opener + momentum);

  // Second paragraph: a bright spot, the rhythm, and a gentle nudge.
  const bits: string[] = [];
  const top = [...areas].filter((a) => a.completed > 0).sort((a, b) => b.completed - a.completed)[0];
  if (top) {
    bits.push(
      pick(
        [
          `You leaned into ${top.area.name} the most, and it shows.`,
          `${top.area.name} clearly had your heart this ${noun}.`,
          `Pride of place goes to ${top.area.name} — you really gave it your attention.`,
        ],
        seed + 1,
      ),
    );
  }
  if (bestSegment && bestWeekday != null) {
    bits.push(
      pick(
        [
          ` You return to yourself most in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}, often on ${WEEKDAY_NAMES[bestWeekday]}s — a rhythm worth leaning into.`,
          ` ${SEGMENT_LABELS[bestSegment]}s, especially ${WEEKDAY_NAMES[bestWeekday]}s, are when you shine — lovely to know where your good moments live.`,
        ],
        seed + 2,
      ),
    );
  }
  if (runs.current >= 3) {
    bits.push(pick([` And right now you're on a ${runs.current}-day thread of showing up — savour it.`, ` You're ${runs.current} days in a row deep right now. That's momentum you built.`], seed + 3));
  } else if (runs.longest >= 4) {
    bits.push(` Your longest run ${span} was ${runs.longest} days — proof of what you're capable of.`);
  }
  if (bits.length) paras.push(bits.join(''));

  // A quiet area, held kindly, using their own words.
  const quiet = [...areas]
    .filter((a) => a.area.importance !== 'optional' && a.area.whySentence && a.ratio < 0.34 && a.area !== top?.area)
    .sort((a, b) => a.ratio - b.ratio)[0];
  const closingBits: string[] = [];
  if (quiet) {
    closingBits.push(
      pick(
        [
          `${quiet.area.name} has been resting, and there's no guilt in that. You once wrote, "${quiet.area.whySentence}" — it'll be right there when you feel the pull to return.`,
          `If anything's been waiting, it's ${quiet.area.name}. Your own words still hold: "${quiet.area.whySentence}". No rush, no shame — just an open door.`,
        ],
        seed + 4,
      ),
    );
  }

  // Tugs, honestly and compassionately.
  const tugCount = insights.tugTotals.reduce((s, t) => s + t.count, 0);
  if (tugCount > 0) {
    closingBits.push(
      pick(
        [
          ` You also noted ${timesWord(tugCount)} you're easing off — naming it honestly is half the work, and you did it.`,
          ` And you were honest about the ${tugCount === 1 ? 'tug' : 'tugs'} pulling the other way ${timesWord(tugCount)}. That self-honesty is its own kind of strength.`,
        ],
        seed + 5,
      ),
    );
  }
  if (closingBits.length) paras.push(closingBits.join(''));

  // Always close on warmth.
  paras.push(
    pick(
      [
        `However it went, the fact that you're here, looking honestly at your life, means you care about it. That matters more than any number on this page.`,
        `Be proud of this, ${name ?? 'friend'}. Showing up for yourself, again and again, in small ways — that's how a whole life gets built.`,
        `Whatever comes next ${noun === 'stretch' ? '' : `${noun}`}, go gently. You're doing better than you think, and you're clearly trying. That's everything.`,
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
      `${areaName} has been quiet ${span}${name ? `, ${name}` : ''}, and that's alright. Whenever it calls to you again, even one small moment counts. No catching up required.`,
    ];
  }

  const paras: string[] = [];
  paras.push(
    pick(
      [
        `${name ? `${name}, in` : 'In'} ${areaName}, you showed up ${timesWord(summary.tends)} on ${daysWord(summary.daysShownUp)} ${span}. Real, tangible care for this part of your life.`,
        `${areaName} saw you ${timesWord(summary.tends)} ${span}, across ${daysWord(summary.daysShownUp)}. That devotion adds up in ways you'll feel.`,
      ],
      seed,
    ),
  );

  const strong = [...habits].filter((h) => h.completed > 0).sort((a, b) => b.ratio - a.ratio)[0];
  const quietHabit = [...habits].filter((h) => h.expected > 0 && h.ratio < 0.34).sort((a, b) => a.ratio - b.ratio)[0];
  const bits: string[] = [];
  if (strong) bits.push(`"${strong.habit.name}" came the most easily${bestSegment ? `, and often in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}` : ''}.`);
  if (runs.current >= 3) bits.push(` You're on a ${runs.current}-day thread here right now — lovely to see.`);
  if (quietHabit && quietHabit !== strong) bits.push(` "${quietHabit.habit.name}" has been waiting quietly; a gentle return whenever you like.`);
  if (bits.length) paras.push(bits.join(''));

  paras.push(
    pick(
      [
        `This is what tending ${areaName} looks like — not perfection, just presence. Keep going gently.`,
        `${areaName} is lucky to have your attention. However the next ${noun} unfolds, be kind to yourself in it.`,
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

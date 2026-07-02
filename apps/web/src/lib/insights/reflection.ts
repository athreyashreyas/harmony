import type { Insights, InsightsRange } from './analytics';
import { SEGMENT_LABELS, WEEKDAY_NAMES } from './analytics';
import { daysBetween } from '../time/dates';

// The warm, human voice of Insights. It reads like a perceptive friend giving an
// honest, specific read plus real encouragement, never first-person, never
// eggshell-hedged. Two things keep it from ever feeling canned over days, weeks,
// months and years:
//   1. It rotates WHICH truths it surfaces. Each period there are many
//      applicable observations (momentum, rhythm, runs, breadth, a standout
//      habit, a quiet area, tugs, weekday leanings...); a seed picks a fresh
//      couple to feature, so different periods highlight different things.
//   2. It rotates HOW each is said, drawing from large phrasing pools.
// The seed is derived from the period plus the actual numbers, so the reflection
// is stable for a given state (no flicker on re-open) yet moves as the state
// or the day does.

const RANGE_NOUN: Record<InsightsRange, string> = { week: 'week', month: 'month', year: 'year', all: 'stretch' };
const RANGE_SPAN: Record<InsightsRange, string> = { week: 'this week', month: 'this month', year: 'this year', all: 'since you began' };

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mix(a: number, b: number): number {
  let x = (a ^ (b + 0x9e3779b9 + (a << 6) + (a >>> 2))) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  return x >>> 0;
}
// A phrasing from a pool, chosen by the base seed and a per-slot salt so
// different slots decorrelate (they don't all land on the same index).
function say(pool: string[], base: number, slot: number): string {
  return pool[mix(base, slot) % pool.length];
}

function timesWord(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}
function daysWord(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}
function areasWord(n: number): string {
  return n === 1 ? '1 area' : `${n} areas`;
}

interface Candidate {
  id: string;
  text: string;
}

function reflectOverall(insights: Insights, firstName: string): string[] {
  const { summary, range, trendDelta, runs, areas, habits, weekday, bestSegment, bestWeekday } = insights;
  const span = RANGE_SPAN[range];
  const noun = RANGE_NOUN[range];
  const name = firstName?.trim() || null;
  const nm = name ? `, ${name}` : '';

  const base = hashStr(
    [
      insights.from,
      range,
      summary.tends,
      summary.daysShownUp,
      summary.activeAreas,
      weekday.join('.'),
      bestSegment ?? '-',
      bestWeekday ?? -1,
      runs.current,
      runs.longest,
      Math.round(trendDelta * 100),
      areas.map((a) => `${a.area.id}:${Math.round(a.ratio * 10)}`).join(','),
    ].join('|'),
  );

  // Empty state: kind, no shame, still varied.
  if (summary.tends === 0) {
    return [
      say(
        [
          `Quiet ${noun} so far${nm}, and there's honestly no problem with that. One small thing, whenever you feel it, and this space starts to bloom.`,
          `Nothing logged ${span} yet${nm}. Life gets like that. Pick one gentle thing when you're ready and the page fills itself in.`,
          `A blank ${noun}${nm}, and blank isn't bad. It's just the pause before the next small step. No catching up needed.`,
          `Still a clean slate ${span}${nm}. Whenever the moment feels right, tend one thing and Harmony will meet you there.`,
        ],
        base,
        1,
      ),
    ];
  }

  const paras: string[] = [];

  // --- Paragraph 1: the honest headline + momentum ---
  const opener = say(
    [
      `${name ? `${name}, this` : 'This'} ${noun} you showed up ${timesWord(summary.tends)}, across ${areasWord(summary.activeAreas)} and ${daysWord(summary.daysShownUp)}. That's real, and it counts.`,
      `Here's the ${noun} in short${nm}: ${timesWord(summary.tends)}, over ${daysWord(summary.daysShownUp)} and ${areasWord(summary.activeAreas)}. Good to see.`,
      `You came back to yourself ${timesWord(summary.tends)} ${span}${nm}, spread over ${daysWord(summary.daysShownUp)} and ${areasWord(summary.activeAreas)}. Not bad at all.`,
      `${timesWord(summary.tends)} ${span}, on ${daysWord(summary.daysShownUp)}, across ${areasWord(summary.activeAreas)}${nm}. That's a life being built on purpose.`,
      `A ${noun} of showing up: ${timesWord(summary.tends)}, ${daysWord(summary.daysShownUp)}, ${areasWord(summary.activeAreas)}${nm}. Quietly, it adds up.`,
    ],
    base,
    2,
  );
  let momentum = '';
  if (range !== 'all') {
    if (trendDelta > 0.08) {
      momentum = ` ${say([
        `That's more than the ${noun} before, so something's clearly clicking.`,
        `Up on last ${noun}, too. You can feel it building.`,
        `A step up from last ${noun}. Momentum suits you.`,
        `More than you managed last ${noun} as well. Keep that thread going.`,
      ], base, 3)}`;
    } else if (trendDelta < -0.08) {
      momentum = ` ${say([
        `It was a quieter ${noun} than the last, and that's alright. Nobody runs flat out forever.`,
        `Softer than last ${noun}, which is just life having seasons. Be kind about it.`,
        `A gentler ${noun} than before. Rest is part of the work, not a break from it.`,
        `You eased off from last ${noun}. That's human, and it's fine.`,
      ], base, 3)}`;
    } else {
      momentum = ` ${say([
        `About level with last ${noun}, which is harder than it sounds.`,
        `Steady with last ${noun}. The quiet, lasting kind of consistency.`,
        `You held your ground from last ${noun}. Underrated, that.`,
      ], base, 3)}`;
    }
  }
  paras.push(opener + momentum);

  // --- Middle observations: build every applicable one, feature a rotating few ---
  const top = [...areas].filter((a) => a.completed > 0).sort((a, b) => b.completed - a.completed)[0];
  const secondTop = [...areas].filter((a) => a.completed > 0 && a.area.id !== top?.area.id).sort((a, b) => b.completed - a.completed)[0];
  const standout = [...habits].filter((h) => h.completed > 0).sort((a, b) => b.completed - a.completed)[0];
  const rangeDays = daysBetween(insights.from, insights.to) + 1;
  const consistency = rangeDays > 0 ? summary.daysShownUp / rangeDays : 0;
  const weekendCount = weekday[0] + weekday[6];
  const weekdayCount = weekday[1] + weekday[2] + weekday[3] + weekday[4] + weekday[5];
  const totalDays = weekendCount + weekdayCount;

  const candidates: Candidate[] = [];
  if (top) {
    candidates.push({
      id: 'top',
      text: say(
        [
          `${top.area.name} had your heart this ${noun}, and it shows.`,
          `If one thing stood out, it was ${top.area.name}. You really gave it your attention.`,
          `Pride of place goes to ${top.area.name}. That's where you leaned in.`,
          `${top.area.name} got the most of you${secondTop ? `, with ${secondTop.area.name} close behind` : ''}. Lovely to see it lead.`,
          `You poured most into ${top.area.name}. It's clearly one that matters to you right now.`,
        ],
        base,
        10,
      ),
    });
  }
  if (bestSegment && bestWeekday != null) {
    const seg = SEGMENT_LABELS[bestSegment].toLowerCase();
    const day = WEEKDAY_NAMES[bestWeekday];
    candidates.push({
      id: 'rhythm',
      text: say(
        [
          `You're at your best in the ${seg}, especially on ${day}s. Worth building around.`,
          `Most of it happened in the ${seg}, often on ${day}s. That's your window; lean into it.`,
          `${day}s in the ${seg} are clearly your sweet spot. Handy to know.`,
          `Your rhythm favours the ${seg}, ${day}s above all. Plan the important stuff there.`,
        ],
        base,
        11,
      ),
    });
  }
  if (runs.current >= 3) {
    candidates.push({
      id: 'run',
      text: say(
        [
          `Right now you're on a ${runs.current}-day run. Enjoy it; you built it.`,
          `You're ${runs.current} days in a row as things stand, which is genuinely great going.`,
          `A ${runs.current}-day thread of showing up is live right now. Savour that.`,
          `Currently ${runs.current} days deep, back to back. That's momentum you made.`,
        ],
        base,
        12,
      ),
    });
  } else if (runs.longest >= 4) {
    candidates.push({
      id: 'run',
      text: say(
        [
          `Your best stretch ${span} was ${runs.longest} days straight. You clearly have it in you.`,
          `You strung ${runs.longest} days together at one point. Proof of what's possible.`,
          `${runs.longest} days in a row was your high-water mark ${span}. Not bad at all.`,
        ],
        base,
        12,
      ),
    });
  }
  if (consistency >= 0.7 && summary.daysShownUp >= 3) {
    candidates.push({
      id: 'consistency',
      text: say(
        [
          `You showed up on most days ${span}, which is the whole game, really.`,
          `Barely a day slipped by untended ${span}. That steadiness is doing quiet work.`,
          `You were present on ${daysWord(summary.daysShownUp)} out of ${rangeDays}. Consistency like that compounds.`,
        ],
        base,
        13,
      ),
    });
  }
  if (summary.activeAreas >= 4) {
    candidates.push({
      id: 'breadth',
      text: say(
        [
          `You spread yourself across ${areasWord(summary.activeAreas)}, a nicely balanced ${noun}.`,
          `Attention reached ${areasWord(summary.activeAreas)} this ${noun}. A well-rounded picture.`,
          `${areasWord(summary.activeAreas)} got a look-in. You're keeping life broad, not narrow.`,
        ],
        base,
        14,
      ),
    });
  } else if (summary.activeAreas === 1 && summary.tends >= 3) {
    candidates.push({
      id: 'breadth',
      text: say(
        [
          `You went deep on one thing this ${noun}. Focus has its own quiet power.`,
          `It was a one-area ${noun}, and that's fine. Sometimes life asks for a single focus.`,
        ],
        base,
        14,
      ),
    });
  }
  if (standout && (!top || standout.completed >= 3)) {
    candidates.push({
      id: 'standout',
      text: say(
        [
          `"${standout.habit.name}" was your anchor, the one you came back to most.`,
          `"${standout.habit.name}" showed up more than anything else. A reliable little cornerstone.`,
          `If any single habit carried the ${noun}, it was "${standout.habit.name}".`,
        ],
        base,
        15,
      ),
    });
  }
  if (totalDays >= 4 && weekendCount > weekdayCount * 1.5) {
    candidates.push({
      id: 'weekpart',
      text: say(
        [`Weekends are when you tend most. Your own time, well spent.`, `The weekend is clearly your zone. Worth protecting that space.`],
        base,
        16,
      ),
    });
  } else if (totalDays >= 4 && weekdayCount > 0 && weekendCount === 0) {
    candidates.push({
      id: 'weekpart',
      text: say(
        [`You're a weekday person, it seems. The working week suits your rhythm.`, `It all happened on weekdays. The week carries you; the weekend rests you.`],
        base,
        16,
      ),
    });
  }

  // Feature a rotating couple of the applicable observations.
  const featured = [...candidates].sort((a, b) => mix(base, hashStr(a.id)) - mix(base, hashStr(b.id))).slice(0, 2);
  if (featured.length) paras.push(featured.map((c) => c.text).join(' '));

  // --- Closing considerations: a quiet area (kindly) and the tugs (honestly) ---
  const closing: string[] = [];
  const quiet = [...areas]
    .filter((a) => a.area.importance !== 'optional' && a.area.whySentence && a.ratio < 0.34 && a.area.id !== top?.area.id)
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (quiet) {
    closing.push(
      say(
        [
          `${quiet.area.name} went quiet, and that happens. You said it matters because "${quiet.area.whySentence}", so give it a small hello this ${noun}.`,
          `The one that's been waiting is ${quiet.area.name}. You chose it for a reason: "${quiet.area.whySentence}". Worth a return this ${noun}.`,
          `${quiet.area.name} has been resting. Your own words still hold: "${quiet.area.whySentence}". A single moment there would go a long way.`,
        ],
        base,
        20,
      ),
    );
  }
  const tugCount = insights.tugTotals.reduce((s, t) => s + t.count, 0);
  if (tugCount > 0) {
    closing.push(
      say(
        [
          `You were honest about the ${tugCount === 1 ? 'pull' : 'pulls'} going the other way, ${timesWord(tugCount)}. Naming those is half the work, and you did it.`,
          `And you owned the ${tugCount === 1 ? 'tug' : 'tugs'} you're easing off, ${timesWord(tugCount)}. That self-honesty is its own kind of strength.`,
          `The ${tugCount === 1 ? 'tug' : 'tugs'} got logged too, ${timesWord(tugCount)}. Seeing them clearly is how they loosen their grip.`,
        ],
        base,
        21,
      ),
    );
  }
  if (closing.length) paras.push(closing.join(' '));

  // --- Always close on a real pat on the back ---
  paras.push(
    say(
      [
        `All in all${nm}, you're doing better than you give yourself credit for. Keep going.`,
        `Take the win${nm}. Showing up for your own life, again and again, is the whole thing, and you're doing it.`,
        `Whatever the next ${noun === 'stretch' ? 'while' : noun} brings, be good to yourself. You've clearly earned it.`,
        `Be proud of this${nm}. Small, repeated acts of care are exactly how a good life gets built.`,
        `That's a ${noun} to feel alright about${nm}. Rest up, and pick it back up when you're ready.`,
        `Onward, gently${nm}. You're trying, it shows, and that matters more than any number here.`,
      ],
      base,
      30,
    ),
  );

  return paras;
}

function reflectArea(insights: Insights, firstName: string, areaName: string): string[] {
  const { summary, range, runs, habits, bestSegment, bestWeekday } = insights;
  const span = RANGE_SPAN[range];
  const noun = RANGE_NOUN[range];
  const name = firstName?.trim() || null;
  const nm = name ? `, ${name}` : '';
  const base = hashStr([insights.from, 'area', areaName, summary.tends, summary.daysShownUp, runs.current].join('|'));

  if (summary.tends === 0) {
    return [
      say(
        [
          `${areaName} has been quiet ${span}${nm}, and that's completely fine. One small moment, whenever it feels right, picks it back up.`,
          `A restful ${noun} for ${areaName}${nm}. No catching up needed; a single step brings it back to life.`,
        ],
        base,
        1,
      ),
    ];
  }

  const paras: string[] = [];
  paras.push(
    say(
      [
        `${name ? `${name}, in` : 'In'} ${areaName}, you showed up ${timesWord(summary.tends)} across ${daysWord(summary.daysShownUp)} ${span}. Steady care, and it adds up.`,
        `${areaName} saw you ${timesWord(summary.tends)} ${span}, over ${daysWord(summary.daysShownUp)}. That attention pays off in ways you'll feel.`,
        `${timesWord(summary.tends)} in ${areaName} ${span}, on ${daysWord(summary.daysShownUp)}${nm}. Real devotion to this part of life.`,
      ],
      base,
      2,
    ),
  );

  const strong = [...habits].filter((h) => h.completed > 0).sort((a, b) => b.ratio - a.ratio)[0];
  const quietHabit = [...habits].filter((h) => h.expected > 0 && h.ratio < 0.34).sort((a, b) => a.ratio - b.ratio)[0];
  const bits: string[] = [];
  if (strong) bits.push(say([`"${strong.habit.name}" came easiest here.`, `"${strong.habit.name}" led the way in ${areaName}.`], base, 10) + (bestSegment && bestWeekday != null ? ` Often in the ${SEGMENT_LABELS[bestSegment].toLowerCase()}, on ${WEEKDAY_NAMES[bestWeekday]}s.` : ''));
  if (runs.current >= 3) bits.push(say([`You're ${runs.current} days deep here right now, which is great to see.`, `A ${runs.current}-day run is live in ${areaName}. Enjoy it.`], base, 11));
  if (quietHabit && quietHabit !== strong) bits.push(say([`"${quietHabit.habit.name}" has been sitting quietly; worth picking back up.`, `"${quietHabit.habit.name}" is the one still waiting in here.`], base, 12));
  if (bits.length) paras.push(bits.join(' '));

  paras.push(
    say(
      [
        `That's what looking after ${areaName} really looks like. Keep it gentle, and keep it going.`,
        `${areaName} is lucky to have your attention${nm}. However the next ${noun} goes, be kind to yourself in it.`,
        `Good work on ${areaName}${nm}. Presence over perfection, every time.`,
      ],
      base,
      20,
    ),
  );
  return paras;
}

export function composeReflection(insights: Insights, opts: { firstName: string; areaName?: string | null }): string[] {
  return opts.areaName ? reflectArea(insights, opts.firstName, opts.areaName) : reflectOverall(insights, opts.firstName);
}

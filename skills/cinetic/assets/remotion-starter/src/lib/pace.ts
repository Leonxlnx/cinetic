// The film's pace: how fast text arrives, how long it holds, how much of it is on screen at once,
// and the default durations of every text component. Two profiles, both in 60 fps frames (convert
// with f60() at the point of use):
// - calm (the house default): fragments of 1-4 words that rise in over 36 f, 11 f apart, hold at
//   least 1 s, and take turns with the picture. In 8 frame-measured professional films a fragment
//   holds 0.6-1.2 s; calm sits at the slow end of that range, about 1.0-1.5 s.
// - crisp: the denser launch-film tempo (26 f entrances, 6 f stagger, per-word exits) for briefs
//   that ask for energy: teasers, drops, dev-tool launches.
// src/timeline.ts picks one with PACE_NAME; src/lib/anim.ts exports it as `pace`, the components
// read their defaults from it, and scripts/grid-check.ts checks COPY against the same numbers.
// Pure data and arithmetic with no imports, so Node scripts load it through timeline.ts.

export type PaceName = 'calm' | 'crisp';

export type Pace = {
  wordDur: number; // frames one word takes to rise in
  stagger: number; // frames between the starts of two words of a fragment
  rise: number; // em a word rises
  blur: number; // px of entry blur (0: none; blur on calm type reads as a gimmick)
  ease: 'outSoft' | 'out'; // the E token a word rises on
  exit: 'together' | 'words'; // a fragment leaves as one, or word by word at half the stagger
  exitDur: number; // frames of the exit
  exitLift: number; // em the text lifts as it leaves
  holdBase: number; // hold after resolve: max(holdMin, holdBase + holdPerWord * words)
  holdPerWord: number;
  holdMin: number;
  readMax: number; // a reading window counts as alive (not an event gap) for at most this long
  gapMin: number; // picture beat between two fragments of one chain, after the first is read
  gapMax: number;
  maxNewWords: number; // words per fragment
  maxVisibleBuild: number; // film words on screen at once
  maxVisibleReplace: number; // ... when every visible fragment replaces the last in place
  maxWordsPerSec: number; // words resolving in any 5 s window, per second
  avgWordsPerSec: number; // over the whole body of the film
  maxWords: number; // film words in total (kind: 'ui' strings are not counted)
  textShare: number; // share of body frames with film copy on screen
  freeRun: number; // frames: every 10 s holds a text-free picture beat at least this long
  maxGap: number; // frames without an event (reading windows count as covered)
  accentDur: number; // frames the newest fragment takes to relax from the accent to ink
  recentreDur: number; // frames of a build line's re-centre (exponential, time constant dur / 6)
  recentreLead: number; // frames the re-centre starts before the new fragment, so it lands in open space
  move: { base: number; perPx: number; camMin: number; camMax: number }; // durFor(): seconds
  fx: {
    mask: { stagger: number; dur: number; exitDur: number }; // MaskRise
    typeFPerChar: number; // TypeOn's default time box per character
    scramble: { stagger: number; rate: number; fadeIn: number }; // Scramble (an accent, never film copy)
    roll: { dur: number; roll: number }; // Roll: count length, one digit's slide
    morph: number; // Morph
    iris: number; // Iris
  };
};

export const PACE: Record<PaceName, Pace> = {
  calm: {
    wordDur: 36,
    stagger: 11,
    rise: 0.2,
    blur: 0,
    ease: 'outSoft',
    exit: 'together',
    exitDur: 24,
    exitLift: 0.12,
    holdBase: 42,
    holdPerWord: 8,
    holdMin: 60,
    readMax: 150,
    gapMin: 30,
    gapMax: 90,
    maxNewWords: 4,
    maxVisibleBuild: 8,
    maxVisibleReplace: 5,
    maxWordsPerSec: 1.2,
    avgWordsPerSec: 0.9,
    maxWords: 30,
    textShare: 0.65,
    freeRun: 90,
    maxGap: 72,
    accentDur: 24,
    recentreDur: 96,
    recentreLead: 36,
    move: { base: 0.5, perPx: 0.0016, camMin: 0.9, camMax: 3.0 },
    fx: {
      mask: { stagger: 10, dur: 38, exitDur: 22 },
      typeFPerChar: 3,
      scramble: { stagger: 5, rate: 1.0, fadeIn: 16 },
      roll: { dur: 90, roll: 18 },
      morph: 52,
      iris: 32,
    },
  },
  crisp: {
    wordDur: 26,
    stagger: 6,
    rise: 0.32,
    blur: 8,
    ease: 'out',
    exit: 'words',
    exitDur: 16,
    exitLift: 0.19,
    holdBase: 36,
    holdPerWord: 6,
    holdMin: 42,
    readMax: 120,
    gapMin: 18,
    gapMax: 90,
    maxNewWords: 5,
    maxVisibleBuild: 10,
    maxVisibleReplace: 10,
    maxWordsPerSec: 2.0,
    avgWordsPerSec: 1.2,
    maxWords: 35,
    textShare: 0.8,
    freeRun: 60,
    maxGap: 48,
    accentDur: 14,
    recentreDur: 60,
    recentreLead: 20,
    move: { base: 0.35, perPx: 0.00135, camMin: 0.6, camMax: 2.4 },
    fx: {
      mask: { stagger: 5, dur: 30, exitDur: 16 },
      typeFPerChar: 2,
      scramble: { stagger: 3, rate: 1.5, fadeIn: 10 },
      roll: { dur: 60, roll: 14 },
      morph: 40,
      iris: 24,
    },
  },
};

/** Words in a string, as every check counts them (whitespace-separated). */
export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Frames (60 fps) a fragment of `words` words holds after it resolves: max(holdMin, holdBase + holdPerWord * words). */
export const holdFor = (words: number, p: Pace) => Math.max(p.holdMin, p.holdBase + p.holdPerWord * words);

/** Frames (60 fps) from a fragment's first word starting to its last word fully in: (words - 1) * stagger + wordDur. */
export const revealFor = (words: number, p: Pace) => Math.max(0, words - 1) * p.stagger + p.wordDur;

/** The fields of a COPY entry that the reading windows need. */
export type ReadEntry = { id: string; text: string; in: number; resolved: number; out?: number | null; chain?: string; mode?: string };

/**
 * The reading windows of every COPY entry: the frames in which it is being read, as half-open
 * [from, to) ranges of the film's own frames, keyed by COPY id. The one rule every check shares
 * (timeline.ts exports it as READ; export-cues.ts writes it into out/cues.json as each copy
 * entry's `read`; grid-check, layout-audit, measure-speed and forensics read it from there):
 * - an entry is read from `resolved` for at most `readMax` frames, and never past its `out`;
 * - an earlier fragment of a chain (build or replace) is read for its own hold, holdFor(its
 *   words), and never past the next fragment's `in` or its own `out`: the picture beat between
 *   two fragments is the picture's turn, not a read;
 * - in a build chain the whole line is read again once its last fragment resolves, so every
 *   fragment of the chain also carries the line's window [last.resolved, out), capped at readMax.
 * `fps` converts the 60 fps pace numbers; `total` stands in for a missing `out`.
 */
export const readingWindows = (copy: ReadEntry[], p: Pace, fps = 60, total = Infinity): Record<string, [number, number][]> => {
  const s = fps / 60;
  const cap = Math.round(p.readMax * s);
  const out: Record<string, [number, number][]> = {};
  for (const c of copy) {
    const end = c.out ?? total;
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + Math.round(holdFor(wordCount(c.text), p) * s), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out ?? total, last.resolved + cap)] : null;
    const w: [number, number][] = line ? [own, line] : [own];
    out[c.id] = w.filter(([a, b]) => b > a);
  }
  return out;
};

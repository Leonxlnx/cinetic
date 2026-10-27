// The film's pace: how fast text arrives, how long it holds, how much of it is on screen at once,
// and the default durations of every text component. Two profiles, both in 60 fps frames (convert
// with f60() at the point of use):
// - calm (the house default): fragments of 1-4 words. Each word fades in over 32 f on E.snapOut
//   while it rises a third of the line box over 25 f on M.rise, 12 f apart on the reading cadence
//   (a longer word earns a longer gap), no blur. A fragment holds at least 1 s (house range for a
//   fragment's hold: 0.6-1.2 s; calm sits at the slow end, about 1.0-1.5 s) and takes turns with
//   the picture. A build line re-centres with a jump (22 f on E.jump, no lead); exits accelerate
//   (into a cut or a mask at full opacity, otherwise with a short fade in the move's last half);
//   the newest fragment holds the accent 18 f, then cools to ink linearly over 13 f in OKLab (its hue held:
//   an sRGB mix drifts it on the way to ink).
// - crisp: the denser launch tempo (26 f entrances, 8 f apart, faster exits) for briefs that ask
//   for energy: teasers, drops, dev-tool launches.
// src/timeline.ts picks one with PACE_NAME; the components read their defaults from the film
// context (src/lib/film.ts), and scripts/grid-check.ts checks COPY against the same numbers.
// scripts/gen-pace.mjs copies the check numbers into grid-check.ts and export-cues.ts and the whole
// pace into the HyperFrames motion.js (run it after editing PACE; scripts/test/mirror.test.mjs fails
// while they differ). Pure data and arithmetic with no imports, so Node scripts load it through
// timeline.ts.

export type PaceName = 'calm' | 'crisp';

/** The easing token (lib/anim.ts E) a word fades in on. 'outSoft' and 'out' are the 1.1 choices. */
export type PaceEase = 'snapOut' | 'glideOut' | 'settleOut' | 'softOut' | 'outSoft' | 'out';

/**
 * Every knob in 60 fps frames. The knobs marked 1.2 are optional in the type, so a pace object
 * written for 1.1 still type-checks and renders; a component reads a missing one as its 1.1
 * behaviour (riseUnit 'em', cadence 'even', exit as `exit` says, accent over accentDur).
 */
export type Pace = {
  wordDur: number; // frames one word takes to fade in (and, in 1.1 components, to rise)
  stagger: number; // frames between the starts of two words of a fragment (the mean gap on the reading cadence)
  rise: number; // how far a word rises: in em (riseUnit 'em', 1.1) or as a share of the line box (riseUnit 'line')
  riseUnit?: 'em' | 'line'; // 1.2
  riseDur?: number; // 1.2: frames of the rise, on M.rise (the fade keeps wordDur on `ease`)
  blur: number; // px of entry blur (0: none; blur on calm type reads as a gimmick)
  ease: PaceEase; // the E token a word fades in on
  cadence?: 'even' | 'reading'; // 1.2: even gaps, or each gap from the previous word's length (lib/cadence.ts reading())
  exit: 'together' | 'words' | 'launch' | 'launchFade' | 'auto'; // 1.1: together | words. 1.2: launch (full opacity into a cut or mask), launchFade (an 8-12 f fade in the move's last half), auto (launch into a cut or mask, else launchFade)
  exitDur: number; // frames of the exit
  exitFade?: number; // 1.2: frames of a launchFade exit's opacity drop
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
  accentDur: number; // frames the newest fragment shows the accent before it is ink again (1.1 components: an eased relax over this; 1.2: accentHold + accentCool)
  accentHold?: number; // 1.2: frames the accent holds after the fragment lands
  accentCool?: number; // 1.2: frames of the linear cool to ink
  accentSpace?: 'srgb' | 'oklab'; // 1.2: the space the cool is linear in (lib/color.ts accentFade; house OKLab, which holds the hue)
  recentre?: 'jump' | 'glide' | 'slot'; // 1.2: how a build line makes room (jump: E.jump, lead 0; glide: 1.1 E.expo; slot: opens recentreLead early)
  recentreDur: number; // frames of a build line's re-centre
  recentreLead: number; // frames the re-centre starts before the new fragment (0 for a jump)
  move: { base: number; perPx: number; camMin: number; camMax: number }; // durFor(): seconds
  fx: {
    mask: { stagger: number; dur: number; exitDur: number; head?: 'ease' | 'linearStop'; lastScale?: number }; // MaskRise (1.2: a linear head that stops dead; the last word takes lastScale x dur)
    typeFPerChar: number; // TypeOn's default time box per character (2 f = 30 characters a second)
    scramble: { stagger: number; rate: number; fadeIn: number; order?: 'ltr' | 'random' | 'centre'; rateHz?: number }; // Scramble: frames per lock, glyph changes per frame, fade-in (1.2: lock order, glyph changes per second per cell)
    roll: { dur: number; roll: number }; // Roll: count length, one digit's slide
    morph: number; // Morph
    iris: number; // Iris: frames
    irisMode?: { mode: 'ease' | 'rate'; ratio: number }; // 1.2: rate mode grows the radius by `ratio` a frame (at 60 fps)
  };
};

export const PACE: Record<PaceName, Pace> = {
  calm: {
    wordDur: 32,
    stagger: 12,
    rise: 0.33,
    riseUnit: 'line',
    riseDur: 25,
    blur: 0,
    ease: 'snapOut',
    cadence: 'reading',
    exit: 'auto',
    exitDur: 17,
    exitFade: 10,
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
    accentDur: 31,
    accentHold: 18,
    accentCool: 13,
    accentSpace: 'oklab',
    recentre: 'jump',
    recentreDur: 22,
    recentreLead: 0,
    move: { base: 0.5, perPx: 0.0016, camMin: 0.9, camMax: 3.0 },
    fx: {
      mask: { stagger: 10, dur: 10, exitDur: 22, head: 'linearStop', lastScale: 2.8 },
      typeFPerChar: 2,
      scramble: { stagger: 3, rate: 1.0, fadeIn: 16, order: 'centre', rateHz: 10 },
      roll: { dur: 90, roll: 18 },
      morph: 52,
      iris: 18,
      irisMode: { mode: 'rate', ratio: 1.28 },
    },
  },
  crisp: {
    wordDur: 26,
    stagger: 8,
    rise: 0.33,
    riseUnit: 'line',
    riseDur: 22,
    blur: 0,
    ease: 'snapOut',
    cadence: 'reading',
    exit: 'auto',
    exitDur: 14,
    exitFade: 8,
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
    accentDur: 20,
    accentHold: 7,
    accentCool: 13,
    accentSpace: 'oklab',
    recentre: 'jump',
    recentreDur: 16,
    recentreLead: 0,
    move: { base: 0.35, perPx: 0.00135, camMin: 0.6, camMax: 2.4 },
    fx: {
      mask: { stagger: 8, dur: 10, exitDur: 16, head: 'linearStop', lastScale: 2.8 },
      typeFPerChar: 2,
      scramble: { stagger: 3, rate: 1.5, fadeIn: 10, order: 'centre', rateHz: 10 },
      roll: { dur: 60, roll: 14 },
      morph: 40,
      iris: 18,
      irisMode: { mode: 'rate', ratio: 1.28 },
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

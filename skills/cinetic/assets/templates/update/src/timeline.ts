// The single source of truth for time, for an update film ("vX is out"): the name and the version, one act per change
// (each a picture and a line in its own shape, src/deal.ts SHAPES, its card brought in by a creative device where one
// fits, src/deal.ts PICTURE), the recap of every change and the end card built from it. Picture (src/acts), sound
// (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts live in src/update.ts;
// this file only places them on the grid. Think in bars and beats, never in seconds. Keep it free of React and CSS
// imports: Node scripts load it directly.
import { CREATIVE_PLAYS, DEAL, entranceAt, EXIT60, LINE_DEVICE, LINES, type Move, PICTURE, RESOLVE60, type Shape, SHAPES } from './deal';
import { CREATIVE_IDS, lineResolve } from './fx/creative/meta';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { spokenChange, UPDATE } from './update';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track (`python3 scripts/audio/track.py fit`), BPM becomes the track's and b() follows its bars.
 */
export { MUSIC } from './music';

// deal.ts writes the library out to stay standalone: it must name the starter's devices, every one
{
  const mine = Object.keys(CREATIVE_PLAYS);
  const miss = (CREATIVE_IDS as readonly string[]).filter((x) => !mine.includes(x));
  const extra = mine.filter((x) => !(CREATIVE_IDS as readonly string[]).includes(x));
  if (miss.length || extra.length) throw new Error(`timeline: src/deal.ts CREATIVE_PLAYS is out of step with fx/creative/meta.ts (${[...miss.map((x) => `missing ${x}`), ...extra.map((x) => `unknown ${x}`)].join(', ')})`);
}

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites
 * the `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The film's pace (src/lib/pace.ts): an update film is short and runs at the crisp launch tempo. */
export const PACE_NAME: PaceName = 'crisp';

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body (the track's own final hit ringing out, 1.5-2.5 s). The version
 * lands on that bar line (CUE.lockup), so the tail is also the end card's hold: that, and at least 1.5 s.
 */
export const TAIL = Math.max(Math.round(1.5 * FPS), MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0);

/** How many changes the film shows (2-4, from src/update.ts). */
export const N = UPDATE.changes.length;
/** Absolute frame of the n-th beat from the film's first downbeat (sub = 16ths): a whole frame on the grid. */
export const beat = (n: number, sub = 0) => b(1 + Math.floor(n / 4), n % 4, sub);
/** Absolute frame of a fractional beat position, on the 16th grid (2.25 = the second 16th of beat 2). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  return beat(Math.floor(q / 4), q % 4);
};

/** Frames from a move's start until a line of `n` words is read (src/deal.ts RESOLVE60, at this film's fps). */
export const resolveSpan = (move: Move, n: number): number => Math.ceil(f60x(RESOLVE60[move][Math.min(8, Math.max(1, n)) - 1])) + 1;
/** The move this film dealt a line (src/deal.ts LINES). */
export const moveOf = (id: string): Move => LINES.move[id] ?? LINES.voice;
/** Frames a line's exit takes (the film's one whole-line exit). */
export const EXIT_F = f60(EXIT60[LINES.exitVoice]);
/** How long the version's changed numerals take to roll (60 fps frames). */
export const ROLL = 18;
/**
 * The key word of change i's line (the one a line device sets apart: scale-contrast sets it huge, letter-swing swings
 * its letters, word-swap rolls it): the last word of the change's key, else the line's longest word.
 */
export const heroWord = (i: number): number => {
  const words = spokenChange(UPDATE.changes[i]).split(/\s+/);
  const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (UPDATE.changes[i].key ?? '').split(/\s+/).map(bare).filter(Boolean);
  const last = key.length ? words.map(bare).lastIndexOf(key[key.length - 1]) : -1;
  return last >= 0 ? last : words.reduce((b, w, j) => (bare(w).length > bare(words[b]).length ? j : b), 0);
};
/** Change i's line is the field line set as the library's scale-contrast. */
export const scaled = (i: number) => LINE_DEVICE[i] === 'scale-contrast';
/** Frames from a change line's first frame until it is read whole: its move, or its line device's letters and rows. */
const resolveOfChange = (i: number, n: number) => {
  const dev = LINE_DEVICE[i];
  if (!dev) return resolveSpan(moveOf(`change${i + 1}`), n);
  const words = spokenChange(UPDATE.changes[i]).split(/\s+/);
  return Math.ceil(f60x(lineResolve(dev, n, words[heroWord(i)].length, UPDATE.changes[i].swap?.length ?? 0) ?? 40)) + 1;
};
/** Frames change i's line needs on screen: its move to the last word, then the pace's read of its words. */
const readOf = (i: number) => {
  const n = wordCount(spokenChange(UPDATE.changes[i]));
  return resolveOfChange(i, n) + f60(holdFor(n, PACE[PACE_NAME]));
};

// ---- how each card comes in
/**
 * How change i's card arrives: `device` (a creative entrance from fx/creative brings it: src/deal.ts PICTURE), `rise` or
 * `open` (the dealt arrival, src/deal.ts arrive), `field` (the colour field before it closes into it), `morph` (the
 * element that changed on the card before it grows into this card: one picture handing over to the next), `gap` (split:
 * it grows out of its line's gap).
 */
export type Arrival = 'device' | 'rise' | 'open' | 'field' | 'morph' | 'gap';
export const ARRIVAL: Arrival[] = SHAPES.map((s, i) => {
  if (s === 'split') return 'gap';
  if (!entranceAt(SHAPES, i)) return 'morph';
  const p = PICTURE[i];
  if (p && CREATIVE_PLAYS[p].play === 'entrance') return 'device';
  if (i > 0 && SHAPES[i - 1] === 'after') return 'field';
  return DEAL.arrive as 'rise' | 'open';
});
/** The picture device that plays on change i's card at rest (cursor-follow), or null. */
export const SCENE_DEVICE: (string | null)[] = PICTURE.map((p) => (p && CREATIVE_PLAYS[p].play === 'scene' ? p : null));
/**
 * An entrance device's length (f@60) from its first frame until the card is at rest: long enough for its own steps (the
 * tiles' wave, the morph's shapes and opening, the turn, the bubbles popping and being drawn in, the row of photos
 * landing and opening, the old way beside the product and the divider sweeping out, the orbit collapsing).
 */
export const DEV60: Record<string, number> = { 'object-turn': 52, 'pixel-assemble': 100, 'shape-morph': 124, 'bubble-swarm': 132, 'photo-arc': 140, 'split-compare': 150, 'logo-orbit': 140 };
/** The frame (from the device's start) of an entrance device's own moment, so it lands inside its window (`hits`). */
export const devHits = (id: string, len: number, i: number): number[] | undefined => {
  const k = FPS / 60;
  const n = Math.min(7, UPDATE.changes[i].before?.length ?? 0);
  if (id === 'bubble-swarm') return [Math.round(len - ((n - 1) * 3 + 24 + 10) * k)];
  if (id === 'photo-arc') return [Math.round(len - (8 + 32 + 6) * k)];
  if (id === 'split-compare') return [Math.round(len - (26 + 6) * k)];
  if (id === 'logo-orbit') return [Math.round(len - (22 + 30 + 6) * k)];
  return undefined;
};
/** cursor-follow on a card at rest (f@60): the camera's push onto the pointer, its rest and travel before the click, the
 * press and pull back after it; the click is the change's hit. */
export const CURSOR60 = { push: 26, hold: 6, travel: 38, after: 52, zoom: 2.2, reach: 0.2 } as const;
const CURSOR_PRE = f60(CURSOR60.push + CURSOR60.hold + CURSOR60.travel + 2);
/**
 * Where change i's moment starts when a creative entrance brings its card (frames from the film's start): inside the
 * device when the device shows the product working (bubble-swarm: the rows land as the questions are drawn in;
 * split-compare: the product works in its half while the old way still waits; photo-arc: the screen fills as the chosen
 * photo opens into it), else once the card is at rest.
 */
const deviceGo = (i: number, c0: number, c1: number) => {
  if (ARRIVAL[i] !== 'device') return c1;
  const id = PICTURE[i]!;
  const h = devHits(id, c1 - c0, i);
  if (id === 'bubble-swarm' && h) return c0 + h[0] + f60(4);
  if (id === 'split-compare') return c0 + f60(46);
  if (id === 'photo-arc' && h) return c0 + h[0] + f60(8 + 16); // the chosen photo's screen fills as it opens
  return c1;
};
/** Frames a card's arrival takes. */
const arrivalFrames = (i: number) => (ARRIVAL[i] === 'device' ? f60(DEV60[PICTURE[i]!] ?? 120) : Math.max(f60(30), Math.round(BEAT)));
/** Frames the card takes to fold shut into the bar of light its line rises from. */
export const FOLD = f60(26);

/**
 * Each change's frames (absolute), by its shape. `card`: the window the card arrives in (its arrival, ARRIVAL); `gap`:
 * split only, the card shrinking into (or, first, opening in) the gap between its line's words; `fold`: the card closing
 * into the bar of light its line rises from (show: its own card; lead: the card before it); `go`: the moment's first
 * action; `hit`: the state change; `res`, `res2`: the result's details landing; `say` and `out`: its line in and
 * leaving; `field`: after only, the colour field grown out of the changed element from `in`, closing over `close` into
 * the next card (or the device that brings it, or the recap); `live`: the result's later beats while it holds;
 * `device`: the creative device's window (an entrance: the card's arrival; cursor-follow: its push to its pull back).
 */
export type ChangeTimes = {
  i: number; shape: Shape; from: number; to: number; arrival: Arrival; card: [number, number]; gap?: [number, number]; fold?: [number, number];
  go: number; hit: number; res: number; res2: number; live: number[]; say: number; out: number;
  field?: { in: number; grow: number; mid: number; close: [number, number]; into: 'card' | 'dot' | 'recap' };
  device?: { id: string; from: number; to: number; kind: 'entrance' | 'scene'; hits?: number[] };
};

const HOOK_BEATS = 4;
/** When the name and the version leave: a beat before the first change, so its line or card starts as they lift. */
const HOOK_OUT = bt(HOOK_BEATS - 0.75);
/**
 * House numbers: the result held at least `result` s after the state change (`resultThen` when the change's line follows
 * the picture, so the card's result is read again in the words), a picture beat under `picture` s, a line on screen
 * under `line` s.
 */
const SHOW = { result: 1.6, resultThen: 1.05, picture: 3.6, line: 2.4 } as const;

/**
 * Each change's shape, planned from its own words, moment and device: whole half bars (a change starts on a bar's first
 * or third beat), as many as the shape needs, the slack shared out so no part outstays its read (the result held longer
 * while the picture beat is short, then the line). The last change takes what squares the changes up to a bar line, so
 * the recap's gather (the track's entry) and the version mark land on bar lines. `lastMin`: the last change's beats at least.
 */
const planAll = (lastMin: number) => {
  const out: (Omit<ChangeTimes, 'from' | 'to'> & { s: number; L: number })[] = [];
  let s = HOOK_BEATS;
  SHAPES.forEach((shape, i) => {
    const R = readOf(i);
    /** The first 16th (in beats) at or after frame f, from beat x0 on. */
    const g = (f: number, x0: number) => {
      let q = x0;
      while (bt(q) < f) q += 0.25;
      return q;
    };
    const cursor = !!SCENE_DEVICE[i];
    const act = Math.max(f60(36), 1.25 * BEAT, cursor ? CURSOR_PRE : 0); // the moment's action, from its first move to the state change
    // whole half bars, two bars at least: the act is as long as its content asks (the last as long as squares the film up)
    const bars = (endF: number, x0: number) => Math.max(8, i === SHAPES.length - 1 ? lastMin : 0, 2 * Math.ceil((g(endF, x0) - s) / 2));
    const liveOf = (hit: number, endB: number) => {
      const l: number[] = [];
      for (let q = hit + 2.5; q <= endB - 0.5; q += 1) l.push(bt(q));
      return l;
    };
    const arrF = arrivalFrames(i);
    const device = (c0: number, c1: number, go: number, hit: number): ChangeTimes['device'] => {
      if (ARRIVAL[i] === 'device') return { id: PICTURE[i]!, from: c0, to: c1, kind: 'entrance', hits: devHits(PICTURE[i]!, c1 - c0, i) };
      if (cursor) return { id: SCENE_DEVICE[i]!, from: go, to: hit + f60(CURSOR60.after), kind: 'scene' };
      return undefined;
    };
    if (shape === 'split') {
      // the line arrives parted round the card: the card shrinks into the gap as the words arrive (the first change's
      // card opens there from a hairline once the words are in), the words are read, they leave, and the card grows out
      // of the gap to full size and works
      const resolve = resolveSpan(moveOf(`change${i + 1}`), wordCount(spokenChange(UPDATE.changes[i])));
      const plan = (d: number, e: number) => {
        const sayB = (i === 0 ? s : s + 0.25) + d;
        const say = bt(sayB);
        const gap: [number, number] = i === 0 ? [bt(g(say + 0.45 * resolve, sayB)), say + resolve + f60(10)] : [bt(s + d), Math.max(bt(s + d) + f60(32), say + resolve)];
        const outB = g(Math.max(say + R, gap[1] + f60(24)), sayB) + e;
        const c0 = bt(outB) + Math.round(0.3 * EXIT_F); // the words are leaving: the card grows from the gap as they go
        const c1 = g(c0 + f60(32), outB);
        const go = g(bt(c1) - f60(6), outB);
        return { say, gap, outB, c0, c1, go, hit: g(bt(go) + act, go) };
      };
      const p0 = plan(0, 0);
      const L = bars(bt(p0.hit) + SHOW.result * FPS, p0.hit);
      const slack = Math.max(0, s + L - g(bt(p0.hit) + SHOW.result * FPS, p0.hit));
      const third = Math.floor((slack * 4) / 3) / 4;
      const { say, gap, outB, c0, c1, go, hit } = plan(i > 0 ? third : 0, i > 0 ? third : 2 * third);
      out.push({ s, L, i, shape, arrival: ARRIVAL[i], gap, card: [c0, bt(c1)], go: bt(go), hit: bt(hit), res: bt(hit + 0.75), res2: bt(hit + 1.75), live: liveOf(hit, s + L), say, out: bt(outB), device: device(c0, bt(c1), bt(go), bt(hit)) });
    } else if (shape === 'lead') {
      // the card before folds shut into the bar of light, the line rises from it alone, it leaves, and this change's
      // card comes in (its device, or the dealt arrival) and works
      const fold: [number, number] = [bt(s), bt(s) + FOLD];
      const sayB = g(fold[1] - f60(6), s);
      const outB = g(bt(sayB) + R, sayB);
      const c0 = bt(outB) + Math.round(0.3 * EXIT_F);
      const c1B = g(c0 + arrF, outB);
      const goB = g(deviceGo(i, c0, bt(c1B)), outB);
      const hitB = g(bt(goB) + act, goB);
      const L = bars(Math.max(bt(hitB) + SHOW.result * FPS, bt(c1B) + f60(40)), hitB);
      out.push({ s, L, i, shape, arrival: ARRIVAL[i], fold, card: [c0, bt(c1B)], go: bt(goB), hit: bt(hitB), res: bt(hitB + 0.75), res2: bt(hitB + 1.75), live: liveOf(hitB, s + L), say: bt(sayB), out: bt(outB), device: device(c0, bt(c1B), bt(goB), bt(hitB)) });
    } else {
      // show / after: the picture first (the card arrives and works, the result holds), then its line: risen from the
      // bar the card folds into (show), or read on the colour field the changed element grows into (after)
      const c0 = i === 0 ? bt(s) - f60(10) : bt(s); // out of the hook: the card starts as the pair has all but gone
      const c1B = g(c0 + arrF, s);
      const goB = g(deviceGo(i, c0, bt(c1B)), s);
      const hitB = g(bt(goB) + act, goB);
      let recB = g(Math.max(bt(hitB) + SHOW.resultThen * FPS, bt(c1B) + f60(40)), hitB);
      const tail = (rec: number, grow: number) => {
        // after: the field grows from rec over `grow` beats, the line on it; show: the fold, the line from the bar
        const sayF = shape === 'after' ? bt(rec + grow) : bt(rec) + FOLD - f60(6);
        const sayB = g(sayF, rec);
        const outB = g(bt(sayB) + R, sayB);
        return { sayB, outB, end: bt(outB) + Math.round(0.35 * EXIT_F) }; // what comes next starts as the line leaves
      };
      let grow = 0.75;
      const t0 = tail(recB, grow);
      const L = bars(t0.end, t0.outB);
      // the slack: to the result's hold while the picture beat stays under SHOW.picture s, then (after) to the field's
      // growth (a slower designed move, up to two beats), then to the line's hold, and what is left to the result
      const slack = Math.max(0, s + L - g(t0.end, t0.outB));
      const room = Math.max(0, (SHOW.picture * FPS - (bt(recB) - c0)) / BEAT);
      const toRes = Math.floor(Math.min(slack, room) * 4) / 4;
      recB += toRes;
      let left = slack - toRes;
      if (shape === 'after') {
        const more = Math.floor(Math.min(1.25, left) * 4) / 4;
        grow += more;
        left -= more;
      }
      const lineRoom = Math.max(0, (SHOW.line * FPS - R) / BEAT);
      const toLine = Math.floor(Math.min(left, lineRoom) * 4) / 4;
      left -= toLine;
      recB += Math.floor(left * 4) / 4;
      const t1 = tail(recB, grow);
      const outB = Math.min(s + L - (0.35 * EXIT_F) / BEAT, t1.outB + toLine);
      const field = shape === 'after' ? { in: bt(recB), grow: bt(recB + grow) - bt(recB), mid: bt(recB + Math.floor(grow * 2) / 4), close: [0, 0] as [number, number], into: 'card' as const } : undefined;
      out.push({
        s, L, i, shape, arrival: ARRIVAL[i], card: [c0, bt(c1B)], go: bt(goB), hit: bt(hitB), res: bt(hitB + 0.75), res2: bt(hitB + 1.75), live: liveOf(hitB, recB),
        ...(shape === 'show' ? { fold: [bt(recB), bt(recB) + FOLD] as [number, number] } : {}),
        field, say: bt(t1.sayB), out: bt(Math.max(outB, g(bt(t1.sayB) + R, t1.sayB))), device: device(c0, bt(c1B), bt(goB), bt(hitB)),
      });
    }
    s += out[out.length - 1].L;
  });
  // the colour field closes into what comes next: the next card as it arrives, a dot at its centre that the device
  // bringing it starts from, or the recap's slot
  for (const p of out) if (p.field) {
    const next = out[p.i + 1];
    if (!next) p.field = { ...p.field, close: [bt(s), bt(s) + Math.round(BEAT)], into: 'recap' };
    else if (next.arrival === 'device') p.field = { ...p.field, close: [next.card[0], next.card[0] + f60(22)], into: 'dot' };
    else p.field = { ...p.field, close: [next.card[0], next.card[1]], into: 'card' };
  }
  return out;
};
const PLAN = (() => {
  const p0 = planAll(0);
  const rem = (HOOK_BEATS + p0.reduce((a, p) => a + p.L, 0)) % 4;
  return rem ? planAll(p0[p0.length - 1].L + 4 - rem) : p0;
})();
const START = PLAN.map((p) => p.s);
const BODY_CHANGES = PLAN.reduce((a, p) => a + p.L, 0);
/** The recap holds one bar (the changes end on a bar line), so the end card starts on a downbeat. */
const RECAP_BEATS = 4 + ((4 - ((HOOK_BEATS + BODY_CHANGES) % 4)) % 4);
const END_BEATS = 4;
/** Where each act starts, in beats: the hook one bar, each change its planned bars, the recap, the end card one bar. */
export const BEATS = {
  hook: 0,
  change: (i: number) => (i < N ? START[i] : HOOK_BEATS + BODY_CHANGES),
  payoff: HOOK_BEATS + BODY_CHANGES,
  end: HOOK_BEATS + BODY_CHANGES + RECAP_BEATS,
  last: HOOK_BEATS + BODY_CHANGES + RECAP_BEATS + END_BEATS,
} as const;
/** The film's bars in the body (track.py fit reads it with REVEAL and ACT.end to cut the track to the picture). */
export const BARS = BEATS.last / 4;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order).
export const ACT: Record<string, { from: number; dur: number }> = {
  hook: { from: 0, dur: beat(BEATS.change(0)) },
  ...Object.fromEntries(UPDATE.changes.map((_c, i) => [`change${i + 1}`, { from: beat(BEATS.change(i)), dur: beat(BEATS.change(i + 1)) - beat(BEATS.change(i)) }])),
  payoff: { from: beat(BEATS.payoff), dur: beat(BEATS.end) - beat(BEATS.payoff) },
  end: { from: beat(BEATS.end), dur: beat(BEATS.last) + TAIL - beat(BEATS.end) },
};

export const TOTAL = beat(BEATS.last) + TAIL;

/** The act of change i (0-based). */
export const changeAct = (i: number) => ACT[`change${i + 1}`];

export const TIMES: ChangeTimes[] = PLAN.map(({ s, L, ...t }) => ({ ...t, from: bt(s), to: bt(s + L) }));
/** Whether the last change ends on its picture (split, lead): the carried card goes on into the recap. */
export const ENDS_ON_PICTURE = !['show', 'after'].includes(SHAPES[N - 1]);

/** The hook's frames: the name, the version (rolling or rising), the pair leaving as the first change arrives. */
export const HOOK = (() => {
  return { name: 0, version: bt(1), roll: bt(1), out: HOOK_OUT };
})();

/** The recap and the end card's frames. */
export const CLOSE = (() => {
  const P = BEATS.payoff;
  const E = BEATS.end;
  return {
    gather: beat(P), // the last card shrinks into its place in the row; the others arrive beside it
    recapIn: bt(P + 1.25), // every change readable from here (at least 1 s before the fold)
    recapGlint: bt(P + 2.5), // a light runs along the row's states while it is read ...
    recapGlints: UPDATE.changes.map((_, j) => bt(P + 2.5 + j)).filter((f) => f < beat(E) - BEAT / 2), // ... one card a beat
    fold: beat(E), // the cards gather into the mark (stack or fold)
    markIn: bt(E + 1), // the mark whole
    nameIn: bt(E + 1), // the name slides out of the mark as it lands ...
    named: bt(E + 1.75), // ... and is read
    versionIn: bt(E + 3.25), // the version moves in after the name ...
    lockup: beat(BEATS.last), // ... and lands on the last bar line: the track's final hit (the music resolves on it)
  };
})();

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into sound.
/** A device's own beats (an entrance bringing a card in): its steps on the 16th grid, at most 20 f apart. */
const DEVICE_CUES: [string, number][] = TIMES.flatMap((t) => {
  if (t.device?.kind === 'scene') {
    const q = (f: number) => bt(Math.round((f / BEAT) * 4) / 4);
    return [[`dev${t.i}_travel`, q(t.hit - f60(CURSOR60.travel + 2))], [`dev${t.i}_pull`, q(t.hit + f60(24))]] as [string, number][];
  }
  if (!t.device || t.device.kind !== 'entrance') return [];
  const { from, to } = t.device;
  const n = Math.max(1, Math.ceil((to - from) / 20));
  const seen = new Set<number>();
  return Array.from({ length: n }, (_, k) => bt(Math.round((((from + (k * (to - from)) / n) / BEAT) * 4)) / 4))
    .filter((f) => f >= from && f < to && !seen.has(f) && (seen.add(f), true))
    .map((f, k) => [`dev${t.i}_${k}`, f] as [string, number]);
});

export const CUE: Record<string, number> = {
  roll: HOOK.roll, // 'roll': the changed numerals roll to the new version
  rise: HOOK.version, // 'rise': the version rises out of its mask after the name
  hookOut: HOOK.out,
  ...Object.fromEntries(DEVICE_CUES),
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, t.from],
      [`in${t.i}`, t.card[1]],
      [`go${t.i}`, t.go],
      [`hit${t.i}`, t.hit],
      [`res${t.i}`, t.res],
      [`res2${t.i}`, t.res2],
      ...t.live.map((f, k) => [`live${t.i}_${k}`, f]),
      [`say${t.i}`, t.say],
      [`out${t.i}`, t.out],
      ...(t.gap ? [[`gap${t.i}`, t.gap[0]]] : []),
      ...(t.fold ? [[`fold${t.i}`, t.fold[0]]] : []),
      ...(t.field ? [[`field${t.i}`, t.field.in], ...(t.field.mid > t.field.in ? [[`spread${t.i}`, t.field.mid]] : []), [`close${t.i}`, t.field.close[0]]] : []),
    ]),
  ),
  gather: CLOSE.gather,
  recapIn: CLOSE.recapIn,
  recapGlint: CLOSE.recapGlint,
  ...Object.fromEntries(CLOSE.recapGlints.slice(1).map((f, j) => [`recapGlint${j + 1}`, f])),
  fold: CLOSE.fold,
  markIn: CLOSE.markIn,
  nameIn: CLOSE.nameIn,
  versionIn: CLOSE.versionIn,
  lockup: CLOSE.lockup,
  glint: bt(BEATS.last + 0.5),
  rest: beat(BEATS.last + 1),
  end: beat(BEATS.last),
};

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band (lib/look.ts GRAMMAR.shot.band; grammar-score --format update reads the update band). */
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
/** One surface material per film, or none. */
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
/** How one shot hands over to the next. `hard` is a designed cut; `fadeEnd` only closes a film. */
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
export type Flash = { f: number; frames: 1 | 2; id: string };
export type CameraBlurRange = { from: number; to: number; id: string };
export type EndLock = { from: number; to: number };
export type ColourRange = { from: number; to: number; id: string };
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

/** One continuous stage: the product's cards hand over by carried elements (no hard cut). */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: true, whiteWorld: false };

/** The seam a creative entrance makes (what carries it). */
const DEVICE_SEAM: Record<string, Pick<Seam, 'kind' | 'carry'>> = {
  'object-turn': { kind: 'velocity', carry: 'rot' },
  'pixel-assemble': { kind: 'mask', carry: 'shape' },
  'shape-morph': { kind: 'morph', carry: 'shape' },
  'bubble-swarm': { kind: 'morph', carry: 'scale' },
  'photo-arc': { kind: 'velocity', carry: 'x' },
  'split-compare': { kind: 'wipe', carry: 'x' },
  'logo-orbit': { kind: 'morph', carry: 'scale' },
};

/**
 * Every seam, by what carries it: a card coming in (its creative device, rising, a hairline opening), the colour field
 * closing into the next card (or the dot the device starts from), the element that changed growing into the next card
 * (morph), a card folding into the bar of light its line rises from (morph), the card shrinking into its line's gap and
 * growing out of it, the changed element growing into the colour field, the last card into the recap row, the recap
 * gathering into the mark (the signature).
 */
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = [];
  TIMES.forEach((t, i) => {
    if (t.fold && t.shape === 'lead') out.push({ at: t.fold[0], kind: 'mask', carry: 'scale', id: `card-fold:card-into-line-${i + 1}` });
    if (t.arrival === 'device' && t.device) out.push({ at: t.card[0], ...DEVICE_SEAM[t.device.id], id: `creative:${t.device.id}-${i + 1}` });
    else if (t.arrival === 'rise') out.push({ at: t.card[0], kind: 'velocity', carry: 'y', dir: -1, id: `card-rise-${i + 1}` });
    else if (t.arrival === 'open') out.push({ at: t.card[0], kind: 'mask', carry: 'scale', id: `mask-grow:card-${i + 1}` });
    else if (t.arrival === 'field') out.push({ at: t.card[0], kind: 'morph', carry: 'shape', id: `card-expand:field-into-card-${i + 1}` });
    else if (t.arrival === 'morph') out.push({ at: t.card[0], kind: 'morph', carry: 'shape', id: `card-expand:element-into-card-${i + 1}` });
    else if (t.gap) {
      out.push(i === 0 ? { at: t.say, kind: 'breath', id: 'exitEnter:name-to-line' } : { at: t.gap[0], kind: 'morph', carry: 'scale', id: `sharedElement:card-into-line-${i + 1}` });
      out.push({ at: t.card[0], kind: 'zoomThrough', carry: 'scale', id: `card-expand:gap-to-screen-${i + 1}` });
    }
    if (t.field) out.push({ at: t.field.in, kind: 'colour', carry: 'shape', id: `card-expand:element-to-field-${i + 1}` });
    if (t.fold && t.shape === 'show') out.push({ at: t.fold[0], kind: 'mask', carry: 'scale', id: `card-fold:card-into-line-${i + 1}` });
  });
  const last = TIMES[N - 1];
  out.push(last.field ? { at: CLOSE.gather, kind: 'morph', carry: 'shape', id: 'card-expand:field-into-recap' } : ENDS_ON_PICTURE ? { at: CLOSE.gather, kind: 'morph', carry: 'shape', id: 'sharedElement:to-recap' } : { at: CLOSE.gather, kind: 'velocity', carry: 'y', dir: -1, id: 'recap-rise' });
  out.push({ at: CLOSE.fold, kind: 'morph', carry: 'shape', signature: true, id: 'recap-to-mark' });
  return out.sort((p, q) => p.at - q.at);
})();
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The film's one colour event: the field the 'after' change's line stands on, from the element growing into it to its close. */
export const COLOUR: ColourRange[] = TIMES.filter((t) => t.field).map((t) => ({ from: t.field!.in, to: t.field!.close[1], id: `field-${t.i + 1}` }));
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CLOSE.lockup, to: TOTAL };
/** The biggest reveal: the version landing in the lockup. */
export const REVEAL = CLOSE.lockup;
/** The one element class allowed an underdamped spring: the version landing in the lockup. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event: with a track, the recap and the version mark (both on bar lines). */
export const STRUCTURAL: string[] = MUSIC ? ['gather', 'lockup'] : [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  roll: 'hit',
  rise: 'hit',
  hookOut: 'copy',
  ...Object.fromEntries(DEVICE_CUES.map(([id]) => [id, 'move' as Salience])),
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, 'cut' as Salience],
      [`in${t.i}`, 'move' as Salience],
      [`go${t.i}`, 'hit' as Salience],
      [`hit${t.i}`, 'hit' as Salience],
      [`res${t.i}`, 'hit' as Salience],
      [`res2${t.i}`, 'hit' as Salience],
      ...t.live.map((_, k) => [`live${t.i}_${k}`, 'life' as Salience]),
      [`say${t.i}`, 'copy' as Salience],
      [`out${t.i}`, 'copy' as Salience],
      ...(t.gap ? [[`gap${t.i}`, 'move' as Salience]] : []),
      ...(t.fold ? [[`fold${t.i}`, 'move' as Salience]] : []),
      ...(t.field ? [[`field${t.i}`, 'cut' as Salience], ...(t.field.mid > t.field.in ? [[`spread${t.i}`, 'move' as Salience]] : []), [`close${t.i}`, 'move' as Salience]] : []),
    ]),
  ),
  ...Object.fromEntries(CLOSE.recapGlints.slice(1).map((_, j) => [`recapGlint${j + 1}`, 'life' as Salience])),
  gather: 'move', recapIn: 'hit', recapGlint: 'life', fold: 'move', markIn: 'hit', nameIn: 'copy', versionIn: 'move', lockup: 'hit', glint: 'life', rest: 'life', end: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows, not budgeted; 'name': the name or the version, not a line of the script
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};

const pace = PACE[PACE_NAME];

/** One line of copy on its dealt move, leaving at `out` (never before its read). */
export const line = (id: string, text: string, inF: number, out: number): Copy => {
  const n = wordCount(text);
  const ci = /^change(\d+)$/.exec(id);
  const resolved = inF + (ci ? resolveOfChange(Number(ci[1]) - 1, n) : resolveSpan(moveOf(id), n));
  const read = resolved + f60(holdFor(n, pace));
  return { id, text, in: inF, resolved, out: Math.max(out, read) };
};

// Every on-screen word: the name and the version together ("[Name] [version]": which product, which release, by 1 s),
// each change one short sentence that says the result the picture shows, one line at a time, then the name and the
// version again in the lockup. A word-swap's alternatives are on screen too (counted apart, as the product's words are).
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: 0, resolved: Math.max(HOOK.version + resolveSpan('mask', 1), HOOK.roll + f60(ROLL)), out: HOOK.out },
  ...UPDATE.changes.flatMap((c, i) => {
    const l = line(`change${i + 1}`, spokenChange(c), TIMES[i].say, TIMES[i].out);
    const alts = LINE_DEVICE[i] === 'word-swap' ? (c.swap ?? []).map((w, j): Copy => ({ id: `alt${i + 1}.${j + 1}`, text: w, kind: 'ui', in: l.in, resolved: l.in + f60(8), out: l.resolved - f60(8) })) : [];
    return [l, ...alts];
  }),
  { id: 'wordmark', text: UPDATE.name, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.named, out: TOTAL },
  { id: 'release', text: UPDATE.version, kind: 'name', in: CLOSE.versionIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name alone, then each change's picture and line (a creative entrance is its
 * own picture beat, then the product working; the line alone, on the field, or round the card in its gap), the recap,
 * the end card.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: HOOK.out + EXIT_F },
  ...TIMES.flatMap((t): Beat[] => {
    const id = `change${t.i + 1}`;
    const arrives: Beat[] = t.arrival === 'device' ? [{ id: `${id}-arrives`, kind: 'A', from: t.card[0], to: t.card[1] }] : [];
    const c0 = arrives.length ? t.card[1] : t.card[0];
    const lineB: Beat = { id, kind: 'T', from: t.say, to: t.out + EXIT_F };
    if (t.gap) return [{ id, kind: 'TA', from: t.say, to: t.out + EXIT_F }, { id: `${id}-works`, kind: 'A', from: t.card[0], to: t.to }];
    if (t.shape === 'lead') return [lineB, ...arrives, { id: `${id}-works`, kind: 'A', from: c0, to: t.to }];
    const pictureEnd = t.field ? t.field.in : t.fold ? t.fold[0] : t.say;
    return [...arrives, { id: `${id}-works`, kind: 'A', from: c0, to: pictureEnd }, lineB];
  }),
  { id: 'recap', kind: 'A', from: CLOSE.gather, to: CLOSE.fold },
  { id: 'end', kind: 'end', from: CLOSE.fold, to: TOTAL },
];

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};

/** The fragments of one chain, in order of arrival (kept for the starter's helpers). */
export const chainOf = (id: string): Copy[] => {
  const list = COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${id}"`);
  return list;
};

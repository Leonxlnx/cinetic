// The single source of truth for time, for an update film ("vX is out"): the name and the version, one act per change
// (each on its own beat shape, src/deal.ts SHAPES), the recap of every change and the end card built from it. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts live
// in src/update.ts; this file only places them on the grid. Think in bars and beats, never in seconds. Keep it free of
// React and CSS imports: Node scripts load it directly.
import { DEAL, EXIT60, FIELD_TYPE, LINES, type Move, RESOLVE60, type Shape, SHAPES } from './deal';
import { lineResolve, metaOf } from './fx/creative/meta';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { spokenChange, UPDATE } from './update';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track (`python3 scripts/audio/track.py fit`), BPM becomes the track's and b() follows its bars.
 */
export { MUSIC } from './music';

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
 * The word the 'after' line's scale-contrast sets huge (src/deal.ts FIELD_TYPE): the last word of the change's key, else
 * the line's longest word.
 */
export const heroWord = (i: number): number => {
  const words = spokenChange(UPDATE.changes[i]).split(/\s+/);
  const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (UPDATE.changes[i].key ?? '').split(/\s+/).map(bare).filter(Boolean);
  const last = key.length ? words.map(bare).lastIndexOf(key[key.length - 1]) : -1;
  return last >= 0 ? last : words.reduce((b, w, j) => (bare(w).length > bare(words[b]).length ? j : b), 0);
};
/** Change i's line is the library's scale-contrast composition on the colour field. */
export const scaled = (i: number) => SHAPES[i] === 'after' && FIELD_TYPE === 'scale-contrast';
/** Frames from a change line's first frame until it is read whole: its move, or the scale-contrast's letters and small rows. */
const resolveOfChange = (i: number, n: number) => (scaled(i) ? Math.ceil(f60x(lineResolve('scale-contrast', n, spokenChange(UPDATE.changes[i]).split(/\s+/)[heroWord(i)].length) ?? 40)) + 1 : resolveSpan(moveOf(`change${i + 1}`), n));
/** Frames change i's line needs on screen: its move to the last word, then the pace's read of its words. */
const readOf = (i: number) => {
  const n = wordCount(spokenChange(UPDATE.changes[i]));
  return resolveOfChange(i, n) + f60(holdFor(n, PACE[PACE_NAME]));
};

/**
 * Each change's frames (absolute), by its shape. `card`: the window the card arrives in (split: grows out of its line's
 * gap to full size); `gap`: split only, the card shrinking into (or, first, growing in) the gap between its line's words;
 * `go`: the moment's first action; `hit`: the state change; `res`, `res2`: the result's details landing; `say` and
 * `out`: its line in and leaving; `field`: after only, the colour field: grown out of the changed element from `in`,
 * closing into the next card (or the recap's slot) over `close`; `live`: the result's later beats while it holds (a
 * highlight moving on), so a long hold keeps acting while the camera stays still.
 */
export type ChangeTimes = { i: number; shape: Shape; from: number; to: number; card: [number, number]; gap?: [number, number]; go: number; hit: number; res: number; res2: number; live: number[]; say: number; out: number; field?: { in: number; grow: number; mid: number; close: [number, number] } };

const HOOK_BEATS = 4;
/**
 * The first card's arrival (src/deal.ts arrive) in beats on the 16th grid: one beat for the template's rise and open, a
 * creative library device (fx/creative) as long as its own motion runs before it rests on the card (ARRIVE60, f@60:
 * the turn's 44 f, the tiles' wave, land and close, the morph's steps and its opening, each with a short settle), or
 * its whole beat (meta.min) for a device this table does not know.
 */
const ARRIVE60: Record<string, number> = { 'object-turn': 46, 'pixel-assemble': 96, 'shape-morph': 120 };
export const ARRIVE_S: number | undefined = metaOf(DEAL.arrive) ? (ARRIVE60[DEAL.arrive] ?? 60 * (metaOf(DEAL.arrive)!.min ?? 2)) / 60 : undefined;
const ARRIVE_BEATS = ARRIVE_S ? Math.max(1, Math.ceil((ARRIVE_S * FPS + f60(10)) / (BEAT / 4)) / 4) : 1;
/** When the name and the version leave: a beat before the first change, so its line or card starts as they lift. */
const HOOK_OUT = bt(HOOK_BEATS - 0.75);
/** House numbers: the result held at least `result` s after the state change, the change working `working` s at most. */
const SHOW = { result: 1.6, working: 3.5 } as const;

/**
 * Each change's shape, planned from its own words and moment: whole bars (every change starts on a downbeat), as many as
 * the shape needs (a long line takes a longer act), the slack shared out so no part outstays its read. So the phrasing
 * breathes: the line and the picture take different shares and places in each shape and the acts take 2 or 3 bars as
 * their content asks, never one block repeated.
 */
const PLAN = (() => {
  const out: (Omit<ChangeTimes, 'from' | 'to'> & { s: number; L: number })[] = [];
  let s = HOOK_BEATS;
  SHAPES.forEach((shape, i) => {
    const R = readOf(i);
    const prev = i > 0 ? SHAPES[i - 1] : null;
    /** The first 16th (in beats) at or after frame f, from beat x0 on. */
    const g = (f: number, x0: number) => {
      let q = x0;
      while (bt(q) < f) q += 0.25;
      return q;
    };
    const act = Math.max(f60(36), 1.25 * BEAT); // the moment's action, from its first move to the state change
    // whole bars (every change starts on a downbeat, where the track's structure lands), two at least: the act is as long
    // as its content asks
    const bars = (endF: number, x0: number) => Math.max(8, 4 * Math.ceil((g(endF, x0) - s) / 4));
    /** The result's later beats from 2.5 beats after the hit, a beat apart, until half a beat before the hold ends. */
    const liveOf = (hit: number, endB: number) => {
      const l: number[] = [];
      for (let q = hit + 2.5; q <= endB - 0.5; q += 1) l.push(bt(q));
      return l;
    };
    const enter0 = bt(s) - (i === 0 ? f60(10) : 0); // out of the hook: the card starts as the pair has all but gone
    /** Beats from the act's start until the card is in place: one, or the creative library's arrival as long as it needs. */
    const arr = i === 0 ? ARRIVE_BEATS : 1;
    if (shape === 'split') {
      // the line arrives parted round the card: the card shrinks into the gap as the words arrive (the first change's
      // card grows there from a hairline once the words are in), the words are read, they leave, and the card grows out
      // of the gap to full size and works
      const resolve = resolveSpan(moveOf(`change${i + 1}`), wordCount(spokenChange(UPDATE.changes[i])));
      /** The shape from a delay `d` before the line (beats) and an extension `e` of its hold (beats). */
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
      // the whole bars leave slack: a third to the change before (its card holds a little longer), a third to the line in
      // its gap, a third to the result (the first change gives the first third to its line), so no part outstays its read
      const slack = Math.max(0, s + L - g(bt(p0.hit) + SHOW.result * FPS, p0.hit));
      const third = Math.floor((slack * 4) / 3) / 4;
      const { say, gap, outB, c0, c1, go, hit } = plan(i > 0 ? third : 0, i > 0 ? third : 2 * third);
      out.push({ s, L, i, shape, gap, card: [c0, bt(c1)], go: bt(go), hit: bt(hit), res: bt(hit + 0.75), res2: bt(hit + 1.75), live: liveOf(hit, s + L), say, out: bt(outB) });
    } else if (shape === 'after') {
      const go = s + arr;
      const hit = g(bt(go) + act, go);
      let rec = g(bt(hit) + SHOW.result * FPS, hit);
      const outB0 = g(bt(rec + 0.75) + R, rec + 0.75);
      const endF = bt(outB0) + EXIT_F + f60(6);
      const L = bars(endF, outB0);
      // the slack goes to the result's hold (the change keeps working) while the picture beat stays under 3.4 s, then to
      // the line on the field while it holds under 2.4 s, and what is left to the result again
      const slack = Math.max(0, s + L - g(endF, outB0));
      const room = Math.max(0, (3.4 * FPS - (bt(rec) - enter0)) / BEAT);
      rec += Math.floor(Math.min(slack, room) * 4) / 4;
      // past that, the changed element grows into the field more slowly (up to two beats: a designed move, never a
      // hold), and what is still left goes to the result
      const over = s + L - 0.5 + EXIT_F / BEAT - (rec + 0.75) - (2.4 * FPS) / BEAT;
      const grow = 0.75 + Math.min(1.25, Math.max(0, Math.floor(over * 4) / 4));
      if (over - (grow - 0.75) > 0) rec += Math.floor((over - (grow - 0.75)) * 4) / 4;
      const sayB = rec + grow;
      const outB = Math.max(g(bt(sayB) + R, sayB), s + L - 0.5); // it is leaving as the field starts to close: no empty field
      out.push({ s, L, i, shape, card: [enter0, bt(s + arr)], go: bt(go), hit: bt(hit), res: bt(hit + 0.75), res2: bt(hit + 1.75), live: liveOf(hit, rec), field: { in: bt(rec), grow: bt(rec + grow) - bt(rec), mid: bt(rec + Math.floor(grow * 2) / 4), close: [0, 0] }, say: bt(sayB), out: bt(outB) });
    } else {
      const sayB = prev === 'after' ? s + 1 : i === 0 && ARRIVE_S ? s + arr : s + 0.5; // after a field or a library arrival: once the card is in
      const go = s + arr;
      const hit = g(bt(go) + act, go);
      const L = bars(Math.max(bt(sayB) + R, bt(hit) + SHOW.result * FPS) + EXIT_F + f60(6), sayB);
      // the line leaves once it is read and the change has landed, so the card works alone for the rest (a picture beat)
      const early = Math.min(s + L - 0.75, Math.max(g(bt(sayB) + R, sayB), hit + 1.5));
      const outB = s + L - 0.75 - early >= FPS / BEAT ? early : s + L - 0.75; // a tail under a second is not worth a beat of its own
      out.push({ s, L, i, shape, card: [enter0, bt(s + arr)], go: bt(go), hit: bt(hit), res: bt(hit + 0.75), res2: bt(hit + 1.75), live: liveOf(hit, s + L), say: bt(sayB), out: bt(outB) });
    }
    s += out[out.length - 1].L;
  });
  // the colour field closes into whatever comes next: the next change's card as it arrives, or the recap's slot
  for (const p of out) if (p.field) {
    const next = out[p.i + 1];
    p.field.close = next ? [next.card[0], next.card[1]] : [bt(s), bt(s) + Math.round(BEAT)];
  }
  return out;
})();
const START = PLAN.map((p) => p.s);
const BODY_CHANGES = PLAN.reduce((a, p) => a + p.L, 0);
/** The recap holds one bar (more when the changes end off a bar line), so the end card starts on a downbeat. */
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
    recapGlint: bt(P + 2.5), // a light runs along the row's states while it is read
    fold: beat(E), // the cards gather into the mark (stack or fold)
    markIn: bt(E + 1), // the mark whole
    nameIn: bt(E + 1), // the name slides out of the mark as it lands ...
    named: bt(E + 1.75), // ... and is read
    versionIn: bt(E + 3.25), // the version moves in after the name ...
    lockup: beat(BEATS.last), // ... and lands on the last bar line: the track's final hit (the music resolves on it)
  };
})();

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into sound.
/** The creative arrival's own beats (a library device bringing the first card in): its steps on the 16th grid, at most 20 f apart. */
const ARRIVE_CUES: [string, number][] = (() => {
  const t = TIMES[0];
  if (!ARRIVE_S || t.gap) return [];
  const n = Math.max(1, Math.ceil((t.card[1] - t.card[0]) / 20));
  return Array.from({ length: n }, (_, k) => [`arrive${k}`, bt(Math.round((((t.card[0] + (k * (t.card[1] - t.card[0])) / n) / BEAT) * 4)) / 4)] as [string, number]).filter(([, f]) => f > HOOK.out && f < t.card[1]);
})();

export const CUE: Record<string, number> = {
  roll: HOOK.roll, // 'roll': the changed numerals roll to the new version
  rise: HOOK.version, // 'rise': the version rises out of its mask after the name
  hookOut: HOOK.out,
  ...Object.fromEntries(ARRIVE_CUES),
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
      ...(t.field ? [[`field${t.i}`, t.field.in], ...(t.field.mid > t.field.in ? [[`spread${t.i}`, t.field.mid]] : []), [`close${t.i}`, t.field.close[0]]] : []),
    ]),
  ),
  gather: CLOSE.gather,
  recapIn: CLOSE.recapIn,
  recapGlint: CLOSE.recapGlint,
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

/** One continuous stage: the product's card is carried from change to change (no hard cut). */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: true, whiteWorld: false };

/**
 * Every seam, by what carries it: the first card rising as the name lifts (velocity) or a hairline opening into it
 * (mask), the card shrinking into its line's gap (morph) and growing out of it into the screen (zoom-through), the card
 * reshaping into the next change's screen (morph), the changed element growing into the colour field (colour) and the
 * field closing into the next card (morph), the last card shrinking into the recap row (morph), the recap gathering
 * into the mark (the signature).
 */
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = [];
  TIMES.forEach((t, i) => {
    const prev = i ? TIMES[i - 1] : null;
    if (!prev) {
      if (t.shape === 'split') out.push({ at: t.say, kind: 'breath', id: 'exitEnter:name-to-line' });
      else if (ARRIVE_S) out.push({ at: t.card[0], kind: DEAL.arrive === 'object-turn' ? 'velocity' : DEAL.arrive === 'pixel-assemble' ? 'mask' : 'morph', carry: DEAL.arrive === 'object-turn' ? 'rot' : 'shape', id: `creative:${DEAL.arrive}` });
      else out.push(DEAL.arrive === 'open' ? { at: t.card[0], kind: 'mask', carry: 'scale', id: 'mask-grow:name-to-card' } : { at: t.card[0], kind: 'velocity', carry: 'y', dir: -1, id: 'name-to-card' });
    } else if (prev.field) out.push({ at: prev.field.close[0], kind: 'morph', carry: 'shape', id: `card-expand:field-into-card-${i + 1}` });
    else if (t.gap) out.push({ at: t.gap[0], kind: 'morph', carry: 'scale', id: `sharedElement:card-into-line-${i + 1}` });
    else out.push({ at: t.card[0], kind: 'morph', carry: 'shape', id: `card-${i + 1}` });
    if (t.gap) out.push({ at: t.card[0], kind: 'zoomThrough', carry: 'scale', id: `card-expand:gap-to-screen-${i + 1}` });
    if (t.field) out.push({ at: t.field.in, kind: 'colour', carry: 'shape', id: `card-expand:element-to-field-${i + 1}` });
  });
  const last = TIMES[N - 1];
  out.push(last.field ? { at: CLOSE.gather, kind: 'morph', carry: 'shape', id: 'card-expand:field-into-recap' } : { at: CLOSE.gather, kind: 'morph', carry: 'shape', id: 'sharedElement:to-recap' });
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
  ...Object.fromEntries(ARRIVE_CUES.map(([id]) => [id, 'move' as Salience])),
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
      ...(t.field ? [[`field${t.i}`, 'cut' as Salience], ...(t.field.mid > t.field.in ? [[`spread${t.i}`, 'move' as Salience]] : []), [`close${t.i}`, 'move' as Salience]] : []),
    ]),
  ),
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
// version again in the lockup.
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: 0, resolved: Math.max(HOOK.version + resolveSpan('mask', 1), HOOK.roll + f60(ROLL)), out: HOOK.out },
  ...UPDATE.changes.map((c, i) => line(`change${i + 1}`, spokenChange(c), TIMES[i].say, TIMES[i].out)),
  { id: 'wordmark', text: UPDATE.name, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.named, out: TOTAL },
  { id: 'release', text: UPDATE.version, kind: 'name', in: CLOSE.versionIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name alone, then each change's shape (after: the picture, then its line on
 * the colour field; split: the line round the card in its gap, then the picture; with: the picture with its line), the
 * recap, the end card.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: HOOK.out + EXIT_F },
  ...TIMES.flatMap((t): Beat[] => {
    const id = `change${t.i + 1}`;
    // a creative library arrival is its own picture beat: the device, then the product working
    const arrives: Beat[] = t.i === 0 && ARRIVE_S && !t.gap ? [{ id: `${id}-arrives`, kind: 'A', from: t.card[0], to: t.card[1] }] : [];
    const c0 = arrives.length ? t.card[1] : t.card[0];
    if (t.field) return [...arrives, { id: `${id}-works`, kind: 'A', from: c0, to: t.field.in }, { id, kind: 'T', from: t.say, to: t.out + EXIT_F }];
    if (t.gap) return [{ id, kind: 'TA', from: t.say, to: t.out + EXIT_F }, { id: `${id}-works`, kind: 'A', from: t.card[0], to: t.to }];
    const alone = t.to - (t.out + EXIT_F) >= FPS / 2; // with: the card working on alone once its line has gone (a second or more)
    return [...arrives, { id, kind: 'TA', from: c0, to: t.out + EXIT_F }, ...(alone ? [{ id: `${id}-works`, kind: 'A' as const, from: t.out + EXIT_F, to: t.to }] : [])];
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

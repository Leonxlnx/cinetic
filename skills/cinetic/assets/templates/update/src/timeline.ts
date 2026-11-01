// The single source of truth for time, for an update film ("vX is out"): the name and the version, one act per change
// (each a hero shot and a line in its own shape, src/deal.ts SHAPES and HEROES), and the end card (the brand's mark as a
// solid pulling back into the lockup, the name and the version). Picture (src/acts), sound (src/sync.ts -> out/cues.json)
// and QA (scripts/grid-check.ts) all import this file. The facts live in src/update.ts; this file only places them on the
// grid. Think in bars and beats, never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { DEAL, EXIT60, HEROES, LINES, type Move, RESOLVE60, type Shape, SHAPES } from './deal';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { type Change, spokenChange, UPDATE } from './update';

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
/** The key word of change i's line: the last word of the change's key, else the line's longest word. */
export const heroWord = (i: number): number => {
  const words = spokenChange(UPDATE.changes[i]).split(/\s+/);
  const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (UPDATE.changes[i].key ?? '').split(/\s+/).map(bare).filter(Boolean);
  const last = key.length ? words.map(bare).lastIndexOf(key[key.length - 1]) : -1;
  return last >= 0 ? last : words.reduce((b, w, j) => (bare(w).length > bare(words[b]).length ? j : b), 0);
};
/** Frames change i's line needs on screen: its move to the last word, then the pace's read of its words. */
const readOf = (i: number) => {
  const n = wordCount(spokenChange(UPDATE.changes[i]));
  return resolveSpan(moveOf(`change${i + 1}`), n) + f60(holdFor(n, PACE[PACE_NAME]));
};

// ---- the hero shots' own frames
/**
 * How each hero shot opens (f@60): out of focus (rack: the shot sharpens 7.5 -> 1.4 px, half the blur gone in the first
 * third), on a fast move that brakes into its framing (whip), out of a soft bloom of the world's light (bloom); a split's
 * porthole opening into the frame (iris).
 */
export const ARRIVE60: Record<string, number> = { rack: 18, whip: 20, bloom: 22, iris: 36 };
/**
 * Each change's arrival: the dealt optics, alternating with the next one on every other change of a four-change film,
 * so no one seam kind carries more than three of the film's changes.
 */
const OPTICS = ['rack', 'whip', 'bloom'] as const;
export const ARRIVALS: string[] = UPDATE.changes.map((_, i) => (UPDATE.changes.length >= 4 && i % 2 === 1 ? OPTICS[(OPTICS.indexOf(DEAL.arrive as (typeof OPTICS)[number]) + 1) % OPTICS.length] : DEAL.arrive));
/** The focus isolate under a 'show' line (f@60): the shot goes soft (to 6.2 px), dims and is pushed through a little (x1.06), the line lands in front. */
export const ISO60 = 14;
/** A hero shot clearing before a line that opens the next change (f@60): it goes soft and fades into the world. */
export const CLEAR60 = 20;
/**
 * A hero shot's own frames (f@60): `pre` from its arrival's end to its action, `act` from its action to the state change
 * (the hit: the press, the last row, the chosen picture facing the camera, the figure landing, the page's landing).
 */
export const heroFrames = (id: string, c: Change): { pre: number; act: number } => {
  const s = c.show;
  const n = s.kind === 'fill' && s.layout !== 'week' ? s.items.length : 4;
  switch (id) {
    case 'push-press':
      return { pre: 6, act: 80 };
    case 'macro-type': {
      // the typing at about 18 characters a second with its breaths (the shot fits the request's real cadence into
      // this window, then travels to send), then the press
      const text = s.kind === 'type' ? s.text : c.title;
      return { pre: 24, act: Math.round(text.length * (60 / 18) * 1.3 + 34) };
    }
    case 'toast-stack':
      return { pre: 0, act: 24 * (n - 1) + 16 };
    case 'fan-focus':
      return { pre: 0, act: 34 + 7 * (n - 1) + 76 };
    case 'carousel':
      return { pre: 0, act: 112 };
    case 'photo-develop':
      return { pre: 8, act: 70 };
    case 'glass-counter':
      return { pre: 4, act: 96 };
    case 'page-fly':
      return { pre: 0, act: 140 };
    case 'focus-swap':
      return { pre: 34, act: 30 };
    case 'glass-tiles':
      return { pre: 0, act: 140 };
    default:
      return { pre: 0, act: 80 };
  }
};

/**
 * Each change's frames (absolute), by its shape. `h0`: the hero shot's first frame (its arrival starts), `hin`: the
 * shot at rest, `go`: its action starts, `hit`: the state change, `res`, `res2`: the result's details landing, `live`:
 * the result's later beats while it holds; `say` and `out`: its line in and leaving; `iso` (show): the shot going soft
 * and dim under the line; `clear` (lead, split after a picture): the shot before going soft into the world as this
 * change's line arrives; `gap` (split): the porthole opening in the line's gap; `iris` (split): the porthole opening into
 * the frame; `heroEnd`: the shot's last frame on screen.
 */
export type ChangeTimes = {
  i: number; shape: Shape; hero: string; from: number; to: number;
  h0: number; hin: number; go: number; hit: number; res: number; res2: number; live: number[]; say: number; out: number;
  iso?: [number, number]; clear?: [number, number]; gap?: [number, number]; iris?: [number, number]; heroEnd: number;
};

const HOOK_BEATS = 4;
/** When the name and the version leave: a beat before the first change, so its line or shot starts as they lift. */
const HOOK_OUT = bt(HOOK_BEATS - 0.75);
/**
 * The beats a change's act is whole in: half bars on the film's own grid; whole bars once a track is in (every act
 * then starts on one of its downbeats).
 */
const QUANTUM = MUSIC ? 4 : 2;
/**
 * The end card's beats: the mark's pull-back, the name, the version landing on the bar line after them: a bar and a
 * half on the film's own grid (the end opens on a half bar), two bars on a track (it opens on a downbeat).
 */
const END_BEATS = MUSIC ? 8 : 6;
/**
 * House numbers: the result held at least `result` s after the state change when the shot ends the change (`resultThen`
 * when its line follows over it), a hero beat up to `picture` s before the slack goes to the line, a line on screen up to
 * `line` s.
 */
const SHOW = { result: 1.2, resultThen: 1.0, picture: 3.6, line: 2.4 } as const;
/** The first 16th of the grid at or after frame f. */
const g16 = (f: number) => {
  let q = Math.max(0, Math.floor((f / BEAT) * 4) / 4 - 0.25);
  while (bt(q) < f - 1e-9) q += 0.25;
  return bt(q);
};

/**
 * Each change's shape, planned from its own words and its hero shot: whole half bars (a change starts on a bar's first
 * or third beat), as many as the shape needs, the slack shared out so no part outstays its read (the result held longer
 * while the hero beat is short, then the line). The last change takes what squares the film up so the lockup lands on a
 * bar line. `lastMin`: the last change's beats at least.
 */
const planAll = (lastMin: number) => {
  const out: (Omit<ChangeTimes, 'from' | 'to'> & { s: number; L: number })[] = [];
  let s = HOOK_BEATS;
  SHAPES.forEach((shape, i) => {
    const R = readOf(i);
    const c = UPDATE.changes[i];
    const hero = HEROES[i];
    const hf = heroFrames(hero, c);
    const pre = f60(hf.pre);
    const act = f60(hf.act);
    /** The first 16th (in beats) at or after frame f, from beat x0 on. */
    const g = (f: number, x0: number) => {
      let q = x0;
      while (bt(q) < f) q += 0.25;
      return q;
    };
    // whole half bars, two bars at least: the act is as long as its content asks (the last as long as squares the film up)
    const bars = (endF: number, x0: number) => Math.max(8, i === SHAPES.length - 1 ? lastMin : 0, QUANTUM * Math.ceil((g(endF, x0) - s) / QUANTUM));
    const liveOf = (hit: number, endB: number) => {
      const l: number[] = [];
      for (let q = hit + 2.5; q <= endB - 0.5; q += 1) l.push(bt(q));
      return l;
    };
    const after = i > 0 && !pictureFirstShape(SHAPES[i - 1]); // the change before ended on its shot: it clears first
    if (shape === 'show') {
      // the shot first (it arrives on the dealt optics, acts and holds its result), then it goes soft and dims and the
      // line lands in front of it
      const arr = f60(ARRIVE60[ARRIVALS[i]] ?? 18);
      const h0 = i === 0 ? bt(s - 0.25) : bt(s); // out of the hook: the shot starts as the pair has all but gone
      const hin = g16(h0 + arr);
      const goB = g(hin + pre, s);
      const hitB = g(bt(goB) + act, goB);
      let recB = g(bt(hitB) + SHOW.resultThen * FPS, hitB);
      const tail = (rec: number) => {
        const sayB = g(bt(rec) + f60(ISO60) - f60(6), rec);
        const outB = g(bt(sayB) + R, sayB);
        // what comes next starts as the line leaves (the end card's mark only once the last line has gone)
        return { sayB, outB, end: bt(outB) + Math.round((i === SHAPES.length - 1 ? 1.05 : 0.35) * EXIT_F) };
      };
      const t0 = tail(recB);
      const L = bars(t0.end, t0.outB);
      // the slack: to the result's hold while the hero beat stays under SHOW.picture s, then to the line's hold, and
      // what is left to the result
      const slack = Math.max(0, s + L - g(t0.end, t0.outB));
      const room = Math.max(0, (SHOW.picture * FPS - (bt(recB) - h0)) / BEAT);
      const toRes = Math.floor(Math.min(slack, room) * 4) / 4;
      recB += toRes;
      let left = slack - toRes;
      const lineRoom = Math.max(0, (SHOW.line * FPS - R) / BEAT);
      const toLine = Math.floor(Math.min(left, lineRoom) * 4) / 4;
      left -= toLine;
      recB += Math.floor(left * 4) / 4;
      const t1 = tail(recB);
      const outB = Math.min(s + L - ((i === SHAPES.length - 1 ? 1.05 : 0.35) * EXIT_F) / BEAT, t1.outB + toLine);
      const outF = bt(Math.max(outB, g(bt(t1.sayB) + R, t1.sayB)));
      out.push({
        s, L, i, shape, hero, h0, hin, go: bt(goB), hit: bt(hitB), res: bt(hitB + 0.75), res2: bt(hitB + 1.75), live: liveOf(hitB, recB),
        iso: [bt(recB), bt(recB) + f60(ISO60)], say: bt(t1.sayB), out: outF, heroEnd: outF + EXIT_F,
      });
    } else if (shape === 'lead') {
      // the shot before goes soft into the world, the line arrives alone, it leaves, and this change's shot arrives on
      // the dealt optics and acts
      const arr = f60(ARRIVE60[ARRIVALS[i]] ?? 18);
      const clear: [number, number] | undefined = after ? [bt(s), bt(s) + f60(CLEAR60)] : undefined;
      const say = after ? bt(s + 0.5) : bt(s); // the shot before has gone soft into the world first
      const outB = g(say + R, s);
      const h0 = g16(bt(outB) + Math.round(0.3 * EXIT_F));
      const hin = g16(h0 + arr);
      const goB = g(hin + pre, outB);
      const hitB = g(bt(goB) + act, goB);
      const L = bars(bt(hitB) + SHOW.result * FPS, hitB);
      out.push({ s, L, i, shape, hero, clear, h0, hin, go: bt(goB), hit: bt(hitB), res: bt(hitB + 0.75), res2: bt(hitB + 1.75), live: liveOf(hitB, s + L), say, out: bt(outB), heroEnd: bt(s + L) });
    } else {
      // split: the line arrives parted (the shot before going soft into the world), a porthole opens in its gap with this
      // change's shot inside, the words leave and the porthole opens into the frame as the shot plays
      const clear: [number, number] | undefined = after ? [bt(s), bt(s) + f60(CLEAR60)] : undefined;
      const say = i === 0 ? g16(Math.max(bt(s), HOOK_OUT + EXIT_F - f60(4))) : after ? bt(s + 0.5) : bt(s);
      const resolve = resolveSpan(moveOf(`change${i + 1}`), wordCount(spokenChange(c)));
      const gap0 = g16(say + Math.round(0.45 * resolve));
      const gap: [number, number] = [gap0, gap0 + f60(30)];
      const outB = g(Math.max(say + R, gap[1] + f60(30)), s);
      const iris0 = g16(bt(outB) + Math.round(0.3 * EXIT_F));
      const iris: [number, number] = [iris0, g16(iris0 + f60(ARRIVE60.iris))];
      const h0 = iris[0];
      const goB = g(iris[1] + pre, outB);
      const hitB = g(bt(goB) + act, goB);
      const L = bars(bt(hitB) + SHOW.result * FPS, hitB);
      out.push({ s, L, i, shape, hero, clear, gap, iris, h0, hin: iris[1], go: bt(goB), hit: bt(hitB), res: bt(hitB + 0.75), res2: bt(hitB + 1.75), live: liveOf(hitB, s + L), say, out: bt(outB), heroEnd: bt(s + L) });
    }
    s += out[out.length - 1].L;
  });
  return out;
};
const pictureFirstShape = (sh: Shape) => sh === 'show';
const PLAN = (() => {
  const p0 = planAll(0);
  const rem = (HOOK_BEATS + p0.reduce((a, p) => a + p.L, 0) + END_BEATS) % 4;
  return rem ? planAll(p0[p0.length - 1].L + 4 - rem) : p0;
})();
const START = PLAN.map((p) => p.s);
const BODY_CHANGES = PLAN.reduce((a, p) => a + p.L, 0);
/** Where each act starts, in beats: the hook one bar, each change its planned bars, the end card a bar and a half. */
export const BEATS = {
  hook: 0,
  change: (i: number) => (i < N ? START[i] : HOOK_BEATS + BODY_CHANGES),
  end: HOOK_BEATS + BODY_CHANGES,
  last: HOOK_BEATS + BODY_CHANGES + END_BEATS,
} as const;
/** The film's bars in the body (track.py fit reads it with REVEAL and ACT.end to cut the track to the picture). */
export const BARS = BEATS.last / 4;

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body (the track's own final hit ringing out, 1.5-2.5 s); a grid
 * written before the endings (a stop, no hold) names only the stop's element: hold it and 1 s after it. The version lands
 * on that bar line (CUE.lockup), so the tail is also the end card's hold: that, and at least 1.5 s.
 */
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - beat(BEATS.last)) : 0;
export const TAIL = Math.max(Math.round(1.5 * FPS), MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order).
export const ACT: Record<string, { from: number; dur: number }> = {
  hook: { from: 0, dur: beat(BEATS.change(0)) },
  ...Object.fromEntries(UPDATE.changes.map((_c, i) => [`change${i + 1}`, { from: beat(BEATS.change(i)), dur: beat(BEATS.change(i + 1)) - beat(BEATS.change(i)) }])),
  end: { from: beat(BEATS.end), dur: beat(BEATS.last) + TAIL - beat(BEATS.end) },
};

export const TOTAL = beat(BEATS.last) + TAIL;

/** The act of change i (0-based). */
export const changeAct = (i: number) => ACT[`change${i + 1}`];

export const TIMES: ChangeTimes[] = PLAN.map(({ s, L, ...t }) => ({ ...t, from: bt(s), to: bt(s + L) }));
/** Whether the last change ends on its shot (lead, split): the end card takes over from the shot, not from a line. */
export const ENDS_ON_PICTURE = SHAPES[N - 1] !== 'show';

/** The hook's frames: the name, the version (rolling or rising), the pair leaving as the first change arrives. */
export const HOOK = { name: 0, version: bt(1), roll: bt(1), out: HOOK_OUT };

/**
 * The end card's frames: the mark's close-up already turning as the act opens, its pull-back landing on the flat mark,
 * the name sliding out of it, the version landing on the last bar line (the track's final hit), held to the end.
 */
export const CLOSE = (() => {
  const E0 = BEATS.end;
  return {
    markIn: beat(E0), // the mark's solid, close up and turning (it opens out of focus as the last line or shot clears)
    clear: [beat(E0) - f60(10), beat(E0) + f60(8)] as [number, number], // what was on screen goes soft into the world
    markTurn: bt(E0 + 1.5), // the solid half way back, turning to face the camera
    markFlat: bt(E0 + 3.25), // the pull-back (thirteen 16ths) lands exactly on the flat mark
    nameIn: bt(E0 + 3.25), // the name slides out of the mark ...
    named: bt(E0 + 4), // ... and is read
    versionIn: bt(E0 + END_BEATS - 0.75), // the version moves in once the name is read ...
    lockup: beat(BEATS.last), // ... and lands on the last bar line: the track's final hit (the music resolves on it)
  };
})();

// Named sync points (absolute frames), all on the 16th grid (or a move's own landing). Picture code reads these;
// src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {
  roll: HOOK.roll, // 'roll': the changed numerals roll to the new version
  rise: HOOK.version, // 'rise' and 'badge': the version arrives beside the name
  hookOut: HOOK.out,
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, t.from],
      [`shot${t.i}`, t.h0],
      [`in${t.i}`, t.hin],
      [`go${t.i}`, t.go],
      [`mid${t.i}`, bt(Math.round(((t.go + t.hit) / 2 / BEAT) * 4) / 4)],
      [`hit${t.i}`, t.hit],
      [`res${t.i}`, t.res],
      [`res2${t.i}`, t.res2],
      ...t.live.map((f, k) => [`live${t.i}_${k}`, f]),
      [`say${t.i}`, t.say],
      [`out${t.i}`, t.out],
      ...(t.iso ? [[`iso${t.i}`, t.iso[0]]] : []),
      ...(t.clear ? [[`clear${t.i}`, t.clear[0]]] : []),
      ...(t.gap ? [[`gap${t.i}`, t.gap[0]]] : []),
      ...(t.iris ? [[`iris${t.i}`, t.iris[0]]] : []),
    ]),
  ),
  markIn: CLOSE.markIn,
  markTurn: CLOSE.markTurn,
  markFlat: CLOSE.markFlat,
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

/**
 * One world, one continuous stage: the shots hand over through focus and light (no hard cut). Crisp: the depth stage
 * draws its own short-shutter smear on the fast moves (fx/depth), and a motion-blurred master samples only CAMERA_BLUR.
 */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: true, whiteWorld: false };

/** The seam a hero shot's arrival makes (the dealt optics). */
const ARRIVE_SEAM: Record<string, Pick<Seam, 'kind' | 'carry'>> = { rack: { kind: 'defocus' }, whip: { kind: 'whip', carry: 'x' }, bloom: { kind: 'light' } };

/**
 * Every seam, by what carries it: a hero shot arriving (out of focus, on a whip, out of a bloom), a shot going soft and
 * dim under its line (a focus isolate), a shot clearing into the world before a line, a porthole opening in a line's gap
 * and into the frame, and the end card: the mark's solid resolving out of the soft world (the signature).
 */
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = [];
  TIMES.forEach((t, i) => {
    if (t.clear) out.push({ at: t.clear[0], kind: 'breath', id: `exitEnter:shot-into-world-${i + 1}` });
    if (t.gap) {
      if (i === 0 && !t.clear) out.push({ at: t.say, kind: 'breath', id: 'exitEnter:name-to-line' });
      out.push({ at: t.gap[0], kind: 'mask', carry: 'scale', id: `porthole:shot-in-the-line-${i + 1}` });
    }
    if (t.iris) out.push({ at: t.iris[0], kind: 'mask', carry: 'scale', id: `porthole:opens-into-frame-${i + 1}` });
    else out.push({ at: t.h0, ...(ARRIVE_SEAM[ARRIVALS[i]] ?? { kind: 'defocus' }), id: `arrive:${t.hero}-${i + 1}` });
    if (t.iso) out.push({ at: t.iso[0], kind: 'zoomThrough', carry: 'scale', id: `isolate:through-the-shot-${i + 1}` });
  });
  out.push({ at: CLOSE.clear[0], kind: 'defocus', signature: true, id: 'end:mark-out-of-the-world' });
  return out.sort((p, q) => p.at - q.at);
})();
/** Off the grid on purpose: the end card starts on a half bar so the version lands on the bar line after the name. */
export const OFFGRID: Record<string, string> = { end: 'the end card opens on a half bar: the pull-back, the name and the version land the lockup on the bar line' };
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
/**
 * The fast frames a motion-blurred master samples (the depth stage draws its own short-shutter smear on every other
 * fast move): a whip's arrival, and the first, fast third of the mark's pull-back; each inside one act.
 */
export const CAMERA_BLUR: CameraBlurRange[] = [
  ...TIMES.filter((t) => ARRIVALS[t.i] === 'whip' && !t.iris).map((t) => ({ from: Math.max(t.h0, t.from), to: t.hin, id: `whip-${t.i + 1}` })),
  { from: CLOSE.markIn, to: CLOSE.markIn + f60(36), id: 'mark-pull-back' },
];
export const COLOUR: ColourRange[] = [];
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CLOSE.lockup, to: TOTAL };
/** The biggest reveal: the version landing in the lockup. */
export const REVEAL = CLOSE.lockup;
/** The one element class allowed an underdamped spring: the version landing in the lockup. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event: with a track, the mark's arrival and the version mark (both on bar lines). */
export const STRUCTURAL: string[] = MUSIC ? ['markIn', 'lockup'] : [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  roll: 'hit',
  rise: 'hit',
  hookOut: 'copy',
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, 'cut' as Salience],
      [`shot${t.i}`, 'cut' as Salience],
      [`in${t.i}`, 'move' as Salience],
      [`go${t.i}`, 'move' as Salience],
      [`mid${t.i}`, 'move' as Salience],
      [`hit${t.i}`, 'hit' as Salience],
      [`res${t.i}`, 'hit' as Salience],
      [`res2${t.i}`, 'hit' as Salience],
      ...t.live.map((_, k) => [`live${t.i}_${k}`, 'life' as Salience]),
      [`say${t.i}`, 'copy' as Salience],
      [`out${t.i}`, 'copy' as Salience],
      ...(t.iso ? [[`iso${t.i}`, 'move' as Salience]] : []),
      ...(t.clear ? [[`clear${t.i}`, 'move' as Salience]] : []),
      ...(t.gap ? [[`gap${t.i}`, 'move' as Salience]] : []),
      ...(t.iris ? [[`iris${t.i}`, 'move' as Salience]] : []),
    ]),
  ),
  markIn: 'cut', markTurn: 'move', markFlat: 'hit', nameIn: 'copy', versionIn: 'move', lockup: 'hit', glint: 'life', rest: 'life', end: 'cut',
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
  const resolved = inF + resolveSpan(moveOf(id), n);
  const read = resolved + f60(holdFor(n, pace));
  return { id, text, in: inF, resolved, out: Math.max(out, read) };
};

// Every on-screen word: the name and the version together ("[Name] [version]": which product, which release, by 1 s),
// each change one short sentence that says the result the shot shows, one line at a time, then the name and the version
// again in the lockup.
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: 0, resolved: Math.max(HOOK.version + resolveSpan('mask', 1), HOOK.roll + f60(ROLL)), out: HOOK.out },
  ...UPDATE.changes.map((c, i) => line(`change${i + 1}`, spokenChange(c), TIMES[i].say, TIMES[i].out)),
  { id: 'wordmark', text: UPDATE.name, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.named, out: TOTAL },
  { id: 'release', text: UPDATE.version, kind: 'name', in: CLOSE.versionIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name alone, then each change's shot and its line (a 'show' line stands alone
 * over the shot gone soft and dim, a lead line alone in the world, a split line round its porthole), the end card.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: HOOK.out + EXIT_F },
  ...TIMES.flatMap((t): Beat[] => {
    const id = `change${t.i + 1}`;
    const lineB: Beat = { id, kind: 'T', from: t.say, to: t.out + EXIT_F };
    if (t.shape === 'split') return [{ id, kind: 'TA', from: t.say, to: t.out + EXIT_F }, { id: `${id}-shot`, kind: 'A', from: t.iris![0], to: t.to }];
    if (t.shape === 'lead') return [lineB, { id: `${id}-shot`, kind: 'A', from: t.h0, to: t.to }];
    return [{ id: `${id}-shot`, kind: 'A', from: t.h0, to: t.say }, lineB];
  }),
  { id: 'end', kind: 'end', from: CLOSE.markIn, to: TOTAL },
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

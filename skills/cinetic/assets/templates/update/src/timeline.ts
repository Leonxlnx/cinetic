// The single source of truth for time, for an update film ("vX is out"): the hook (the name and the version on a clean
// ground), then each change as its line (alone on the ground of the scene it leads into) and its house scene (src/scenes,
// dealt in src/deal.ts HEROES) in 2-4 s, a scene that takes over the element the one before hands on following it on a
// match cut, then the mark pulling back into the lockup (mark-pullback) and the version landing on the bar line that
// ends the body. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this
// file. The facts live in src/update.ts; this file only places them on the grid. Keep it free of React and CSS imports:
// Node scripts load it directly.
import { DEAL, HEROES, LINES, LINKED, type Move, PULLBACK30, RESOLVE60, SCENE_SPEC, splitLine } from './deal';
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
/** Film frames per scene frame (the house scenes write every number at 30 fps). */
export const K30 = FPS / 30;

/** How many changes the film shows (2-3, from src/update.ts). */
export const N = UPDATE.changes.length;
/** Absolute frame of the n-th beat from the film's first downbeat (sub = 16ths): a whole frame on the grid. */
export const beat = (n: number, sub = 0) => b(1 + Math.floor(n / 4), n % 4, sub);
/** Absolute frame of a fractional beat position, on the 16th grid (2.25 = the second 16th of beat 2). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  return beat(Math.floor(q / 4), q % 4);
};
/** The first 16th of the grid at or after frame f. */
export const g16 = (f: number) => {
  let q = Math.max(0, Math.floor((f / BEAT) * 4) / 4 - 0.25);
  while (bt(q) < f - 1e-9) q += 0.25;
  return bt(q);
};
/** The first bar line at or after frame f. */
export const gBar = (f: number) => {
  let n = Math.max(1, Math.floor(f / BAR));
  while (b(n) < f - 1e-9) n++;
  return b(n);
};

const pace = PACE[PACE_NAME];
/** Frames from a move's start until a line of `n` words is read (src/deal.ts RESOLVE60, at this film's fps). */
export const resolveSpan = (move: Move, n: number): number => f60(RESOLVE60[move][Math.min(8, Math.max(1, n)) - 1]) + 1;
/** The frames a line of n words stays readable once resolved (the pace's read; grid-check holds every line to it). */
export const readHold = (n: number): number => f60(holdFor(n, pace));
/** The move this film dealt a line (src/deal.ts LINES). */
export const moveOf = (id: string): Move => LINES.move[id] ?? LINES.voice;

// ---------------------------------------------------------------------------------------------- the scenes' own frames
/**
 * macro-type's length for a request (frames at 30 fps): the house scene's own formula (scenes/macro-type macroTypeDur:
 * its last key lands (n - 1) / cps seconds after the first, whatever the cadence's jitter).
 */
export const macroTypeDur30 = (text: string) => {
  const cps = Math.min(40, Math.max(24, text.length / 1.05));
  const last = Math.max(0, text.length - 1) * (60 / cps);
  return Math.ceil(37 + last / 2 + 2 + 11 + 6);
};
/** A scene's length for change c (frames at 30 fps). */
export const sceneDur30 = (id: string, c: Change): number => (id === 'macro-type' && c.show.kind === 'type' ? macroTypeDur30(c.show.text) : SCENE_SPEC[id].dur);
/**
 * When the line a scene sets inside it is read (frames at 30 fps from the scene's first frame), and when it starts to
 * leave: porthole-line's two lines cut on word by word behind the porthole; decode-title's title decodes; orbit-chips'
 * line stands on the orbits from the first frame.
 */
export const carriedLine = (id: string, c: Change): { in: number; resolved: number; out: number } | null => {
  if (id === 'porthole-line') {
    const [, bottom] = splitLine(c);
    return { in: 36, resolved: 48 + 3 * (bottom.split(/\s+/).length - 1) + 5, out: 72 };
  }
  if (id === 'decode-title') return { in: 1, resolved: 18, out: SCENE_SPEC[id].dur };
  if (id === 'orbit-chips') return { in: 0, resolved: 6, out: 43 };
  return null;
};

// ---------------------------------------------------------------------------------------------- the plan
/** A change's line card (absolute frames): its ground is the scene's it leads into. */
export type Card = { from: number; to: number; in: number; resolved: number };
/**
 * A change's scene (absolute frames): `from`, `to`; `dur30` its own length; `rest`/`extra`: the film gives it `extra`
 * frames at its scene frame `rest` (played at a quarter speed over the stretch: slower, never frozen); `endless`: it ends
 * on its element without its own last action (the next scene's pointer takes it); `pressed`: the scene before pressed
 * for it.
 */
export type ScenePlan = { id: string; from: number; to: number; dur30: number; rest?: number; extra: number; endless: boolean; pressed: boolean };
export type ChangePlan = { i: number; id: string; card: Card | null; scene: ScenePlan; line: { in: number; resolved: number; out: number } };
/** The stretch a scene can play slower over: 4 scene frames at its rest. */
const STRETCH30 = 4;

/** The hook's frames: the name, the version arriving (pill, roll or tag), read. */
const hookFrames = (extra: number) => {
  const name = UPDATE.name;
  const n = wordCount(name);
  const nameRes = resolveSpan(LINES.voice, n);
  const verAt = DEAL.hook === 'roll' ? nameRes + f60(4) : DEAL.hook === 'tag' ? nameRes + f60(6) : nameRes + f60(2);
  const resolved = verAt + f60(DEAL.hook === 'tag' ? 24 : 20);
  return { name: 0, nameRes, version: verAt, resolved, out: g16(resolved + readHold(n + 1) + extra) };
};

/** The film's plan with `extra` frames given to its parts (the hook, each card, each scene with a rest). */
const planWith = (extra: { hook: number; card: number[]; scene: number[] }) => {
  const hook = hookFrames(extra.hook);
  let at = hook.out;
  const changes: ChangePlan[] = UPDATE.changes.map((c, i) => {
    const id = HEROES[i];
    const spec = SCENE_SPEC[id];
    const linkedIn = i > 0 && LINKED[i - 1];
    let card: Card | null = null;
    if (!spec.carries && !linkedIn) {
      const n = wordCount(spokenChange(c));
      const inF = at;
      const resolved = inF + resolveSpan(moveOf(`change${i + 1}`), n);
      const to = g16(resolved + readHold(n) + extra.card[i]);
      card = { from: inF, to, in: inF, resolved };
      at = to;
    }
    const dur30 = sceneDur30(id, c);
    const from = at;
    // a carried line holds its read: the scene gives the words the frames they need at its rest
    const cl = carriedLine(id, c);
    const need = cl ? Math.max(0, readHold(wordCount(spokenChange(c))) - (cl.out - cl.resolved) * K30 + f60(4)) : 0;
    let ext = spec.rest !== undefined ? need + extra.scene[i] : 0;
    let to = from + dur30 * K30 + ext;
    // the cut out of a scene sits on the grid: a scene with a rest takes the frames to it there, any other holds its last frame creeping
    const snapped = g16(to);
    if (spec.rest !== undefined) ext += snapped - to;
    to = snapped;
    const endless = !!LINKED[i] && !!spec.endless;
    const scene: ScenePlan = { id, from, to, dur30, rest: spec.rest, extra: ext, endless, pressed: linkedIn };
    at = to;
    const line = card ? { in: card.in, resolved: card.resolved, out: card.to } : cl ? { in: sceneAt(scene, cl.in), resolved: sceneAt(scene, cl.resolved), out: sceneAt(scene, cl.out) } : { in: from, resolved: from, out: from };
    return { i, id: c.id, card, scene, line };
  });
  return { hook, changes, markIn: at };
};

/**
 * The film frame (absolute) at which scene frame s30 (frames at 30 fps from the scene's first frame) plays: K30 film
 * frames per scene frame, except over the stretch at its rest, which takes its extra frames too.
 */
export const sceneAt = (s: ScenePlan, s30: number): number => {
  if (s.rest === undefined || s30 <= s.rest) return Math.round(s.from + s30 * K30);
  const into = Math.min(s30 - s.rest, STRETCH30);
  const over = Math.max(0, s30 - s.rest - STRETCH30);
  return Math.round(s.from + s.rest * K30 + (into / STRETCH30) * (STRETCH30 * K30 + s.extra) + over * K30);
};
/** The scene frame (30 fps, fractional) a scene plays at film frame f (absolute): the inverse of sceneAt. */
export const sceneFrame = (s: ScenePlan, f: number): number => {
  const local = f - s.from;
  if (s.rest === undefined || local <= s.rest * K30) return local / K30;
  const span = STRETCH30 * K30 + s.extra;
  const into = local - s.rest * K30;
  if (into <= span) return s.rest + (into / span) * STRETCH30;
  return s.rest + STRETCH30 + (into - span) / K30;
};

/**
 * The lockup: the mark-pullback plays from `markIn` (its cut to the flat mark at 38 scene frames, the lockup assembling
 * from 44, settled by 60); the version lands on the first bar line once the lockup has settled: the bar line that ends the
 * body (the track's final hit). Where that bar line would leave the lockup waiting more than half a second, the hook, the
 * cards and the scenes with a rest take the difference first (a little longer each, never a dead wait at the end).
 */
/** The lockup's name is read (its letters cut on one each 0.9 scene frames from the lockup's first frame, then settle). */
const NAMED30 = PULLBACK30.lockup + 1 + 0.9 * [...UPDATE.name].length + 4;
/** The version lands once the name is read and held (its read, then its landing): frames from the mark's cut in. */
const SETTLE = Math.ceil(NAMED30 * K30) + f60(36) + f60(10);
const WAIT = f60(30);
const PLAN = (() => {
  const zero = { hook: 0, card: UPDATE.changes.map(() => 0), scene: UPDATE.changes.map(() => 0) };
  const p0 = planWith(zero);
  const lock0 = gBar(p0.markIn + SETTLE);
  const slack = lock0 - (p0.markIn + SETTLE) - WAIT;
  if (slack <= 0) return { ...p0, lockup: lock0 };
  // capacities: a card up to half a second more, a scene with a rest up to half a second, the hook a quarter
  const cap = { hook: f60(15), card: p0.changes.map((c) => (c.card ? f60(30) : 0)), scene: p0.changes.map((c) => (c.scene.rest !== undefined ? f60(30) : 0)) };
  const total = cap.hook + cap.card.reduce((a, v) => a + v, 0) + cap.scene.reduce((a, v) => a + v, 0);
  let best = { ...p0, lockup: lock0 };
  for (let give = Math.min(slack, total); give > 0; give -= Math.max(1, Math.round(BEAT / 4))) {
    const k = give / total;
    const ex = { hook: Math.floor(cap.hook * k), card: cap.card.map((v) => Math.floor(v * k)), scene: cap.scene.map((v) => Math.floor(v * k)) };
    const p = planWith(ex);
    if (gBar(p.markIn + SETTLE) === lock0) {
      best = { ...p, lockup: lock0 };
      break;
    }
  }
  return best;
})();

/** The hook's frames. */
export const HOOK = PLAN.hook;
/** Each change's line card (or null: its scene carries its line, or the scene before hands it the element) and scene. */
export const CHANGES: ChangePlan[] = PLAN.changes;

/** The end's frames: the mark-pullback's cut in (`markIn`), its cuts, the lockup, the name, the version landing on its bar line. */
export const CLOSE = (() => {
  const markIn = PLAN.markIn;
  const lockup = PLAN.lockup;
  return {
    markIn,
    markCut: markIn + PULLBACK30.cut * K30,
    lockIn: markIn + PULLBACK30.lockup * K30,
    settled: markIn + PULLBACK30.settled * K30,
    nameIn: markIn + PULLBACK30.lockup * K30,
    named: markIn + Math.ceil(NAMED30 * K30),
    turn: markIn + 13 * K30,
    versionIn: lockup - f60(10),
    lockup,
  };
})();

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body (the track's own final hit ringing out, 1.5-2.5 s); a grid
 * written before the endings (a stop, no hold) names only the stop's element: hold it and 1 s after it. The version lands
 * on that bar line (CUE.lockup), so the tail is also the end card's hold: that, and at least 1.5 s.
 */
const BODY_END = CLOSE.lockup;
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - BODY_END) : 0;
export const TAIL = Math.max(Math.round(1.5 * FPS), MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);
export const TOTAL = BODY_END + TAIL;
/** The film's bars in the body (track.py fit reads it with REVEAL and ACT.end to cut the track to the picture). */
export const BARS = Math.round(((BODY_END - b(1)) / BAR) * 2) / 2;

/**
 * One act: the film cuts on the plan's own frames (the 16th grid), never on bar lines, so it declares no act boundary
 * the track would have to land on; the structure the track lands on is the version mark (STRUCTURAL) on the bar line
 * that ends the body. Root.tsx's Act1 is the whole film.
 */
export const ACT: Record<string, { from: number; dur: number }> = { film: { from: 0, dur: TOTAL } };
/** Where each act starts, in beats (kept for the starter's helpers). */
export const BEATS = { hook: 0, end: CLOSE.markIn / BEAT, last: BODY_END / BEAT } as const;

/** One scene cue (the scene's own sound, src/scenes meta cues) placed in the film: its name. */
const sceneCueName = (i: number, k: number) => `s${i}_${k}`;
/** A scene's own sound (its meta entry's cues): frame at 30 fps from its first frame, kind, weight. */
export type Moment = { f: number; kind: string; id: string; w: number };

// Named sync points (absolute frames). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {
  version: HOOK.version, // the version arrives beside the name
  hookRead: Math.min(HOOK.out - 1, g16(HOOK.resolved)),
  hookOut: HOOK.out,
  ...Object.fromEntries(
    CHANGES.flatMap((c) => [
      ...(c.card ? [[`card${c.i}`, c.card.from], [`read${c.i}`, c.card.resolved]] : []),
      [`scene${c.i}`, c.scene.from],
      [`sceneEnd${c.i}`, c.scene.to],
      ...(!c.card ? [[`said${c.i}`, c.line.resolved]] : []),
    ]),
  ),
  markIn: CLOSE.markIn,
  markTurn: CLOSE.turn,
  markCut: CLOSE.markCut,
  lockIn: CLOSE.lockIn,
  settled: CLOSE.settled,
  versionIn: CLOSE.versionIn,
  lockup: CLOSE.lockup,
  rest: Math.min(TOTAL - 1, g16(CLOSE.lockup + BEAT)),
  end: CLOSE.lockup,
};
/**
 * The scene moments the picture lands on its own measured frames (each scene's meta cues, at their place in the film):
 * src/sync.ts voices them with their meta cue's kind; the CUEs below name them `s<change>_<k>` so the checks see the
 * picture's events.
 */
export const SCENE_MOMENTS: (Moment & { i: number; k: number; at: number })[] = [];
const m = (f: number, kind: string, id: string, w: number): Moment => ({ f, kind, id, w });
/**
 * The moments each scene's meta lists (its `cues`: frames at 30 fps; a scene whose length follows its content,
 * macro-type, counts its closing moments from its end). Written here so this file stays free of React: acts/scenes.tsx
 * checks them against the scenes' own meta entries in the Studio.
 */
export const MOMENTS30: Record<string, (dur30: number) => Moment[]> = {
  'porthole-line': () => [m(8, 'click', 'press', 0.8), m(14, 'swell', 'open', 0.6), m(23, 'pop', 'picture', 0.7), m(36, 'hit', 'line-top', 0.9), m(48, 'hit', 'line-bottom', 0.8), m(72, 'whoosh', 'exit', 0.5)],
  'decode-title': () => [m(0, 'suck', 'swirl', 0.6), m(4, 'pop', 'decode', 0.7), m(7, 'pop', 'decode-2', 0.5), m(15, 'bell', 'title', 0.7), m(27, 'whoosh', 'button-flies', 0.6), m(32, 'pop', 'button', 0.6), m(44, 'click', 'click', 0.8)],
  'macro-type': (d) => [m(1, 'whoosh', 'pointer-in', 0.5), m(25, 'click', 'field', 0.8), m(28, 'swell', 'bloom', 0.4), m(37, 'key', 'typing', 0.5), m(d - 17, 'whoosh', 'run-to-send', 0.4), m(d - 6, 'click', 'send', 0.9)],
  'glass-prompt': () => [m(2, 'swell', 'rise', 0.4), m(21, 'pop', 'glint', 0.4), m(27, 'whoosh', 'whip-left', 0.6), m(41, 'key', 'typing', 0.4), m(46, 'riser', 'whip-right', 0.7)],
  'toast-stack': () => [m(4, 'bell', 'first', 0.7), m(7, 'pop', 'arrive-2', 0.6), m(11, 'pop', 'arrive-3', 0.6), m(15, 'pop', 'arrive-4', 0.6), m(19, 'pop', 'arrive-5', 0.5)],
  'page-fly': () => [m(2, 'whoosh', 'page-rises', 0.6), m(12, 'land', 'headline', 0.6), m(24, 'tick', 'rows', 0.3), m(36, 'tick', 'rows-2', 0.3), m(65, 'whoosh', 'exit', 0.5)],
  'photo-river': () => [m(0, 'hit', 'first', 0.6), m(8, 'tick', 'swaps', 0.4), m(26, 'riser', 'faster', 0.5), m(45, 'whoosh', 'river', 0.7), m(61, 'hit', 'last', 0.8)],
  'photo-counters': () => [m(0, 'swell', 'photo', 0.5), m(2, 'whoosh', 'card-big', 0.5), m(4, 'tick', 'counting', 0.3), m(11, 'pop', 'card-2', 0.5), m(18, 'pop', 'card-3', 0.5), m(47, 'whoosh', 'exit', 0.6)],
  'orbit-chips': () => [m(9, 'whoosh', 'chips-fly', 0.7), m(11, 'pop', 'chips-land-1', 0.7), m(22, 'tick', 'chips-small', 0.5), m(43, 'suck', 'chips-dip', 0.6)],
};
/** The mark-pullback's own moments (its meta cues). */
export const END_MOMENTS30: Moment[] = [m(0, 'whoosh', 'pull-back', 0.7), m(PULLBACK30.cut, 'tick', 'flat-mark', 0.5), m(PULLBACK30.lockup, 'snap', 'parts', 0.6), m(PULLBACK30.lockup + 7, 'land', 'lockup', 0.7)];
/** Moments the picture makes that a scene's meta does not list (a toast stack's climb landing at rest). */
export const EXTRA30: Record<string, Moment[]> = { 'toast-stack': [m(24, 'land', 'stack-rests', 0.35)] };
CHANGES.forEach((c) => {
  const s = c.scene;
  [...(MOMENTS30[s.id]?.(s.dur30) ?? []), ...(EXTRA30[s.id] ?? [])]
    // a scene that hands its element on ends before its own last press: that press is the next scene's
    .filter((x) => !(s.endless && x.f >= s.dur30 - 8))
    .forEach((x, k) => {
      const at = sceneAt(s, x.f);
      if (at <= s.from || at >= s.to) return; // a moment on the cut itself is the cut's
      SCENE_MOMENTS.push({ ...x, i: c.i, k, at });
      CUE[sceneCueName(c.i, k)] = at;
    });
});

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

/** Cut film: every part is its own shot, on the grid; each line card and the scene it leads into share one ground. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: false, whiteWorld: false };

/**
 * Every seam: each change comes in as INTO says (carried, the exit before carrying it, or a clean ground wiping in); a
 * line card into its scene keeps the ground and lets the scene build on it (breath); the mark's pull-back is the
 * signature, with the scene's own two snaps (to the flat mark, to the lockup).
 */
/** A wipe's length: a clean ground sweeping over the last frame of what was before. */
export const WIPE_F = f60(12);
/**
 * How each change's first part comes in: the element carried from the scene before (morph: the send button pressed), the
 * scene before's own exit carrying it (a defocus, a whip, the page leaving at speed), else its clean ground wiping in
 * over the last frame of what was before (up for the first change, then from the side, alternating).
 */
export const INTO: Seam[] = CHANGES.map((c, i): Seam => {
  const at = (c.card ?? c.scene).from;
  if (i > 0 && LINKED[i - 1]) return { at, kind: 'morph', carry: 'shape', id: `element-carried-${i + 1}` };
  const exit = i > 0 ? SCENE_SPEC[CHANGES[i - 1].scene.id].exit : undefined;
  if (exit) return { at, kind: exit.kind, ...(exit.carry ? { carry: exit.carry } : {}), ...(exit.dir ? { dir: exit.dir } : {}), id: `${CHANGES[i - 1].scene.id}-exit-${i + 1}` };
  return { at, kind: 'wipe', dir: i % 2 ? 1 : -1, id: `wipe-into-change-${i + 1}` };
});
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = INTO.filter((x) => x.at > 0).map((x) => ({ ...x }));
  CHANGES.forEach((c, i) => {
    if (c.card) out.push({ at: c.scene.from, kind: 'breath', id: `line-into-scene-${i + 1}` });
  });
  out.push({ at: CLOSE.markIn, kind: 'snapZoom', carry: 'scale', signature: true, id: 'mark-pull-back' });
  out.push({ at: CLOSE.markCut, kind: 'snapZoom', carry: 'scale', id: 'flat-mark' });
  out.push({ at: CLOSE.lockIn, kind: 'snapZoom', carry: 'scale', id: 'lockup' });
  return out.sort((p, q) => p.at - q.at);
})();
/** Off the grid on purpose: the scenes' own measured moments, the mark's cuts. */
export const OFFGRID: Record<string, string> = {
  version: 'the version arrives on the line\'s own move, once the name is read',
  ...Object.fromEntries(CHANGES.flatMap((c) => [[`read${c.i}`, 'the line is read on its move\'s own frames'], [`said${c.i}`, 'the scene sets its line on its own measured frames']])),
  ...Object.fromEntries(SCENE_MOMENTS.map((m) => [sceneCueName(m.i, m.k), 'the scene\'s own measured moment'])),
  markTurn: 'the pull-back is three quarters out on its own measured curve',
  markCut: 'the pull-back cuts to the flat mark on its own measured frame',
  lockIn: 'the lockup assembles on the pull-back\'s own measured frame',
  settled: 'the lockup settles on its own measured frame',
  versionIn: 'the version leads its bar line by its landing',
};
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
/** The fast frames a motion-blurred master samples: the first, fast third of the mark's pull-back. */
export const CAMERA_BLUR: CameraBlurRange[] = [{ from: CLOSE.markIn, to: CLOSE.markIn + 13 * K30, id: 'mark-pull-back' }];
export const COLOUR: ColourRange[] = [];
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CLOSE.lockup, to: TOTAL };
/** The biggest reveal: the version landing in the lockup. */
export const REVEAL = CLOSE.lockup;
/** The one element class allowed an underdamped spring: the version landing in the lockup. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event: with a track, the version mark (the bar line that ends the body). */
export const STRUCTURAL: string[] = MUSIC ? ['lockup'] : [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  version: 'hit',
  hookRead: 'copy',
  hookOut: 'cut',
  ...Object.fromEntries(
    CHANGES.flatMap((c) => [
      ...(c.card ? [[`card${c.i}`, 'cut' as Salience], [`read${c.i}`, 'copy' as Salience]] : []),
      [`scene${c.i}`, 'cut' as Salience],
      [`sceneEnd${c.i}`, 'cut' as Salience],
      ...(!c.card ? [[`said${c.i}`, 'copy' as Salience]] : []),
    ]),
  ),
  ...Object.fromEntries(SCENE_MOMENTS.map((m) => [sceneCueName(m.i, m.k), 'hit' as Salience])),
  markIn: 'cut', markTurn: 'move', markCut: 'cut', lockIn: 'cut', settled: 'move', versionIn: 'move', lockup: 'hit', rest: 'life', end: 'cut',
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

/** The text a change's line shows: one line on its card, two where a scene parts it. */
export const lineText = (i: number): string => {
  const c = UPDATE.changes[i];
  return CHANGES[i].scene.id === 'porthole-line' && !CHANGES[i].card ? splitLine(c).join('\n') : spokenChange(c);
};

// Every on-screen word: the name and the version together ("[Name] [version]": which product, which release, by 1 s),
// each change one short sentence (alone on its card, or set by its scene), then the name and the version in the lockup.
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: 0, resolved: HOOK.resolved, out: HOOK.out },
  ...CHANGES.map((c) => ({ id: `change${c.i + 1}`, text: lineText(c.i), in: c.line.in, resolved: c.line.resolved, out: c.line.out })),
  ...CHANGES.filter((c) => c.scene.id === 'macro-type' || c.scene.id === 'glass-prompt').map((c): Copy => {
    const s = UPDATE.changes[c.i].show;
    const text = s.kind === 'type' ? s.text : '';
    return { id: `typed${c.i + 1}`, text, kind: 'ui', in: sceneAt(c.scene, 37), resolved: Math.min(c.scene.to - 1, sceneAt(c.scene, c.scene.dur30 - 19)), out: c.scene.to };
  }),
  { id: 'wordmark', text: UPDATE.name, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.named, out: TOTAL },
  { id: 'release', text: UPDATE.version, kind: 'name', in: CLOSE.versionIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name with its version alone on the ground (T), each change's line alone on the
 * ground of its scene (T), then the scene (A); a scene that parts its line round its picture plays its press first (A),
 * then the line meeting its picture (T, meets); the lockup.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number; meets?: boolean };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: HOOK.out },
  ...CHANGES.flatMap((c): Beat[] => {
    const id = `change${c.i + 1}`;
    if (c.card) return [{ id, kind: 'T', from: c.card.from, to: c.card.to }, { id: `${id}-scene`, kind: 'A', from: c.scene.from, to: c.scene.to }];
    if (c.line.in > c.scene.from + FPS * 0.5) return [{ id: `${id}-press`, kind: 'A', from: c.scene.from, to: c.line.in }, { id, kind: 'T', from: c.line.in, to: c.scene.to, meets: true }];
    return [{ id, kind: 'T', from: c.scene.from, to: c.scene.to, meets: true }];
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
/** The film as one line, for the print: the hook, each change's line and scene, the end. */
export const PLAN_LINE = [`${UPDATE.name} ${UPDATE.version} (${(HOOK.out / FPS).toFixed(2)} s)`, ...CHANGES.map((c) => `"${spokenChange(UPDATE.changes[c.i])}" ${c.card ? `card ${((c.card.to - c.card.from) / FPS).toFixed(2)} s + ` : ''}${c.scene.id} ${((c.scene.to - c.scene.from) / FPS).toFixed(2)} s${c.scene.endless ? ' (hands on)' : ''}${c.scene.pressed ? ' (pressed)' : ''}`), `mark-pullback, version on f${CLOSE.lockup} (${(TOTAL / FPS).toFixed(2)} s in all)`].join(' | ');

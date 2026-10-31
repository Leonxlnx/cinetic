// Continuous motion: no state change happens in one frame, no hold freezes, no move is cut while it is still fast.
// These are the fixes forensics.py's motion gates ask for (motion-snap, motion-frozen, motion-decay, motion-stop,
// motion-cut) and the helpers lint-film's snap-step, hold-drift and unmount-moving rules point at:
//   glideValue    a value that glides between states (16 f at 60 fps on E.glideOut) instead of jumping
//   glideList     a list or ticker that steps a whole row per glide and drifts between steps (fx/GlideStep draws it)
//   holdDrift     the slow drift under every hold: 0.3-1 px per 60 fps frame at 1080p (house 0.5 = 30 px/s)
//   landedAt      the frame from which a move stays under 10 % of its peak speed
//   landBeforeCut the guard for a cut or an unmount: reports a move still fast there (a whip is declared)
//   timingFail    how every module-load timing assert reports: a warning in dev (the render goes on, the problem is
//                 listed by scripts/precheck.mjs), an error only under the ship gate (CINETIC_GATE=ship in Node, or
//                 REMOTION_CINETIC_GATE=ship for a render), so a compressed retime never crashes a dev render
// Pure functions of the frame; node-safe (src/sync.ts and the timeline may import them).
import { clamp, E, type Ease, prog } from './anim';
import { type FilmCtx, f60x, fpsOf, uOf } from './film';

// ------------------------------------------------------------------------------------------------ the gate
/** Where a check runs: 'dev' (every day: timing asserts warn) or 'ship' (the ship gate: they throw). */
export type GateMode = 'dev' | 'ship';

/** The gate this process runs under: CINETIC_GATE=ship (Node: precheck --ship, tests) or REMOTION_CINETIC_GATE=ship (a render). */
export const gateMode = (): GateMode => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.CINETIC_GATE === 'ship' || env?.REMOTION_CINETIC_GATE === 'ship' ? 'ship' : 'dev';
};

/** One problem a check reported in dev (the ship gate throws it instead). */
export type GateIssue = { rule: string; message: string };

const ISSUES = '__cineticGateIssues';
/** The problems reported in this process so far, oldest first (scripts/precheck.mjs prints them after importing every act). */
export const gateIssues = (): GateIssue[] => {
  const g = globalThis as unknown as Record<string, GateIssue[] | undefined>;
  return (g[ISSUES] ??= []);
};

/**
 * A module-load timing assert failed (a move cut mid-ease, a line read past its act's cut): under the ship gate it
 * throws `message`; in dev it warns once and records the problem, so a retime never crashes a dev render or a still.
 * Route every timing assert that runs at import through it, never a bare `throw` (timeline.ts, an act's constants).
 */
export const timingFail = (rule: string, message: string): void => {
  if (gateMode() === 'ship') throw new Error(message);
  const list = gateIssues();
  if (list.some((x) => x.rule === rule && x.message === message)) return;
  list.push({ rule, message });
  console.warn(`warn ${message} (dev: a warning; the ship gate fails it, CINETIC_GATE=ship)`);
};

/**
 * House numbers (frames at 60 fps, px at 1080p): a glide's length, the share of peak speed under which a move has
 * landed, the hold creep (0: a hold is still) and its band (at most 0.2 px per 60 fps frame at 1080p, 12 px/s:
 * sub-pixel at any rate; lib/drift DRIFT.creep). A 16 f glide on E.glideOut settles from its peak to 20 % of its
 * speed in about 4 f at 30 fps (forensics motion-decay asks 3.5 or more); the 1.1 E.out over the same 16 f settles in 3.
 */
export const GLIDE = { frames60: 16, landShare: 0.1, driftPx60: 0, driftBand: [0, 0.2] as const } as const;

/** One state of a gliding value: from frame `at` on it heads for `value` (the first frame of motion is `at`). */
export type GlideAt<T> = { at: number; value: T };

/** Options of a glide: its length in 60 fps frames (house 16) and its curve (house E.glideOut, an arrival). */
export type GlideOpts = { frames?: number; ease?: Ease };

const glideDur = (o: GlideOpts | undefined, film?: Partial<FilmCtx>) => Math.max(1, f60x(o?.frames ?? GLIDE.frames60, fpsOf(film)));

/**
 * A number that glides between states: each step moves from wherever the value is at its start to its own value
 * over `frames` 60 fps frames on `ease`, so a list offset, a counter's roll or a field's width never jumps in one
 * frame. A step that starts before the previous one has landed blends out of it (no restart, no jump). Steps sorted
 * by `at`; `initial` before the first. The continuous form of fx/HardStep stepValue().
 */
export const glideValue = (f: number, steps: GlideAt<number>[], initial: number, o: GlideOpts = {}, film?: Partial<FilmCtx>): number => {
  const dur = glideDur(o, film);
  const ease = o.ease ?? E.glideOut;
  let v = initial;
  for (const s of steps) {
    if (f < s.at) break;
    v += (s.value - v) * prog(f, s.at - 1, s.at - 1 + dur, ease);
  }
  return v;
};

/** A gliding list: up by `jump` px per step at `start + i * every` (`count` steps) or at explicit frames `at`. */
export type GlideListProps = GlideOpts & { start?: number; every?: number; count?: number; jump: number; at?: number[]; drift?: number };

/** The frames a gliding list starts its steps on (fx/HardStep hardStepFrames, same props). */
export const glideFrames = (p: GlideListProps): number[] =>
  p.at ?? Array.from({ length: Math.max(0, p.count ?? 0) }, (_, i) => Math.round((p.start ?? 0) + i * (p.every ?? 1)));

/**
 * Where a gliding list is at frame f: `y` px moved (the glides plus an optional creep, `drift` px per 60 fps frame
 * at 1080p, house GLIDE.driftPx60 = 0: the list rests between its steps; at most GLIDE.driftBand[1]), `v` its speed
 * in film px per film frame (for fx/Defocus DirBlur, divided by u), and `index`, the steps started.
 */
export const glideList = (f: number, p: GlideListProps, film?: Partial<FilmCtx>): { y: number; v: number; index: number } => {
  const fr = glideFrames(p);
  const fps = fpsOf(film);
  const u = uOf(film); // like fpsOf: the timeline's frame when no film is given
  const d = clamp(p.drift ?? GLIDE.driftPx60, GLIDE.driftBand[0], GLIDE.driftBand[1]);
  const from = fr.length ? fr[0] - 1 : 0;
  const at = (g: number) => glideValue(g, fr.map((a, i) => ({ at: a, value: (i + 1) * p.jump })), 0, p, film) + (d * u * Math.max(0, g - from) * 60) / fps;
  return { y: at(f), v: at(f) - at(f - 1), index: fr.filter((a) => f >= a).length };
};

/**
 * A hold's creep (optional: a hold may be completely still): the offset of a layer creeping `px` per 60 fps frame at
 * 1080p (house GLIDE.driftPx60 = 0; clamped into GLIDE.driftBand 0-0.2, at most 12 px/s: sub-pixel at any rate)
 * along `angle` degrees (0 right, 90 down) from frame `from`, scaled with the frame; `to` ends it (the offset stays).
 * A creep goes one way: never a float that turns back, never a bob. { x, y } in film px.
 */
export const holdDrift = (f: number, from: number, o: { px?: number; angle?: number; to?: number } = {}, film?: Partial<FilmCtx>): { x: number; y: number } => {
  const fps = fpsOf(film);
  const u = uOf(film); // like fpsOf: the timeline's frame when no film is given
  const px = clamp(o.px ?? GLIDE.driftPx60, GLIDE.driftBand[0], GLIDE.driftBand[1]);
  const t = Math.max(0, Math.min(f, o.to ?? Infinity) - from);
  const dist = (px * u * t * 60) / fps;
  const a = ((o.angle ?? 0) * Math.PI) / 180;
  return { x: dist * Math.cos(a), y: dist * Math.sin(a) };
};

/** A move: from frame `from`, `dur` frames on `ease` (any 0..1 curve). */
export type Move = { from: number; dur: number; ease: Ease; id?: string };

const SAMPLES = 400;
/** The speed profile of a curve (|d progress| per 1/SAMPLES of its length) and its peak. */
const profile = (ease: Ease) => {
  const v = Array.from({ length: SAMPLES }, (_, i) => Math.abs(ease((i + 1) / SAMPLES) - ease(i / SAMPLES)));
  return { v, peak: Math.max(...v, 1e-12) };
};

/**
 * The frame from which a move stays under `share` of its peak speed (house 0.1) to its end: where it has landed. A
 * curve that ends at speed (a leave curve, E.buildIn, E.launchIn) never lands inside its span: its end frame, with
 * `atSpeed` true.
 */
export const landedAt = (m: Move, share: number = GLIDE.landShare): { frame: number; atSpeed: boolean } => {
  const { v, peak } = profile(m.ease);
  let i = SAMPLES;
  while (i > 0 && v[i - 1] <= share * peak) i--;
  if (i === SAMPLES) return { frame: m.from + m.dur, atSpeed: true };
  return { frame: Math.ceil(m.from + (i / SAMPLES) * m.dur - 1e-9), atSpeed: false };
};

/**
 * The guard for a cut or an unmount at frame `cut`: returns `cut`. When the move would be cut mid-ease (still above 10 %
 * of its peak speed there) it reports that with the frame it lands on through timingFail: a warning in dev, an error
 * under the ship gate. `whip: true` lets a move run into the cut at speed: a declared whip or velocity seam carries it
 * across. Call it where the cut frame is computed (timeline.ts, an act's constants) so scripts/precheck.mjs lists a
 * retime that cuts a move in seconds, before any render:
 * `const exitAt = landBeforeCut({ from: CUE.slide, dur: f60(34), ease: E.glideOut }, ACT.next.from)`.
 */
export const landBeforeCut = (m: Move, cut: number, o: { share?: number; whip?: boolean } = {}): number => {
  if (o.whip || cut <= m.from) return cut;
  const l = landedAt(m, o.share ?? GLIDE.landShare);
  if (l.atSpeed && cut >= m.from + m.dur)
    timingFail('landBeforeCut', `landBeforeCut: ${m.id ?? 'a move'} ends at speed on f${m.from + m.dur}: land it on an arrive curve, or declare the cut a whip or velocity seam ({ whip: true })`);
  else if (cut < l.frame)
    timingFail('landBeforeCut', `landBeforeCut: ${m.id ?? 'a move'} (f${m.from}-${m.from + m.dur}) is still above ${Math.round((o.share ?? GLIDE.landShare) * 100)} % of its peak speed on f${cut}: cut or unmount from f${l.frame}, start it ${l.frame - cut} f earlier, or declare a whip`);
  return cut;
};

/**
 * The latest start for a move of `dur` frames on `ease` that lands (under 10 % of its peak speed) by frame `cut`; a
 * curve that ends at speed has to finish first (cut - dur), or run into a declared whip.
 */
export const latestStart = (cut: number, dur: number, ease: Ease, share: number = GLIDE.landShare): number =>
  Math.floor(cut - landedAt({ from: 0, dur, ease }, share).frame);

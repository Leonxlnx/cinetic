// Camera moves: whole-shot choreography as pure functions of the frame. Every move takes framings
// (lib/camera.ts Shot: "world point (ax, ay) sits at screen point (sx, sy) at scale k") and returns a
// ShotFn, (f) => Shot, defined for any frame (fractional frames too), so sub-frames, scrubbing and
// any render order agree, and moves nest: a move's output is a valid input to the next one.
// Scale always travels in log space (lc(), lmix()), so a zoom of equal ratios reads as one speed.
//
//   scaleBreath   a cut that breathes: push into the cut (accelerating), the next shot opens off its
//                 rest and settles (mode 'flip' reverses the push, 'same' keeps its direction)
//   whip          a fast reframe with a long build and a short brake; .peak is its fastest frame
//   blurRanges    the frames a camera move is fast enough to smear on (declare them as camera blur)
//   whipCurve     a whip's curve drawn from its speed profile: where the peak sits, how sharp each side is
//   peakFrame     the fastest frame of any eased move: cut, swap copy or sound on it
//   swapAt        a copy swap timed on a peak: the old copy leaves on it, the new one is already arriving
//   zoomThrough   an exponential dive into a point until a shape fills the frame; .cut is that frame
//   reframeChain  chained reframes with near-holds that drift, a scale pulse at peak speed and roll
//   reversal      a pull-back that turns into a push and cuts on the push's fastest frame
//   punchOut      a tight crop drifting faster and faster, cut to the wide shot carrying the speed
//   parallax      layers of one push at different log-scale rates (depth without 3D)
//
// Durations are film frames (convert house 60 fps numbers with f60x()); defaults are house numbers
// written at 60 fps and converted with the film's fps, so the same call reads the same at 24-60 fps.
import { BREATH, clamp, DUR, E, type Ease, lmix, mix, prog } from './anim';
import { lc, type Shot } from './camera';
import { f60x, type FilmCtx, fpsOf, sizeOf, uOf } from './film';
import { carry, type CarryOpts, fastRanges, launch, LAUNCH } from './handoff';

/** A framing for any frame. */
export type ShotFn = (f: number) => Shot;
/** A framing, or a function of the frame that returns one. */
export type ShotLike = Shot | ShotFn;

const shotAt = (s: ShotLike, f: number): Shot => (typeof s === 'function' ? s(f) : s);
const lnOf = (k: number) => Math.log(Math.max(1e-6, k));
/** The frame `f` with the given extra properties attached (a ShotFn that also carries its cut, peak ...). */
const withProps = <T extends object>(fn: ShotFn, props: T): ShotFn & T => Object.assign(fn, props);

/** House numbers of the camera moves, 60 fps frames unless noted. */
export const MOVES = {
  breath: { pre: 0.03, preBuild60: 20, open: 0.08, settle60: 30 }, // push 3 % into the cut, next shot opens 8 % off and settles in 30 f
  whip60: DUR.whip[2], // 32 f
  swap: { first: 0.4 }, // the new copy is already 40 % on its first frame
  zoomThrough: { factor: 8, frames60: DUR.zoomThrough[1], cover: 0.99 }, // x8 in 24 f, cut once the shape covers 99 % of the frame
  reframe: { frames60: DUR.pan[2], gap60: 8, pulse: 0.05, residual60: 0 }, // a move of 48 f, near-holds of 8 f at rest (residual: an optional creep, at most 0.2 px/f@60)
  reversal: { pull: 0.85, pull60: DUR.pull[3], push: 1.04, push60: 24 }, // pull back to 0.85 over 70 f, push 4 % over 24 f into the cut
  punch: { crop: 3, ratio: 1 }, // the tight shot is 3x the wide one; the wide shot keeps the world's speed
} as const;

// ------------------------------------------------------------------------------------------------
// peakFrame, swapAt

/**
 * The fastest frame of a move on `ease` that starts at `start` and lasts `frames` film frames: the
 * whole film frame whose incoming step (from f - 1 to f) is the largest (start and length may be
 * fractional). A log-scale move (lmix) has the same peak, since its log step is proportional to the
 * eased step. Cut, swap copy or put the whoosh's peak on this frame.
 */
export const peakFrame = (ease: Ease, start: number, frames: number): number => {
  const d = Math.max(1e-6, frames);
  const at = (f: number) => ease(clamp((f - start) / d));
  const first = Math.floor(start + 1e-9) + 1;
  const last = Math.max(first, Math.ceil(start + d - 1e-9));
  let best = first;
  let vmax = -Infinity;
  for (let f = first; f <= last; f++) {
    const v = at(f) - at(f - 1);
    if (v > vmax + 1e-12) {
      vmax = v;
      best = f;
    }
  }
  return best;
};

export type SwapOpts = {
  lead?: number; // frames the new copy starts before the peak (default 1: it is already arriving on the frame before the old copy goes); 0 = on the peak
  blank?: number; // empty frames before the peak: the old copy's last frame is peak - 1 - blank (default 0); pair with lead 0 for a cut through nothing
  first?: number; // the new copy's opacity on its first frame (house 0.4): it never starts from an empty frame
  frames?: number; // the new copy's arrival, film frames (default the house word duration: 32 f at 60 fps)
  ease?: Ease; // its arrival curve (default E.snapOut)
  fps?: number;
};
export type SwapState = { old: boolean; next: boolean; opacity: number; t: number };

/**
 * A copy swap on a camera move's fastest frame (`peak`, from peakFrame()): the old copy shows up to
 * and including peak - 1 (- `blank`) and is cut there, where the eye cannot hold it; the new copy starts
 * `lead` frames before the peak, already `first` opaque, and completes its arrival on `ease`. Returns the
 * state for frame f: which copies show, the new copy's opacity, and t = frames since its first frame.
 * The arrival is the ease sampled from the point where it equals `first`, so the opacity keeps the
 * curve's own speed from there on (no step).
 */
export const swapAt = (peak: number, o: SwapOpts = {}) => {
  const fps = o.fps ?? fpsOf();
  const lead = o.lead ?? 1;
  const ease = o.ease ?? E.snapOut;
  const frames = Math.max(1, o.frames ?? f60x(32, fps));
  const first = clamp(o.first ?? MOVES.swap.first, 0, 0.999);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (ease(m) < first) lo = m;
    else hi = m;
  }
  const t0 = first <= 0 ? 0 : hi;
  const from = peak - lead;
  const state = (f: number): SwapState => {
    const t = f - from;
    const next = f >= from;
    const opacity = next ? ease(clamp(t0 + (t / frames) * (1 - t0))) : 0;
    return { old: f < peak - Math.max(0, o.blank ?? 0), next, opacity, t };
  };
  return Object.assign(state, { peak, from, t0, oldLast: peak - 1 - Math.max(0, o.blank ?? 0) });
};

// ------------------------------------------------------------------------------------------------
// scaleBreath

export type BreathOpts = {
  cut: number; // the outgoing shot's last frame: the push's fastest frame. The incoming shot starts on cut + 1.
  /** The push into the cut, ln-scale built like lib/handoff launch(): step k frames before the cut = vCut * exp(-a * s^p). */
  pre?:
    | {
        amount?: number; // total scale gain of the push (house 0.03 = +3 %; normal 0.01-0.08)
        build?: number; // film frames from 1 % of the cut speed to the cut (house 20 f at 60 fps); sets a when a is not given
        a?: number;
        p?: number; // shape exponent (house LAUNCH.p 0.76)
        ratios?: number[]; // explicit growth factors of the step into the cut, oldest first (overrides a/p/build)
      }
    | false;
  /** The incoming shot opens `open` off its rest framing and settles on `ease` over `frames`. */
  post?: { open?: number; frames?: number; ease?: Ease } | false; // house 0.08 (normal 0.05-0.12) over 30 f at 60 fps on E.glideOut
  mode?: 'flip' | 'same'; // flip (default): the push reverses at the cut (in, then out); same: the next shot opens wide and keeps pushing in
  dir?: 1 | -1; // 1 (default) pushes in into the cut, -1 pulls out into it
  fps?: number;
};

/**
 * The ln-scale of the push into the cut at frame f: 0 before the push, ln(1 + amount) on the cut
 * frame. With a/p (or `build`) the steps going back from the cut are exp(-a * s^p) of the cut step
 * (s in 60 fps frames), so the push grows out of nothing; with `ratios` it spans exactly
 * ratios.length + 1 steps. Inside a frame it moves linearly (sub-frames never stall).
 */
const breathPre = (f: number, o: BreathOpts, fps: number): number => {
  if (o.pre === false) return 0;
  const pr = o.pre ?? {};
  const amount = Math.log(1 + (pr.amount ?? MOVES.breath.pre));
  const steps: number[] = [1]; // step into the cut frame, then going back
  if (pr.ratios && pr.ratios.length) {
    for (let k = 1; k <= pr.ratios.length; k++) steps.push(steps[k - 1] / Math.max(1e-6, pr.ratios[pr.ratios.length - k]));
  } else {
    const p = pr.p ?? LAUNCH.p;
    const s = ((pr.build ?? f60x(MOVES.breath.preBuild60, fps)) * 60) / fps;
    const a = pr.a ?? Math.log(100) / Math.max(1e-6, s) ** p;
    for (let k = 1; k < 4000; k++) {
      const v = Math.exp(-a * ((k * 60) / fps) ** p);
      if (v < 1e-7) break;
      steps.push(v);
    }
  }
  const total = steps.reduce((x, v) => x + v, 0);
  const back = Math.max(0, o.cut - f); // frames before the cut
  const m = Math.floor(back);
  let gone = 0; // ln-scale not yet reached at frame f, in units of the cut step
  for (let k = 0; k < Math.min(m, steps.length); k++) gone += steps[k];
  if (m < steps.length) gone += (back - m) * steps[m];
  return amount * (1 - Math.min(total, gone) / total);
};

/**
 * Scale multiplier of a breathing cut at frame f: 1 at rest. Up to the cut: the push, 1 -> 1 + amount
 * on the cut frame, accelerating. From cut + 1: the incoming shot's offset, (1 + open) on its first
 * frame (mode 'flip', or 1 / (1 + open) for 'same'), settling to 1 on `ease` over `frames`.
 */
export const breathK = (f: number, o: BreathOpts): number => {
  const fps = o.fps ?? fpsOf();
  const dir = o.dir ?? 1;
  if (f <= o.cut) return Math.exp(dir * breathPre(f, o, fps));
  if (o.post === false) return 1;
  const po = o.post ?? {};
  const open = Math.log(1 + (po.open ?? MOVES.breath.open));
  const frames = Math.max(1, po.frames ?? f60x(MOVES.breath.settle60, fps));
  const ease = po.ease ?? E.glideOut;
  const sign = (o.mode ?? 'flip') === 'flip' ? dir : -dir;
  const t = clamp((f - o.cut - 1) / frames);
  return Math.exp(sign * open * (1 - ease(t)));
};

/**
 * A breathing cut between two framings: `from` (the outgoing shot) pushes into the cut, `to` (the
 * incoming shot) opens off its rest and settles. Scale is multiplied around each shot's own anchor.
 */
export const scaleBreath = (o: BreathOpts & { from: ShotLike; to: ShotLike }): ShotFn => {
  const fn: ShotFn = (f) => {
    const s = shotAt(f <= o.cut ? o.from : o.to, f);
    return { ...s, k: s.k * breathK(f, o) };
  };
  return withProps(fn, { cut: o.cut });
};

// ------------------------------------------------------------------------------------------------
// whip

export type WhipOpts = {
  from: ShotLike;
  to: ShotLike;
  start: number; // first frame of the move (progress 0 on it)
  frames?: number; // film frames (house 32 f at 60 fps; normal 17-94)
  ease?: Ease; // house E.whipBuild: a long build, a short brake, peak speed at 55-60 % of the move
  dip?: number; // zoom-out hop at mid-move (multiply k by 1 - dip * sin^2(pi t)); 0 = none (default)
  roll?: number; // degrees of roll added at mid-move and taken back by the end (a tilt riding the whip)
  fps?: number;
};

export type WhipCurveOpts = {
  peak?: number; // where the speed peaks, share of the move (house 0.6; normal 0.5-0.7)
  build?: number; // how fast the speed falls away going back from the peak (house 3.7): larger = a later, more violent build
  buildP?: number; // shape of the build (house 0.8; 1 = exponential in distance, < 1 = a sharper spike)
  brake?: number; // the same after the peak (house 3.3): larger = a harder brake
  brakeP?: number; // (house 1)
};

/**
 * A whip curve drawn from its speed: the speed peaks at `peak` and falls away on each side as
 * exp(-k * d^p) of the normalised distance d from the peak (build: before it, brake: after it).
 * Progress is the normalised integral of that speed, from a fixed 1024-step table (deterministic,
 * cheap per call). Raise build/brake for a sharper, louder whip; keep them near 3-4 for the house
 * feel. Pass it as whip({ ease }) or to any move.
 */
export const whipCurve = (o: WhipCurveOpts = {}): Ease => {
  const tp = clamp(o.peak ?? 0.6, 0.05, 0.95);
  const A = Math.max(0, o.build ?? 3.7);
  const P = Math.max(0.2, o.buildP ?? 0.8);
  const B = Math.max(0, o.brake ?? 3.3);
  const Q = Math.max(0.2, o.brakeP ?? 1);
  const N = 1024;
  const c = new Float64Array(N + 1);
  const speed = (t: number) => (t < tp ? Math.exp(-A * ((tp - t) / tp) ** P) : Math.exp(-B * ((t - tp) / (1 - tp)) ** Q));
  for (let i = 1; i <= N; i++) c[i] = c[i - 1] + speed((i - 0.5) / N) / N;
  const total = c[N];
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const x = t * N;
    const i = Math.floor(x);
    return (c[i] + (c[Math.min(N, i + 1)] - c[i]) * (x - i)) / total;
  };
};

/** A whip from one framing to another. `.peak` is its fastest frame: swap content or put the whoosh there. */
export const whip = (o: WhipOpts) => {
  const fps = o.fps ?? fpsOf();
  const frames = Math.max(1, o.frames ?? f60x(MOVES.whip60, fps));
  const ease = o.ease ?? E.whipBuild;
  const fn: ShotFn = (f) => {
    const t = prog(f, o.start, o.start + frames, ease);
    const lin = clamp((f - o.start) / frames);
    const s = lc(shotAt(o.from, f), shotAt(o.to, f), t);
    const hop = Math.sin(Math.PI * lin) ** 2;
    return { ...s, k: s.k * (1 - (o.dip ?? 0) * hop), roll: (s.roll ?? 0) + (o.roll ?? 0) * hop };
  };
  return withProps(fn, { peak: peakFrame(ease, o.start, frames), start: o.start, end: o.start + frames });
};

/**
 * How fast the picture moves under a camera at frame f: the largest screen displacement (px per film
 * frame, the step from f - 1 to f) of the frame's four corners and centre, pan, zoom and roll
 * together. Feed it to fastRanges() (lib/handoff.ts) for the frames a whip smears on.
 */
export const shotSpeed = (shot: ShotFn, f: number, size: { width: number; height: number }): number => {
  const a = shot(f - 1);
  const b = shot(f);
  const ra = ((a.roll ?? 0) * Math.PI) / 180;
  const rb = ((b.roll ?? 0) * Math.PI) / 180;
  let best = 0;
  for (const [qx, qy] of [[0, 0], [size.width, 0], [0, size.height], [size.width, size.height], [size.width / 2, size.height / 2]]) {
    // the world point under screen point q at f - 1, then where it is at f
    const dx = (qx - a.sx) / a.k;
    const dy = (qy - a.sy) / a.k;
    const wx = a.ax + dx * Math.cos(ra) + dy * Math.sin(ra);
    const wy = a.ay - dx * Math.sin(ra) + dy * Math.cos(ra);
    const ex = (wx - b.ax) * b.k;
    const ey = (wy - b.ay) * b.k;
    const px = b.sx + ex * Math.cos(rb) - ey * Math.sin(rb);
    const py = b.sy + ex * Math.sin(rb) + ey * Math.cos(rb);
    best = Math.max(best, Math.hypot(px - qx, py - qy));
  }
  return best;
};

/**
 * The camera-blur ranges of a camera move between `from` and `to`: the frames whose screen speed
 * (shotSpeed) is over the smear threshold (lib/handoff.ts SMEAR, 720 px/s at 1080p), padded and
 * merged. A whip peaks on its fastest frames, so a 32 f house whip declares about its middle third.
 * Declare them as CAMERA_BLUR (or return them from an act's declares()); in a crisp film only those
 * frames render with the shutter, so the whip carries a real streak and the holds stay sharp.
 */
export const blurRanges = (shot: ShotFn, from: number, to: number, o: { film?: Partial<FilmCtx>; threshold?: number; pad?: number; id?: string } = {}) => {
  const size = sizeOf(o.film);
  return fastRanges((f) => shotSpeed(shot, f, size), from, to, { threshold: o.threshold, pad: o.pad, u: uOf(o.film), fps: fpsOf(o.film), id: o.id ?? 'camera' });
};

// ------------------------------------------------------------------------------------------------
// zoomThrough

export type ZoomThroughOpts = {
  from: Shot; // the framing the dive starts from
  anchor: { x: number; y: number }; // world point dived into: it stays where it is on screen (or moves to centre, `centre`)
  start: number;
  factor?: number; // total scale growth over `frames` (house x8)
  frames?: number; // film frames (house 24 f at 60 fps; normal 14-46)
  ease?: Ease; // on log scale: E.linear (default) = a constant ratio a frame; E.buildIn = an accelerating dive
  hold?: number; // posterise: the pose updates every `hold` frames (2 = on twos); 1 (default) = every frame
  holdFrom?: number; // the frame the posterising grid starts on (default `start`); frames before it update every frame
  centre?: Ease | false; // move the anchor to the frame centre along this curve of the dive (default false)
  box?: { x: number; y: number; w: number; h: number }; // world rect that must fill the frame: .cut is the first frame it covers `cover` of it
  cover?: number; // share of the frame the box must cover (house 0.99)
  width?: number; // frame size for the cover test (default the film's)
  height?: number;
  fps?: number;
};

/**
 * An exponential dive into a point: k grows by `factor` over `frames` on `ease` in log space (so
 * E.linear is a constant ratio per frame), the anchor holding its screen point. With a `box` (a
 * glyph's counter, a window, a card) `.cut` is the first frame the box covers `cover` of the frame:
 * cut there into what was inside. `.k(f)` is the scale multiplier, `.cover(f)` the covered share.
 */
export const zoomThrough = (o: ZoomThroughOpts) => {
  const fps = o.fps ?? fpsOf();
  const frames = Math.max(1, o.frames ?? f60x(MOVES.zoomThrough.frames60, fps));
  const factor = o.factor ?? MOVES.zoomThrough.factor;
  const ease = o.ease ?? E.linear;
  const hold = Math.max(1, Math.round(o.hold ?? 1));
  const W = o.width ?? 0;
  const H = o.height ?? 0;
  const s0 = { x: o.from.sx + (o.anchor.x - o.from.ax) * o.from.k, y: o.from.sy + (o.anchor.y - o.from.ay) * o.from.k };
  const h0 = o.holdFrom ?? o.start;
  const posed = (f: number) => (hold > 1 && f >= h0 ? h0 + Math.floor((Math.round(f) - h0) / hold) * hold : f);
  const kMul = (f: number) => lmix(1, factor, ease(clamp((posed(f) - o.start) / frames)));
  const shot: ShotFn = (f) => {
    const g = kMul(f);
    const c = o.centre ? o.centre(clamp(Math.log(g) / Math.log(Math.max(1.000001, factor)))) : 0;
    return { ...o.from, ax: o.anchor.x, ay: o.anchor.y, sx: mix(s0.x, W / 2, c), sy: mix(s0.y, H / 2, c), k: o.from.k * g };
  };
  const cover = (f: number): number => {
    if (!o.box || W <= 0 || H <= 0) return 0;
    const s = shot(f);
    const x0 = s.sx + (o.box.x - s.ax) * s.k;
    const y0 = s.sy + (o.box.y - s.ay) * s.k;
    const ix = Math.max(0, Math.min(W, x0 + o.box.w * s.k) - Math.max(0, x0));
    const iy = Math.max(0, Math.min(H, y0 + o.box.h * s.k) - Math.max(0, y0));
    return (ix * iy) / (W * H);
  };
  let cut = o.start + Math.ceil(frames);
  if (o.box && W > 0 && H > 0) {
    const need = o.cover ?? MOVES.zoomThrough.cover;
    for (let f = o.start; f <= o.start + Math.ceil(frames) + 1; f++)
      if (cover(f) >= need) {
        cut = f;
        break;
      }
  }
  return withProps(shot, { cut, k: kMul, cover, end: o.start + frames });
};

// ------------------------------------------------------------------------------------------------
// reframeChain

export type ReframeOpts = {
  start: number; // the first move's first frame
  frames?: number | number[]; // each move's length, film frames (house 48 f at 60 fps; normal 27-126)
  gap?: number | number[]; // the near-hold after each move, film frames (house 8 f at 60 fps)
  ease?: Ease; // position and scale (house E.strongInOut: camera reframes)
  rollEase?: Ease; // roll (default `ease`); an arrive curve that overshoots gives the roll its lean
  /** Scale pulse riding each move: rises on `rise` to `peak` at `at` (default the move's fastest moment), falls on `fall` by the end. */
  pulse?: number | { peak?: number; at?: number; rise?: Ease; fall?: Ease }; // house 0.05; 0 = none
  residual?: number; // drift in the near-holds, screen px per 60 fps frame along the last move (house 0: the near-hold rests; at most 0.2 = 12 px/s)
  fps?: number;
};

const nth = (v: number | number[] | undefined, i: number, dflt: number) => (Array.isArray(v) ? (v[i] ?? v[v.length - 1] ?? dflt) : (v ?? dflt));

/** The moment (0..1) of a curve's peak speed, sampled finely. */
const peakT = (ease: Ease) => {
  let best = 0.5;
  let vmax = -Infinity;
  for (let i = 1; i <= 400; i++) {
    const v = ease(i / 400) - ease((i - 1) / 400);
    if (v > vmax) {
      vmax = v;
      best = (i - 0.5) / 400;
    }
  }
  return best;
};

/**
 * Chained reframes: the camera moves from shots[0] to shots[1], holds near-still for `gap` frames
 * (drifting `residual` px a frame along the move it just made), moves on to shots[2], and so on.
 * Each move eases position and scale on `ease` and roll on `rollEase`; a scale pulse swells into
 * the move's fastest moment and settles by its end. `.moves` lists each move's [start, end].
 */
export const reframeChain = (shots: Shot[], o: ReframeOpts) => {
  const fps = o.fps ?? fpsOf();
  const ease = o.ease ?? E.strongInOut;
  const rollEase = o.rollEase ?? ease;
  const pu = typeof o.pulse === 'number' || o.pulse === undefined ? { peak: o.pulse ?? MOVES.reframe.pulse } : o.pulse;
  const pPeak = Math.log(1 + (pu.peak ?? MOVES.reframe.pulse));
  const pAt = clamp(pu.at ?? peakT(ease), 0.05, 0.95);
  const rise = pu.rise ?? E.buildIn;
  const fall = pu.fall ?? E.glideOut;
  const bump = (t: number) => (t <= 0 || t >= 1 ? 0 : t < pAt ? rise(t / pAt) : 1 - fall((t - pAt) / (1 - pAt)));
  const res = ((o.residual ?? MOVES.reframe.residual60) * 60) / fps;
  const moves: [number, number][] = [];
  let t0 = o.start;
  for (let i = 0; i < shots.length - 1; i++) {
    const d = Math.max(1, nth(o.frames, i, f60x(MOVES.reframe.frames60, fps)));
    moves.push([t0, t0 + d]);
    t0 += d + Math.max(0, nth(o.gap, i, f60x(MOVES.reframe.gap60, fps)));
  }
  // screen direction of each move (unit), for the drift in the near-hold after it: how the point framed
  // by the move's first shot travels on screen
  const dirs = moves.map((_, i) => {
    const A = shots[i];
    const B = shots[i + 1];
    const a = { x: A.sx, y: A.sy };
    const b = { x: B.sx + (A.ax - B.ax) * B.k, y: B.sy + (A.ay - B.ay) * B.k };
    const n = Math.hypot(b.x - a.x, b.y - a.y);
    return n > 1e-9 ? { x: (b.x - a.x) / n, y: (b.y - a.y) / n } : { x: 0, y: 0 };
  });
  const fn: ShotFn = (f) => {
    if (!moves.length) return shots[0];
    let i = moves.findIndex(([, e]) => f < e);
    if (i < 0) i = moves.length - 1;
    // drift accumulated in every finished near-hold before this one, and in the current one
    let dx = 0;
    let dy = 0;
    for (let j = 0; j < moves.length; j++) {
      const hEnd = j + 1 < moves.length ? moves[j + 1][0] : Infinity;
      const run = Math.max(0, Math.min(f, hEnd) - moves[j][1]);
      dx += dirs[j].x * res * run;
      dy += dirs[j].y * res * run;
    }
    const [s, e] = moves[i];
    const lt = clamp((f - s) / (e - s));
    const A = shots[i];
    const B = shots[i + 1];
    const base = lc(A, B, ease(lt));
    const roll = mix(A.roll ?? 0, B.roll ?? 0, rollEase(lt));
    const k = base.k * Math.exp(pPeak * bump(lt));
    // the drift is a screen offset: carry it as an anchor offset so it survives the scale
    return { ...base, k, roll, ax: base.ax - dx / k, ay: base.ay - dy / k };
  };
  return withProps(fn, { moves });
};

// ------------------------------------------------------------------------------------------------
// reversal

export type ReversalOpts = {
  from: ShotLike; // the framing at the start of the pull
  start: number;
  pull?: { to?: number; frames?: number; ease?: Ease }; // pull back to `to` x k (house 0.85) over `frames` (house 70 f at 60 fps) on E.glideOut
  rest?: number; // frames held at the turn (default 0)
  push?: { to?: number; frames?: number; ease?: Ease }; // then push to `to` x the pulled framing (house 1.04) over `frames` (house 24 f at 60 fps) on E.buildIn
  fps?: number;
};

/**
 * Anticipation for a cut: a pull-back that decelerates to the turn, then a short push that
 * accelerates into the cut. `.cut` is the push's last frame, its fastest: cut there. `.turn` is the
 * pull's last frame.
 */
export const reversal = (o: ReversalOpts) => {
  const fps = o.fps ?? fpsOf();
  const pull = { to: o.pull?.to ?? MOVES.reversal.pull, frames: Math.max(1, o.pull?.frames ?? f60x(MOVES.reversal.pull60, fps)), ease: o.pull?.ease ?? E.glideOut };
  const push = { to: o.push?.to ?? MOVES.reversal.push, frames: Math.max(1, o.push?.frames ?? f60x(MOVES.reversal.push60, fps)), ease: o.push?.ease ?? E.buildIn };
  const turn = o.start + pull.frames;
  const pushFrom = turn + Math.max(0, o.rest ?? 0);
  const cut = pushFrom + push.frames;
  const kMul = (f: number) => lmix(1, pull.to, pull.ease(clamp((f - o.start) / pull.frames))) * lmix(1, push.to, push.ease(clamp((f - pushFrom) / push.frames)));
  const fn: ShotFn = (f) => {
    const s = shotAt(o.from, f);
    return { ...s, k: s.k * kMul(f) };
  };
  return withProps(fn, { cut, turn, k: kMul });
};

// ------------------------------------------------------------------------------------------------
// punchOut

export type PunchOutOpts = {
  wide: ShotLike; // the wide framing of the shot after the cut, at rest
  cut: number; // the tight shot's last frame (its fastest)
  crop?: number; // tight shot scale over the wide one (house 3)
  dir?: { x: number; y: number }; // screen direction the content travels (default { x: 1, y: 0 }: drifting right)
  /** The tight shot's drift: screen px per film frame on the cut frame and its build (lib/handoff launch()). */
  drift?: { vCut: number; a?: number; p?: number; ratios?: number[]; floor?: number; fpsRef?: number };
  /** The wide shot's carry: opens at `ratio` x the world speed of the cut (house 1) and decays in two stages to its residual. */
  carry?: Omit<CarryOpts, 'v0' | 'vCut' | 'fps'> & { ratio?: number };
  fps?: number;
};

/**
 * A punch-out: a tight crop of the wide frame (scale x `crop`) drifts faster and faster and cuts on
 * its fastest frame to the wide shot, which keeps the world moving at the same speed (so the screen
 * speed drops by the crop: one continuous move seen from further back) and settles to a living
 * drift. Returns the camera for any frame; `.tight(f)` and `.wideAt(f)` are the two halves alone and
 * `.v(f)` the content's screen speed (px per film frame).
 */
export const punchOut = (o: PunchOutOpts) => {
  const fps = o.fps ?? fpsOf();
  const crop = o.crop ?? MOVES.punch.crop;
  const dir = o.dir ?? { x: 1, y: 0 };
  const dn = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / dn;
  const uy = dir.y / dn;
  const vCut = o.drift?.vCut ?? 0;
  const lo = { vCut, a: o.drift?.a, p: o.drift?.p, ratios: o.drift?.ratios, floor: o.drift?.floor, fpsRef: o.drift?.fpsRef, fps };
  const v0 = ((o.carry?.ratio ?? MOVES.punch.ratio) * vCut) / crop;
  const co: CarryOpts = { ...o.carry, v0, fps };
  // content screen offset along dir: launch x (0 on the cut) before, carried after (0 on the cut)
  const offset = (f: number) => (f <= o.cut ? launch(f, o.cut, lo).x : v0 + carry(f, o.cut + 1, co).x);
  const tight = (f: number): Shot => {
    const w = shotAt(o.wide, Math.min(f, o.cut + 1));
    const k = w.k * crop;
    const d = offset(Math.min(f, o.cut));
    return { ...w, k, ax: w.ax - (ux * d) / k, ay: w.ay - (uy * d) / k };
  };
  const wideAt = (f: number): Shot => {
    const w = shotAt(o.wide, f);
    const d = offset(Math.max(f, o.cut + 1)) - v0; // 0 on the wide shot's first frame
    return { ...w, ax: w.ax - (ux * d) / w.k, ay: w.ay - (uy * d) / w.k };
  };
  const fn: ShotFn = (f) => (f <= o.cut ? tight(f) : wideAt(f));
  const v = (f: number) => (f <= o.cut ? launch(f, o.cut, lo).v : f <= o.cut + 1 ? v0 : carry(f, o.cut + 1, co).v);
  return withProps(fn, { cut: o.cut, crop, tight, wideAt, v });
};

// ------------------------------------------------------------------------------------------------
// parallax

/** One depth layer of a push: weight on log scale (1 = the camera, 0 = still), optional lag, curve and pan share. */
export type ParallaxLayer = { w: number; lag?: number; ease?: Ease; pan?: number };

/** k of a layer at weight w on log scale around `base`: base * (k / base)^w. */
export const parallaxK = (k: number, w: number, base = 1) => base * Math.exp(w * (lnOf(k) - lnOf(base)));

/**
 * Layers of one push at different log-scale rates: the type at full rate, cards behind it at about
 * half, the ground still, so a flat frame reads with depth. `move` is the push (from -> to over
 * `frames` from `start` on `ease`, or any ShotFn); each layer scales by exp(w * ln(k / k0)) around
 * the same anchor, starts `lag` frames late, may ride its own curve (push form only) and takes
 * `pan` (default w) of the pan. Returns the layers' framings for frame f, in the order given.
 */
export const parallax = (
  layers: readonly ParallaxLayer[],
  move: { from: Shot; to: Shot; start: number; frames: number; ease?: Ease } | { shot: ShotFn; base: Shot },
) => {
  const push = 'from' in move ? move : null;
  const base = push ? push.from : (move as { base: Shot }).base;
  const at = (f: number, l: ParallaxLayer): Shot => {
    const g = f - (l.lag ?? 0);
    if (push) return lc(push.from, push.to, prog(g, push.start, push.start + push.frames, l.ease ?? push.ease ?? E.softOut));
    return (move as { shot: ShotFn }).shot(g);
  };
  return (f: number): Shot[] =>
    layers.map((l) => {
      const s = at(f, l);
      const pan = l.pan ?? l.w;
      return {
        ...s,
        k: parallaxK(s.k, l.w, base.k),
        ax: mix(base.ax, s.ax, pan),
        ay: mix(base.ay, s.ay, pan),
        sx: mix(base.sx, s.sx, pan),
        sy: mix(base.sy, s.sy, pan),
      };
    });
};

/**
 * The modal moment, measured: the scene under a dialog blurs (to 14 px at 1080p) and dims (an ink veil to 0.45) over
 * 20 f while the camera pushes x1.43 over 42 f on E.stdInOut; the toast pops at the push's midpoint: opacity in 8 f,
 * scale 0.86 -> 1 in 10 f, its own blur 5 -> 0 over 22 f, rising 24 px. 60 fps frames.
 */
export const MODAL = { blur: 14, veil: 0.45, dim60: 20, push: 1.43, push60: 42, pop60: 8, scaleFrom: 0.86, scale60: 10, toastBlur: 5, blur60: 22, rise: 24 } as const;

/** The modal push at frame f from `at` (the scene's blur, veil and camera scale; the toast's opacity, scale, blur and rise). Pure. */
export const modalPush = (f: number, at: number, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dim = E.stdInOut(clamp((f - at) / f60x(MODAL.dim60, fps)));
  const k = lmix(1, MODAL.push, E.stdInOut(clamp((f - at) / f60x(MODAL.push60, fps))));
  const t = f - (at + f60x(MODAL.push60 / 2, fps)); // the toast pops at the push's midpoint
  const sc = E.snapOut(clamp(t / f60x(MODAL.scale60, fps)));
  return {
    blur: MODAL.blur * dim,
    veil: MODAL.veil * dim,
    k,
    toast: { shown: t >= 0, opacity: clamp(t / f60x(MODAL.pop60, fps)), scale: mix(MODAL.scaleFrom, 1, sc), blur: t < 0 ? MODAL.toastBlur : MODAL.toastBlur * (1 - clamp(t / f60x(MODAL.blur60, fps))), rise: MODAL.rise * (1 - sc) },
  };
};

/** BREATH (lib/anim.ts) re-exported here: the normal ranges the breath defaults sit in. */
export { BREATH };

// The motion core. Every move in a film reads its curve from here, so the film has one character.
//
// Three families, chosen by what the move does:
//   out    arrive: fast first, long settle. Entrances, landings, reframes that end on something.
//   inOut  travel: a camera or object going from A to B inside a shot.
//   in     leave: slow first, ends at full speed. Exits, ideally cut or carried on their last frame.
// Never linear for anything that moves. Linear is for colour, a clock, a progress bar that is a real rate.
import { Easing, interpolate, spring, type SpringConfig } from 'remotion';

export type Ease = (t: number) => number;

const bz = (a: number, b: number, c: number, d: number): Ease => Easing.bezier(a, b, c, d);

/**
 * A true exponential arrival with rate `k`, scaled to end exactly on 1: every frame covers the same share of the distance
 * still to go, so the move slows forever and never stops dead. k 6: the last tenth of the distance takes the last ~62 %
 * of the time; k 8 is sharper, k 4 softer. The speed keeps e^(-k/dur) a frame: aim for 0.84-0.9 (k 6 over 36-60 f, k 4
 * over 24-30 f); shorter reads as an angular landing. `expo(6)` is `ease.expoOut`.
 */
export const expo = (k = 6): Ease => (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.exp(-k * t)) / (1 - Math.exp(-k)));
const expoOut = expo(6);

/** The house curves. Names say the feel; numbers are cubic-beziers you can paste into CSS or After Effects. */
export const ease = {
  /** Expo out: the default arrival. Half-way at ~10 % of the time. cubic-bezier(0.16, 1, 0.3, 1). */
  out: bz(0.16, 1, 0.3, 1),
  /** Quint out: a softer arrival for big, heavy things (a hero card, a lockup). */
  soft: bz(0.22, 1, 0.36, 1),
  /** Snap: an even sharper arrival for small UI pops, chips and cursor targets. */
  snap: bz(0.05, 0.9, 0.1, 1),
  /** Expo in-out: camera travel and object moves that start and end at rest. */
  inOut: bz(0.87, 0, 0.13, 1),
  /** Quart in-out: a gentler travel for long pans. */
  glide: bz(0.76, 0, 0.24, 1),
  /** Expo in: leaving. Ends at full speed: cut, wipe or hand off on the last frame. */
  in: bz(0.7, 0, 0.84, 0),
  /** Back out: a small overshoot (about 6 %). For things that land with weight: a stamp, a badge, a logo. */
  back: bz(0.34, 1.36, 0.64, 1),
  /** Only for colour fades, real rates and clocks. Never for a position, scale, rotation or blur. */
  linear: (t: number) => t,
  /**
   * True exponential out (k 6, see `expo`): a constant share of the remaining distance a frame, a long tail, no dead
   * stop. The arrival for anything that enters already moving (from off frame, out of a cut, under blur).
   */
  expoOut: expoOut,
  /** True exponential in: the mirror of expoOut. Starts from rest with a slow first stretch, ends at full speed. Exits. */
  expoIn: (t: number) => 1 - expoOut(1 - t),
  /** True exponential in-out: from rest to rest, both halves exponential. A move inside a shot from A to B. */
  expoInOut: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? (1 - expoOut(1 - 2 * t)) / 2 : 0.5 + expoOut(2 * t - 1) / 2),
} as const;

/** Exponential zoom progress: equal visual speed at every scale (log space). Use for every zoom over ~1.5x. */
export const logScale = (from: number, to: number, p: number) => from * Math.pow(to / from, p);

/**
 * Log-space mix for anything multiplicative (scale, zoom, a size seen at a distance): `logMix(p, 1, 4)` grows by the same
 * ratio every frame at constant p speed, so a zoom reads as one even speed instead of rushing at the start and crawling
 * at the end. Values must be above 0 (a 0 is taken as 0.001).
 */
export const logMix = (p: number, from: number, to: number) => {
  const a = Math.max(1e-3, from);
  const b = Math.max(1e-3, to);
  return a * Math.pow(b / a, p);
};

/**
 * Exponential approach: progress 0..1 that covers half the remaining distance every `halfLife` frames from `start`.
 * It begins at full speed (for an arrival that is already moving) and never quite stops: after 4 half-lives it is at
 * 94 %, after 7 at 99 %. Half-life 3-4 f for small UI, 4-7 f for a card or a word (the speed then keeps 84-90 % a frame,
 * the soft tail of well-made motion), 8-14 f for the camera.
 */
export const approach = (frame: number, start: number, halfLife = 6) =>
  frame <= start ? 0 : 1 - Math.pow(0.5, (frame - start) / Math.max(0.001, halfLife));

// (1 + x) e^-x = 0.5 at x = 1.6783: the critically damped curve's half-way point in units of 1/omega
const CRIT_HALF = 1.6783469900166608;

/**
 * Critically damped settle from rest: progress 0..1 from `start`, half-way after `halfLife` frames, no overshoot,
 * starts with zero speed and eases out on an exponential tail. The move from rest: a card that slides over, a camera
 * that reframes. 99 % at about 4 half-lives.
 */
export const settle = (frame: number, start: number, halfLife = 8) => {
  if (frame <= start) return 0;
  const x = ((frame - start) * CRIT_HALF) / Math.max(0.001, halfLife);
  return 1 - (1 + x) * Math.exp(-x);
};

/**
 * A value that follows targets set on frames, `[[frame, value], ...]` (the first is where it starts): each change of
 * target is a critically damped settle, added on top of the ones before, so a new target taken mid-move bends the path
 * with no jump in speed. A cursor, a camera that keeps re-aiming, a counter's bar.
 */
export const follow = (frame: number, targets: ReadonlyArray<readonly [number, number]>, halfLife = 8) => {
  if (!targets.length) return 0;
  let v = targets[0][1];
  for (let i = 1; i < targets.length; i++) v += (targets[i][1] - targets[i - 1][1]) * settle(frame, targets[i][0], halfLife);
  return v;
};

/**
 * Keyframes joined into one move: `chain(frame, [[0, 0], [20, 300], [50, 360]])`. Where one move hands to the next the
 * speed carries through (no corner, no stop on a key); the chain starts and ends at rest. Monotone (never overshoots
 * a key). Use instead of `keys` when the keys are one gesture, not separate moves.
 */
export const chain = (frame: number, kf: ReadonlyArray<readonly [number, number]>) => {
  const n = kf.length;
  if (!n) return 0;
  if (frame <= kf[0][0]) return kf[0][1];
  if (frame >= kf[n - 1][0]) return kf[n - 1][1];
  // slopes of each segment, then a tangent at each key (Fritsch-Carlson: monotone, 0 at the ends and at a turn)
  const d = kf.slice(0, -1).map(([f0, v0], i) => (kf[i + 1][1] - v0) / Math.max(1e-6, kf[i + 1][0] - f0));
  const m = kf.map((_, i) => {
    if (i === 0 || i === n - 1) return 0;
    const a = d[i - 1];
    const b = d[i];
    if (a * b <= 0) return 0;
    const ha = kf[i][0] - kf[i - 1][0];
    const hb = kf[i + 1][0] - kf[i][0];
    // weighted harmonic mean: stays inside both slopes, so the curve never overshoots a key
    return (3 * (ha + hb)) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
  });
  let i = 0;
  while (i < n - 2 && frame > kf[i + 1][0]) i++;
  const [f0, v0] = kf[i];
  const [f1, v1] = kf[i + 1];
  const h = Math.max(1e-6, f1 - f0);
  const t = (frame - f0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * m[i + 1];
};

/** Options of `live`: every amplitude may be 0. */
export type LiveOptions = {
  /** Frames a second (default 30). */
  fps?: number;
  /** Drift: px of slow wander on x and y (default 5). */
  drift?: number;
  /** Push: growth of scale a second, in log space (default 0.006 = 0.6 % a second; negative pulls back). */
  push?: number;
  /** Breath: a slow scale swell, as a share (default 0: off; 0.004 is a calm breath). */
  breath?: number;
  /** Degrees of slow roll (default 0.12). */
  roll?: number;
  /** Frame the hold starts (the push counts from here; default 0). */
  start?: number;
  /** Seed: two pieces with different seeds never drift in step. */
  seed?: number;
};

/**
 * The idle for a hold: a slow drift, a push and an optional breath, so no held frame is ever dead still. Smooth at every
 * frame (sums of slow sines, periods of 5-11 s), sub-pixel by design. Put the transform on the held thing or its group:
 * `<div style={{ transform: live(frame).transform }}>`. Typical well-made holds keep moving at 0.3-1 % of the frame a
 * second; the defaults sit there.
 */
export const live = (frame: number, o: LiveOptions = {}) => {
  const { fps = 30, drift = 5, push = 0.006, breath = 0, roll = 0.12, start = 0, seed = 1 } = o;
  const s = frame / fps;
  const ph = rand(seed) * Math.PI * 2;
  const ph2 = rand(seed + 7) * Math.PI * 2;
  const w = (period: number, p: number) => Math.sin((2 * Math.PI * s) / period + p);
  const x = drift * (0.7 * w(9.3, ph) + 0.3 * w(5.1, ph2));
  const y = drift * 0.6 * (0.7 * w(10.7, ph2) + 0.3 * w(6.3, ph));
  const held = Math.max(0, (frame - start) / fps);
  const scale = Math.exp(push * held) * (1 + breath * w(7.7, ph));
  const rotate = roll * w(11.3, ph + 1);
  return { x, y, scale, rotate, transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotate}deg)` };
};

/** Springs, by weight. Pass to `springAt` or Remotion's `spring({config})`. */
export const springs = {
  /** UI: crisp, no visible overshoot. */
  ui: { damping: 26, stiffness: 220, mass: 0.9 } satisfies Partial<SpringConfig>,
  /** Card: a lively landing with a hair of overshoot. */
  card: { damping: 18, stiffness: 160, mass: 1 } satisfies Partial<SpringConfig>,
  /** Pop: a chip, a badge, an icon: visible bounce, settles fast. */
  pop: { damping: 11, stiffness: 240, mass: 0.7 } satisfies Partial<SpringConfig>,
  /** Heavy: a big object or a word block with mass. */
  heavy: { damping: 22, stiffness: 90, mass: 1.4 } satisfies Partial<SpringConfig>,
} as const;

/**
 * Progress of a move from `start` for `dur` frames through `curve`, clamped to 0..1.
 * The one helper every component uses: `const p = at(frame, 12, 18)`.
 */
export const at = (frame: number, start: number, dur: number, curve: Ease = ease.out) => {
  if (dur <= 0) return frame >= start ? 1 : 0;
  const t = Math.min(1, Math.max(0, (frame - start) / dur));
  return curve(t);
};

/** Map progress 0..1 to a value range. `mix(p, 40, 0)` -> 40 at p 0, 0 at p 1. Not clamped (back/spring may overshoot). */
export const mix = (p: number, from: number, to: number) => from + (to - from) * p;

/** Spring progress from `start` (0 before it). Overshoots per the config. */
export const springAt = (frame: number, fps: number, start: number, config: Partial<SpringConfig> = springs.card, durationInFrames?: number) =>
  frame < start ? 0 : spring({ frame: frame - start, fps, config, durationInFrames });

/**
 * Enter-hold-leave envelope in one number: 0 before, rises over `inDur`, 1 while held, falls over `outDur` to 0 at `end`.
 * Rising uses ease.out, falling ease.in. Use for opacity or a scale that comes and goes.
 */
export const envelope = (frame: number, start: number, end: number, inDur = 12, outDur = 10) => {
  const a = at(frame, start, inDur, ease.out);
  const b = 1 - at(frame, end - outDur, outDur, ease.in);
  return Math.min(a, b);
};

/**
 * Stagger delay for item i: compresses toward the end so a list feels like it accelerates into place,
 * never a metronome. base = frames between the first two items. Seeded jitter of up to `jitter` frames.
 */
export const stagger = (i: number, base = 3, jitter = 0, seed = 1) => {
  const d = base * Math.pow(i, 0.82);
  if (!jitter) return d;
  const r = Math.sin((i + 1) * 12.9898 * seed) * 43758.5453;
  return d + (r - Math.floor(r) - 0.5) * 2 * jitter;
};

/**
 * One box becoming another (a plate that becomes a bar that becomes a card): interpolate position, size and radius
 * together so the viewer sees the same object change shape. Boxes are centre x, y, width, height, radius.
 */
export const lerpBox = (p: number, a: { x: number; y: number; w: number; h: number; r?: number }, b: { x: number; y: number; w: number; h: number; r?: number }) => ({
  x: mix(p, a.x, b.x),
  y: mix(p, a.y, b.y),
  w: mix(p, a.w, b.w),
  h: mix(p, a.h, b.h),
  r: mix(p, a.r ?? 0, b.r ?? 0),
});

/** Seconds to frames. */
export const sec = (s: number, fps: number) => Math.round(s * fps);

/** Clamp. */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Interpolate across keyframes [frame, value] with one curve per segment (default ease.inOut). */
export const keys = (frame: number, kf: ReadonlyArray<readonly [number, number]>, curve: Ease = ease.inOut) => {
  if (frame <= kf[0][0]) return kf[0][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const [f0, v0] = kf[i];
    const [f1, v1] = kf[i + 1];
    if (frame <= f1) return mix(curve((frame - f0) / Math.max(1, f1 - f0)), v0, v1);
  }
  return kf[kf.length - 1][1];
};

/** Deterministic pseudo-random 0..1 from a seed (stable across renders). */
export const rand = (seed: number) => {
  const r = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return r - Math.floor(r);
};

/** Speed of a value per frame, for motion blur and smear amounts: |v(f) - v(f-1)|. */
export const speedOf = (fn: (f: number) => number, frame: number) => Math.abs(fn(frame) - fn(frame - 1));

export { interpolate };

/**
 * Accelerating exit that ends at peak speed: each frame's step is `r` times the last (1.35-1.6).
 * 0 at `start`, 1 at `start + dur`. Cut, or hand off to the next shot, on its last frame.
 */
export const accel = (frame: number, start: number, dur: number, r = 1.45) => {
  const t = frame - start;
  if (t <= 0) return 0;
  if (t >= dur) return 1;
  return (Math.pow(r, t) - 1) / (Math.pow(r, dur) - 1);
};

/**
 * Hold creep: a held shot keeps moving a little so it never freezes. Fast first (expo out), 0..1 over `dur`.
 * Multiply by the creep amount you want: scale `1 + 0.008 * creep(f, s, 30)`.
 */
export const creep = (frame: number, start: number, dur: number) => at(frame, start, dur, ease.out);

/**
 * Landing blur for a shot that arrives already moving: px of blur that clears over the first frames.
 * Default 6, 4, 2, 0.
 */
export const landBlur = (frame: number, start: number, px = 6, frames = 4) => {
  const t = frame - start;
  if (t < 0 || t >= frames) return 0;
  return px * (1 - t / frames);
};

/**
 * A stepped clock: the frame held for `n` frames ("on twos" = 2, "on threes" = 3). Feed it to digital things
 * (pixels, mosaics, glyph flicker, stop-motion collage) while the camera stays smooth: two clocks read handmade.
 */
export const onTwos = (frame: number, n = 2) => Math.floor(frame / n) * n;

/**
 * Velocity hand-off for a carried cut. The outgoing move ends at speed `v` (units per frame); the incoming shot starts
 * already moving at `v` and decays it over `dur` frames. Returns the incoming offset to add (0 at rest).
 * Example: a whip that leaves at 90 px/f lands with `mix(...) + carry(f, cutAt, 90, 18)`.
 */
export const carry = (frame: number, start: number, v: number, dur = 18) => {
  const t = Math.max(0, frame - start);
  if (t >= dur) return 0;
  const tau = dur / 4;
  const tail = Math.exp(-dur / tau);
  // offset -v*tau at the cut (moving at ~v), decaying exponentially to exactly 0 at `dur`
  return (-v * tau * (Math.exp(-t / tau) - tail)) / (1 - tail);
};

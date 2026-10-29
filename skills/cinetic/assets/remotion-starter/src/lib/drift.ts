// Shot life: purposeful motion in every shot. A crafted film never lets the picture sit: the camera drifts through every
// shot, its planes part (parallax), what lists scrolls, light breathes over the ground, and what lands settles on a
// tail instead of stopping dead, all under the primary move. One small thing moving in a still frame reads as a still
// shot. scripts/forensics.py motion-energy measures it on the render: the share of the picture's structure moving
// 15 px/s or more (at 1080p, over 0.4 s); under 30 % for more than 1.5 s warns (the house never holds it longer)
// and 2 s fails. A 6 px/s creep keeps a hold from freezing (hold-drift); it does not make a shot move.
//
// Every function here is pure in the frame (any frame, any order, sub-frames for motion blur) and works in film px
// (scaled with the frame: the numbers are at 1080p). fx/Float.tsx puts the float and the planes on a stage.
import { clamp, rand } from './anim';
import { type FilmCtx, fpsOf, sizeOf, uOf } from './film';

export const DRIFT = {
  /**
   * The camera float over the whole film: a sideways drift of +-ampX px (1080p) and a push of 0..push, a quarter turn
   * apart at omega rad/s, so one always carries the motion while the other turns: the picture drifts up to 31 px/s,
   * and where the drift turns the push runs at its 2 %/s. Never a slow vertical translation: Chromium sets text on
   * whole pixel rows, so a slow vertical move climbs in 1 px stairs (references/chromium-rendering.md item 15); the
   * push moves things vertically, smoothly. The push never goes under 1 and every act floats scaled by bleedFor (about
   * 1.025), so no act ever shows its edge. One continuous function of film time: every act sits on the same float, so
   * a match cut or a carried card keeps its place across the seam. A lock eases it to rest for one type read (the
   * camera may hold still 0.5-1 s on a read: lib/look.ts GRAMMAR.hold.readLockS): rampS each way, holdS still.
   */
  float: { ampX: 24, omega: 1.3, push: 0.03, lockHoldS: 0.5, lockRampS: 0.3 },
  /** Plane depths for Depth (1 = the stage's own plane): the ground far behind, a back layer of content, a near plane. */
  depth: { ground: 0.25, back: 0.6, near: 1.35 },
  /** A list or feed under a hold creeps on (px/s at 1080p: slow, house, brisk), easing in from rest over easeS. */
  scroll: { pxS: [12, 24, 40] as const, easeS: 0.6 },
  /** Light breathing over a ground: one slow cycle per periodS (two incommensurate sines, never a visible loop). */
  breathe: { periodS: 6.5, ratio: 1.618 },
  /** A landing's tail: the element keeps drifting on along its arrival at pxS, decaying with tauS (total pxS x tauS). */
  tail: { pxS: 36, tauS: 0.45 },
  /** The forensics.py motion-energy band (ENERGY there): px/s, the low share, the longest low stretch (warn, fail), the film's low share. */
  energy: { px: 15, low: 0.3, warnS: 1.5, failS: 2.0, share: 0.25 },
} as const;

export type FloatLock = { at: number; holdS?: number; rampS?: number }; // at: the frame the camera comes to rest
export type FloatOpts = {
  seed?: number | string; // the ellipse's start phase and turn (the film's seed: every film floats its own way)
  amp?: number; // x the house amplitude (0 switches the float off; 0.6 for a dense 9:16 layout)
  omega?: number; // rad/s
  push?: number; // the breath of push, +- share
  locks?: readonly FloatLock[];
};
export type FloatState = { x: number; y: number; k: number };

/** Seconds a lock takes off the float's clock by time t (s): the integral of its rest bump (0 before, rampS + holdS after). */
const lockOff = (t: number, at: number, hold: number, ramp: number) => {
  const a = at - ramp;
  if (t <= a) return 0;
  if (ramp <= 0) return clamp(t - at, 0, hold);
  if (t <= at) {
    const x = t - a;
    return x / 2 - (ramp / (2 * Math.PI)) * Math.sin((Math.PI * x) / ramp);
  }
  if (t <= at + hold) return ramp / 2 + (t - at);
  if (t <= at + hold + ramp) {
    const x = t - at - hold;
    return ramp / 2 + hold + x / 2 + (ramp / (2 * Math.PI)) * Math.sin((Math.PI * x) / ramp);
  }
  return ramp + hold;
};

/** The float's clock (s) at frame f: film time with each lock's rest taken out (it slows, holds, and goes on). */
const floatClock = (f: number, o: FloatOpts, fps: number) => {
  const t = f / fps;
  let c = t;
  for (const L of o.locks ?? []) c -= lockOff(t, L.at / fps, L.holdS ?? DRIFT.float.lockHoldS, L.rampS ?? DRIFT.float.lockRampS);
  return c;
};

/** The float's phase (rad) at frame f, its clock held back `lag` s: its sideways drift runs at |sin| of it, its push at |cos|. */
const phaseAt = (f: number, o: FloatOpts, fps: number, lag = 0) => {
  const seed = o.seed ?? 7;
  const turn = rand(`${seed}:turn`) < 0.5 ? -1 : 1;
  return rand(`${seed}:float`) * 2 * Math.PI + turn * (o.omega ?? DRIFT.float.omega) * (floatClock(f, o, fps) - lag);
};

/**
 * The camera float at absolute film frame f: an offset { x, y } in film px (y stays 0: the push carries the vertical
 * motion) and a push k about the frame's centre. A shot with nothing else moving still reads as filmed; locks ease it
 * to rest for a read.
 */
export const floatAt = (f: number, o: FloatOpts = {}, film?: Partial<FilmCtx>): FloatState => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = DRIFT.float;
  const amp = o.amp ?? 1;
  if (amp === 0) return { x: 0, y: 0, k: 1 };
  const th = phaseAt(f, o, fps);
  return { x: amp * u * F.ampX * Math.cos(th), y: 0, k: 1 + amp * (o.push ?? F.push) * 0.5 * (1 + Math.sin(th)) };
};

/**
 * A lock on a line's read (a COPY entry: resolved .. out): the camera eases to rest and holds lockHoldS inside the
 * read, then drifts on. One or two per film: the camera may lock on a read; the picture never stops. Without `o` it
 * sits in the middle of the read. Given the film's float `o` (its seed and the locks before this one), it sits where
 * the drift runs fastest inside the read (nearest the middle among the fastest), so the rest is never next to a turn:
 * a turn and a lock side by side hold the picture still for 1.5 s and more (forensics.py motion-energy), a lock on the
 * fastest drift for about 0.8 s, and the float leaves the rest as fast as it came in.
 */
export const lockOn = (c: { resolved: number; out?: number }, film?: Partial<FilmCtx>, o?: FloatOpts): FloatLock => {
  const fps = fpsOf(film);
  const out = c.out ?? c.resolved + 2 * fps;
  const hold = DRIFT.float.lockHoldS * fps;
  const ramp = DRIFT.float.lockRampS * fps;
  const mid = Math.round(c.resolved + Math.max(0, (out - c.resolved - hold) / 2));
  const lo = Math.ceil(c.resolved + ramp);
  const hi = Math.floor(out - hold - ramp);
  if (!o || (o.amp ?? 1) === 0 || hi < lo) return { at: mid };
  let best = mid;
  let score = -Infinity;
  for (let f = lo; f <= hi; f++) {
    // the phase it rests at: the drift up to f, less the half ramp the lock itself takes off the clock
    const th = phaseAt(f, o, fps, DRIFT.float.lockRampS / 2);
    const sc = Math.abs(Math.sin(th)) - (0.05 * Math.abs(f - mid)) / fps;
    if (sc > score) {
      score = sc;
      best = f;
    }
  }
  return { at: best };
};

/** The film's float with a lock on each of these reads, in order (each placed with the locks before it: lockOn). */
export const withLocks = (o: FloatOpts, reads: readonly { resolved: number; out?: number }[], film?: Partial<FilmCtx>): FloatOpts =>
  reads.reduce<FloatOpts>((acc, c) => ({ ...acc, locks: [...(acc.locks ?? []), lockOn(c, film, acc)] }), { ...o, locks: [...(o.locks ?? [])] });

/** Its speed at frame f (px/s at the film's size): for checks and for a seam that wants to know what the camera adds. */
export const floatSpeed = (f: number, o: FloatOpts = {}, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const a = floatAt(f - 0.5, o, film);
  const b = floatAt(f + 0.5, o, film);
  return Math.hypot(b.x - a.x, b.y - a.y) * fps;
};

/**
 * The scale an act floats at so its edges never show (its root's own ground, a picture drawn to the frame, a card
 * cropped by the frame's edge): 1 + twice the drift over the frame width (1.025 at the house float). A plane at depth z
 * moves z times the float (Depth), so it needs bleedFor(o, film, z).
 */
export const bleedFor = (o: FloatOpts = {}, film?: Partial<FilmCtx>, z = 1) => {
  const amp = (o.amp ?? 1) * Math.abs(z);
  const { width } = sizeOf(film);
  return 1 + (2 * amp * uOf(film) * DRIFT.float.ampX) / width;
};

/**
 * A plane at depth z under the float: the transform (inside the stage, which already carries the whole float) that
 * leaves it moving z times the float on screen: z < 1 lags behind (a ground, a back layer), z > 1 leads (a near
 * plane), z = 0 holds still on screen. Returns the extra offset and scale about the frame's centre.
 */
export const planeOf = (s: FloatState, z: number) => {
  const kz = 1 + z * (s.k - 1);
  return { x: ((z - 1) * s.x) / s.k, y: ((z - 1) * s.y) / s.k, k: kz / s.k };
};

/**
 * A list, a feed or a strip creeping on under a hold: its offset (film px) at frame f along `angle` degrees (90 = up
 * the screen, as a feed scrolls), easing in from rest at `from` over easeS (no step in speed), then constant at pxS
 * (1080p); `to` eases it back to rest over the same time. Use it under every held list so the shot never sits.
 */
export const scrollBy = (f: number, from: number, o: { pxS?: number; to?: number; easeS?: number; angle?: number } = {}, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const v = (o.pxS ?? DRIFT.scroll.pxS[1]) * uOf(film);
  const R = Math.max(1e-3, o.easeS ?? DRIFT.scroll.easeS);
  const run = (t: number) => (t <= 0 ? 0 : t < R ? (v * t * t) / (2 * R) : v * (t - R / 2)); // distance after an ease-in from rest
  const t = (f - from) / fps;
  let d = run(t);
  if (o.to !== undefined) {
    const t2 = (f - o.to) / fps + R; // the ease-out mirrors the ease-in, ending at rest on `to`
    d -= run(t2);
  }
  const a = (((o.angle ?? 90) * Math.PI) / 180);
  return { x: d * Math.cos(a), y: -d * Math.sin(a), d };
};

/**
 * Light breathing: a smooth value in [-1, 1] at frame f (two incommensurate sines, so no visible loop), for a wash's
 * strength or angle, a glow's reach, a plate's tilt. Small on purpose: x 0.03-0.08 of a ground's light.
 */
export const breathe = (f: number, o: { periodS?: number; seed?: number | string } = {}, film?: Partial<FilmCtx>) => {
  const t = f / fpsOf(film);
  const P = o.periodS ?? DRIFT.breathe.periodS;
  const p = rand(`${o.seed ?? 3}:breathe`) * 2 * Math.PI;
  return 0.7 * Math.sin((2 * Math.PI * t) / P + p) + 0.3 * Math.sin((2 * Math.PI * t) / (P * DRIFT.breathe.ratio) + 2 * p);
};

/**
 * A landing's tail: after an element lands at frame `at` it drifts on along `angle` degrees (0 right, 90 down) at
 * pxS (1080p), the speed decaying with tauS, so it never stops dead on its contact frame; add it to the landed
 * position. Total travel pxS x tauS (36 x 0.45 = 16 px). Zero before `at`.
 */
export const tail = (f: number, at: number, o: { pxS?: number; tauS?: number; angle?: number } = {}, film?: Partial<FilmCtx>) => {
  const t = (f - at) / fpsOf(film);
  if (t <= 0) return { x: 0, y: 0 };
  const tau = Math.max(1e-3, o.tauS ?? DRIFT.tail.tauS);
  const d = (o.pxS ?? DRIFT.tail.pxS) * uOf(film) * tau * (1 - Math.exp(-t / tau));
  const a = ((o.angle ?? 0) * Math.PI) / 180;
  return { x: d * Math.cos(a), y: d * Math.sin(a) };
};

// The camera at rest. A shot's camera is still unless the shot declares a move: no float, no drift, no idle loop
// keeping the picture "alive". The picture moves when something in it enters, changes state or leaves, or when the
// camera makes a declared move with a purpose: a push, a pull or a track that starts, travels and lands, eased
// (StageMove here for a whole act; lib/camera camPath and lib/camera-moves for a shot's own camera; fx/depth for a
// real 3D camera over UI planes: perspective, depth of field, a macro close-up, a follow of a caret, a travel over a
// page, its shots declared). A camera that pans one way and back with no reason reads as aimless, and a card that
// bobs or a panel that sways while it is held reads as cheap. A hold may be completely still; a creep is at most
// sub-pixel (CREEP.maxPx60: 0.2 px per 60 fps frame at 1080p, 12 px/s). The gates: forensics.py fails a dead stretch
// (nothing at all changes for more than DRIFT.dead.s) and an aimless camera (camera-wander: a slow pan that turns
// back inside a shot, a flat slow drift through a whole shot, declared shots going back and forth); lint-film fails
// an always-on float (camera-float), an idle loop on a position, scale or turn (idle-bob), a card tilted at rest
// (card-tilt) and a depth-stage camera off its declared shots (camera-shot).
//
// Every function here is pure in the frame (any frame, any order, sub-frames for motion blur) and works in film px
// (scaled with the frame: the numbers are at 1080p). fx/Float.tsx puts an act's declared moves on its stage.
import { clamp, E, type Ease, rand } from './anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf } from './film';

export const DRIFT = {
  /**
   * A declared stage move's house numbers: a push in of x1.06 (or a pull back to x0.94) or a track of 120 px at 1080p,
   * over 72 f at 60 fps on E.strongInOut, so it starts from rest, travels and lands at rest. One move per act at most
   * as a rule, and only where it shows something (the push closes on the control that changes, the track follows the
   * thing that travels, the pull reveals the whole); never a move that comes back the way it went.
   */
  move: { push: 1.06, pull: 0.94, pan: 120, frames60: 72 },
  /** The most a hold may creep: px per 60 fps frame at 1080p (0.2 = 12 px/s: under a pixel a frame at any rate). */
  creep: { maxPx60: 0.2 },
  /** The longest stretch where nothing at all may change (s): forensics.py dead-stretch (DEAD_S there). */
  dead: { s: 2.5 },
  /** Plane depths for Depth (1 = the stage's own plane): the ground far behind, a back layer of content, a near plane. */
  depth: { ground: 0.25, back: 0.6, near: 1.35 },
  /** A list or feed the product scrolls (a state change, never idle life): px/s at 1080p (slow, house, brisk), easing in from rest over easeS. */
  scroll: { pxS: [12, 24, 40] as const, easeS: 0.6 },
  /** Light changing over a ground (a wash's strength, never a position): one slow cycle per periodS (two incommensurate sines). */
  breathe: { periodS: 6.5, ratio: 1.618 },
  /** A landing's tail: the element keeps drifting on along its arrival at pxS, decaying with tauS (total pxS x tauS), then rests. */
  tail: { pxS: 36, tauS: 0.45 },
} as const;

/**
 * A declared camera move on an act's stage, in absolute film frames: from `at` over `frames` on `ease` (house
 * E.strongInOut: from rest to rest). `push` is the scale it lands at about the frame's centre (1.06 pushes in 6 %,
 * 0.94 pulls back), `pan` how far the picture travels on screen (px at 1080p; x right, y down: a track). Moves add.
 */
export type StageMove = { at: number; frames: number; push?: number; pan?: { x?: number; y?: number }; ease?: Ease; id?: string };

/**
 * An act's stage options: its declared moves (none: the camera is still). The float's old options (seed, amp, omega,
 * push, locks) are accepted and ignored: there is no float any more.
 */
export type FloatOpts = {
  moves?: readonly StageMove[];
  /** @deprecated ignored: the camera has no float */
  seed?: number | string;
  /** @deprecated ignored: the camera has no float */
  amp?: number;
  /** @deprecated ignored: the camera has no float */
  omega?: number;
  /** @deprecated ignored: the camera has no float */
  push?: number;
  /** @deprecated ignored: the camera has no float */
  locks?: readonly FloatLock[];
};
/** @deprecated a lock eased the old float to rest for a read; the camera is still on every read now. */
export type FloatLock = { at: number; holdS?: number; rampS?: number };
export type FloatState = { x: number; y: number; k: number };

/**
 * A declared stage move from house numbers: `kind` push (in), pull (back) or track (`pan` px at 1080p, default
 * DRIFT.move.pan to the right), from frame `at`, over `frames60` 60 fps frames (house 72) on `ease`.
 */
export const stageMove = (
  at: number,
  kind: 'push' | 'pull' | 'track',
  o: { by?: number; pan?: { x?: number; y?: number }; frames60?: number; ease?: Ease; id?: string } = {},
  film?: Partial<FilmCtx>,
): StageMove => {
  const frames = Math.max(1, f60x(o.frames60 ?? DRIFT.move.frames60, fpsOf(film)));
  const base = { at, frames, ease: o.ease ?? E.strongInOut, id: o.id };
  if (kind === 'track') return { ...base, pan: o.pan ?? { x: DRIFT.move.pan } };
  return { ...base, push: o.by ?? (kind === 'push' ? DRIFT.move.push : DRIFT.move.pull), pan: o.pan };
};

/**
 * The stage camera at absolute film frame f: an offset { x, y } in film px and a scale k about the frame's centre,
 * the sum of the declared moves' shares (each from rest to rest). Without moves the camera is still: { 0, 0, 1 }.
 */
export const stageAt = (f: number, o: FloatOpts = {}, film?: Partial<FilmCtx>): FloatState => {
  const u = uOf(film);
  let x = 0;
  let y = 0;
  let lnk = 0;
  for (const m of o.moves ?? []) {
    const t = (m.ease ?? E.strongInOut)(clamp((f - m.at) / Math.max(1, m.frames)));
    x += (m.pan?.x ?? 0) * u * t;
    y += (m.pan?.y ?? 0) * u * t;
    if (m.push !== undefined) lnk += Math.log(Math.max(1e-6, m.push)) * t;
  }
  return { x, y, k: Math.exp(lnk) };
};

/** @deprecated the old name of stageAt (there is no float: without declared moves the camera is still). */
export const floatAt = stageAt;

/** @deprecated the camera is still on every read; returns the read's middle frame (kept so older films compile). */
export const lockOn = (c: { resolved: number; out?: number }, film?: Partial<FilmCtx>, _o?: FloatOpts): FloatLock => {
  const fps = fpsOf(film);
  const out = c.out ?? c.resolved + 2 * fps;
  return { at: Math.round((c.resolved + out) / 2) };
};

/** @deprecated the camera is still on every read; returns the options unchanged. */
export const withLocks = (o: FloatOpts, _reads: readonly { resolved: number; out?: number }[], _film?: Partial<FilmCtx>): FloatOpts => ({ ...o });

/** The stage camera's speed at frame f (px/s at the film's size): for checks and for a seam that wants to know what the camera adds. */
export const floatSpeed = (f: number, o: FloatOpts = {}, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const a = stageAt(f - 0.5, o, film);
  const b = stageAt(f + 0.5, o, film);
  return Math.hypot(b.x - a.x, b.y - a.y) * fps;
};

/**
 * The scale an act needs so its edges never show under its declared moves (its root's own ground, a picture drawn to
 * the frame): 1 without moves; a track needs 1 + twice its travel over the frame, a pull back 1 / its lowest scale.
 * A plane at depth z moves z times the stage (Depth), so it needs bleedFor(o, film, z).
 */
export const bleedFor = (o: FloatOpts = {}, film?: Partial<FilmCtx>, z = 1) => {
  const { width, height } = sizeOf(film);
  const u = uOf(film);
  let px = 0;
  let py = 0;
  let lnLow = 0;
  for (const m of o.moves ?? []) {
    px += Math.abs(m.pan?.x ?? 0) * u;
    py += Math.abs(m.pan?.y ?? 0) * u;
    if (m.push !== undefined && m.push < 1) lnLow += Math.log(Math.max(1e-6, m.push));
  }
  const a = Math.abs(z);
  const pan = Math.max((2 * a * px) / width, (2 * a * py) / height);
  return Math.max(1, (1 + pan) / Math.exp(a * lnLow));
};

/**
 * A plane at depth z under the stage camera: the transform (inside the stage, which already carries the whole move)
 * that leaves it moving z times the move on screen: z < 1 lags behind (a ground, a back layer), z > 1 leads (a near
 * plane), z = 0 holds still on screen. Returns the extra offset and scale about the frame's centre. Planes only part
 * while a declared move runs: on a still camera every plane is still.
 */
export const planeOf = (s: FloatState, z: number) => {
  const kz = 1 + z * (s.k - 1);
  return { x: ((z - 1) * s.x) / s.k, y: ((z - 1) * s.y) / s.k, k: kz / s.k };
};

/**
 * A list, a feed or a strip the product scrolls (a state change the shot is about, never idle life under a hold): its
 * offset (film px) at frame f along `angle` degrees (90 = up the screen, as a feed scrolls), easing in from rest at
 * `from` over easeS (no step in speed), then constant at pxS (1080p); `to` eases it back to rest over the same time.
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
  const a = ((o.angle ?? 90) * Math.PI) / 180;
  return { x: d * Math.cos(a), y: -d * Math.sin(a), d };
};

/**
 * Light changing slowly: a smooth value in [-1, 1] at frame f (two incommensurate sines, so no visible loop), for a
 * wash's strength or a glow's reach on a ground. Light only: never a position, a scale or a turn of a card, a panel,
 * a UI element or the camera (lint-film idle-bob). Small on purpose: x 0.03-0.08 of a ground's light.
 */
export const breathe = (f: number, o: { periodS?: number; seed?: number | string } = {}, film?: Partial<FilmCtx>) => {
  const t = f / fpsOf(film);
  const P = o.periodS ?? DRIFT.breathe.periodS;
  const p = rand(`${o.seed ?? 3}:breathe`) * 2 * Math.PI;
  return 0.7 * Math.sin((2 * Math.PI * t) / P + p) + 0.3 * Math.sin((2 * Math.PI * t) / (P * DRIFT.breathe.ratio) + 2 * p);
};

/**
 * A landing's tail: after an element lands at frame `at` it drifts on along `angle` degrees (0 right, 90 down) at
 * pxS (1080p), the speed decaying with tauS, so it never stops dead on its contact frame, and then it rests; add it
 * to the landed position. Total travel pxS x tauS (36 x 0.45 = 16 px). Zero before `at`.
 */
export const tail = (f: number, at: number, o: { pxS?: number; tauS?: number; angle?: number } = {}, film?: Partial<FilmCtx>) => {
  const t = (f - at) / fpsOf(film);
  if (t <= 0) return { x: 0, y: 0 };
  const tau = Math.max(1e-3, o.tauS ?? DRIFT.tail.tauS);
  const d = (o.pxS ?? DRIFT.tail.pxS) * uOf(film) * tau * (1 - Math.exp(-t / tau));
  const a = ((o.angle ?? 0) * Math.PI) / 180;
  return { x: d * Math.cos(a), y: d * Math.sin(a) };
};

// The anchor camera: one transform on one world container. A shot says "world point (ax, ay)
// sits at screen point (sx, sy) at scale k", which is how a director thinks about framing, and
// shots chain without drift: lc(lc(A, B, t1), C, t2). Anchors lerp linearly, k in log space.
import type React from 'react';
import { clamp, E, type Ease, lmix, mix } from './anim';
import { f60, type FilmCtx, fpsOf, sizeOf } from './film';

export type Shot = {
  ax: number; // world point that is framed ...
  ay: number;
  sx: number; // ... at this screen point
  sy: number;
  k: number; // scale (world px -> screen px)
  yaw?: number; // deg, rotateY: each act gets its own axis
  pitch?: number; // deg, rotateX (tilt)
  roll?: number; // deg, rotateZ: rigid in screen space, keep <= 11
};

/** Blend two shots. Scale in log space so a zoom has constant perceived speed. */
export const lc = (A: Shot, B: Shot, t: number): Shot => ({
  ax: mix(A.ax, B.ax, t),
  ay: mix(A.ay, B.ay, t),
  sx: mix(A.sx, B.sx, t),
  sy: mix(A.sy, B.sy, t),
  k: lmix(A.k, B.k, t),
  yaw: mix(A.yaw ?? 0, B.yaw ?? 0, t),
  pitch: mix(A.pitch ?? 0, B.pitch ?? 0, t),
  roll: mix(A.roll ?? 0, B.roll ?? 0, t),
});

/**
 * Style for the world container (lay the world out at left:0, top:0 in world px). All translation
 * lives inside this one matrix: fractional left/top next to a transform snaps to whole pixels and
 * slow drifts stair-step. Roll sits outside the tilt so type is never sheared into faux italics.
 */
export const camera = (s: Shot, perspective = 2400): React.CSSProperties => {
  const rot =
    s.yaw || s.pitch || s.roll
      ? ` perspective(${perspective}px) rotateZ(${s.roll ?? 0}deg) rotateX(${s.pitch ?? 0}deg) rotateY(${s.yaw ?? 0}deg)`
      : '';
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: '0 0',
    transform: `translate(${s.sx}px, ${s.sy}px)${rot} scale(${Math.max(1e-4, s.k)}) translate(${-s.ax}px, ${-s.ay}px)`,
  };
};

/**
 * Screen position of a world point under a flat shot (no yaw/pitch/roll): where to draw an overlay
 * that tracks the product (a cursor, the story device, a caption pinned to a row), every frame.
 */
export const toScreen = (s: Shot, p: { x: number; y: number }) => ({
  x: s.sx + (p.x - s.ax) * s.k,
  y: s.sy + (p.y - s.ay) * s.k,
});

/**
 * Push-in "breath" inside a hold: multiply k by it (amount 0.025 = +2.5%). Released by the next move.
 * Deprecated: lib/handoff.ts creep(f, from, { pctPerSec }) is the same linear push in film time, at any fps.
 */
export const breath = (t: number, amount = 0.025) => 1 + amount * t;

/** Zoom-out hop during a whip (t = the whip's 0..1 progress): multiply k by it. */
export const dip = (t: number, depth = 0.18) => 1 - depth * Math.sin(Math.PI * t) ** 2;

/** Log-scale speed of a zoom (ln k per frame) from frame f - 1 to f. At a cut: zoomSpeed(kOut, cut - 1). */
export const zoomSpeed = (k: (f: number) => number, f: number) => Math.log(Math.max(1e-6, k(f)) / Math.max(1e-6, k(f - 1)));

/**
 * Velocity handoff for any carried quantity (x, y, log scale, roll): the incoming shot starts offset
 * by `from` and moving at `v0` (units per film frame, the outgoing move's speed on the cut frame),
 * and the offset decays exponentially (time constant settle / 5) to exactly 0, with zero speed, at
 * `settle` film frames. Add `d` to the incoming shot's value at t = frames since the cut (0 on its
 * first frame). A cut at peak speed then reads as one move; an incoming shot that starts at rest
 * reads as a stall. Defaults at the film's fps: settle 30 f at 60 fps. lib/handoff.ts handoffShot()
 * applies it to a whole Shot.
 */
export const handoff = (t: number, v0: number, settle?: number, fps: number = fpsOf()) => {
  const T = Math.max(1, settle ?? f60(30, fps));
  const a = 5; // window length in time constants
  const tau = T / a;
  const ea = Math.exp(-a);
  const s = clamp(t / T);
  // exponential decay minus its tangent at T, so position and velocity both reach 0 at t = T
  const d = (-v0 * tau * (Math.exp(-a * s) - ea * (1 + a - a * s))) / (1 - ea);
  const v = (v0 * (Math.exp(-a * s) - ea)) / (1 - ea);
  const from = (-v0 * tau * (1 - ea * (1 + a))) / (1 - ea);
  return { d, v: t >= T ? 0 : v, from };
};

/**
 * Velocity handoff for a zoom-through cut: handoff() on log scale. The incoming shot keeps zooming at
 * the outgoing move's log-scale speed `v0` (zoomSpeed at the cut), then comes to rest at `settle`.
 * Multiply the incoming shot's k by `.k` at t = frames since the cut (0 on its first frame); `.from`
 * is where it starts (= exp(-0.193·v0·settle)), so lengthen `settle` for a bigger entry, shorten it
 * for less. Defaults at 60 fps: settle 30 f. An exit of 1 -> 1.2 on E.in over 12 f, cut on its 12th
 * frame (v0 = 0.047), starts the entry at 0.76x: the 0.75 -> 1 entry of references/transitions.md
 * §4.8, with no speed step at the cut.
 */
export const zoomHandoff = (t: number, v0: number, settle?: number, fps: number = fpsOf()) => {
  const h = handoff(t, v0, settle, fps);
  return { k: Math.exp(h.d), v: h.v, from: Math.exp(h.from) };
};

/**
 * One move of a camera path (camPath): from frame `at`, over `frames`, on `ease`, the shot travels by these
 * amounts. zoom is a scale ratio (0.48 = pull out to 48 %, 1.57 = push in), applied in log space; pan moves the
 * framed screen point (sx, sy) in px, look moves the framed world point (ax, ay) in world px; roll, yaw and pitch
 * add degrees. A cut-at-peak whip is a move on E.launchIn whose last frame is the cut.
 */
export type CamMove = {
  at: number;
  frames: number;
  ease?: Ease; // house E.strongInOut (a reframe); E.launchIn into a cut; E.glideOut out of one
  zoom?: number;
  pan?: { x?: number; y?: number };
  look?: { x?: number; y?: number };
  roll?: number;
  yaw?: number;
  pitch?: number;
};

/**
 * The camera as the animator: one layout under one shot per frame, the shot = `base` plus every move's share of
 * its amounts at frame f. Moves add, so a move that starts before the previous one ends takes over without a hold
 * (their speeds add through the overlap): chain a slide-in's settle into a pull-back, a rise's drift into a
 * zoom-out, a push into a whip-out, the next move starting on the frame the last one slows. Pure, any frame order.
 */
export const camPath = (f: number, base: Shot, moves: readonly CamMove[]): Shot => {
  let lnk = Math.log(Math.max(1e-6, base.k));
  const s: Shot = { ...base, yaw: base.yaw ?? 0, pitch: base.pitch ?? 0, roll: base.roll ?? 0 };
  for (const m of moves) {
    const t = (m.ease ?? E.strongInOut)(clamp((f - m.at) / Math.max(1, m.frames)));
    if (m.zoom !== undefined) lnk += Math.log(Math.max(1e-6, m.zoom)) * t;
    s.sx += (m.pan?.x ?? 0) * t;
    s.sy += (m.pan?.y ?? 0) * t;
    s.ax += (m.look?.x ?? 0) * t;
    s.ay += (m.look?.y ?? 0) * t;
    s.roll = (s.roll ?? 0) + (m.roll ?? 0) * t;
    s.yaw = (s.yaw ?? 0) + (m.yaw ?? 0) * t;
    s.pitch = (s.pitch ?? 0) + (m.pitch ?? 0) * t;
  }
  s.k = Math.exp(lnk);
  return s;
};

/**
 * How fast the picture moves under a camera path at frame f (from f - 1 to f): the screen velocity (px per film
 * frame) of the world point framed at `at` (default the centre of `film`'s frame, 960, 540 without it), its speed
 * and direction (deg, 0 = +x, 90 = down: DirBlur's `angle`), and the zoom speed (ln k per frame). Feed the speed to
 * DirBlur for a camera smear on translation; pushes stay crisp.
 */
export const camVel = (f: number, base: Shot, moves: readonly CamMove[], atIn?: { x: number; y: number }, film?: Partial<FilmCtx>) => {
  const size = sizeOf(film);
  const at = atIn ?? { x: size.width / 2, y: size.height / 2 };
  const now = camPath(f, base, moves);
  const was = camPath(f - 1, base, moves);
  const p = { x: now.ax + (at.x - now.sx) / now.k, y: now.ay + (at.y - now.sy) / now.k }; // the world point under `at` now
  const q = toScreen(was, p);
  const vx = at.x - q.x;
  const vy = at.y - q.y;
  return { vx, vy, speed: Math.hypot(vx, vy), angle: (Math.atan2(vy, vx) * 180) / Math.PI, vk: Math.log(now.k / was.k) };
};

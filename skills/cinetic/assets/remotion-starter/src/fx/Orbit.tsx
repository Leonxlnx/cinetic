import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Orbit: things that turn round a centre, in closed form.
 *
 *   rotationDecay  a ring or a field arrives already turning and its spin bleeds off by a constant ratio to a slow
 *                  cruise that never stops (house 8 deg/f at 60 fps, x0.94 a frame, cruise 0.5 deg/f)
 *   spinUp         the spin grows by a constant ratio a frame (0.35 -> 7.25 deg/f at 60 fps over 30 f) into a cut on
 *                  its fastest frame, then decays (rotationDecay from that speed) after it
 *   ringPoint      a point on a tilted ring: screen x and y, depth, a scale by depth and a z-order, so front tiles
 *                  pass in front of the hero and back tiles behind
 *   burstOut       satellites fly out radially on an accelerating curve, growing to 1.45x, optionally along a
 *                  spiral, and leave the frame (26 f)
 *   <OrbitRing>    n items on a tilted ring round a hero, turning at constant speed or by rotationDecay
 *
 * Angles are degrees; speeds are per 60 fps frame and converted to the film's rate.
 */

/** House numbers: degrees per 60 fps frame, ratios per 60 fps frame. */
export const ORBIT = { w0: 8, ratio: 0.94, cruise: 0.5, spinUp: { from: 0.35, to: 7.25, frames60: 30 }, burst: { frames60: 26, grow: 1.45 }, tilt: 18, depth: [0.72, 1.08] as [number, number] } as const;

export type DecayOpts = { start: number; w0?: number; ratio?: number; cruise?: number };

/**
 * The angle (degrees) at frame f of a spin that runs at w0 before `start` and decays by `ratio` a frame after it
 * toward `cruise`: angle(n) = w (1 - r^n) / (1 - r) + c n, n = f - start (closed form, any frame).
 */
export const rotationDecay = (frame: number, o: DecayOpts, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  const k = 60 / fps;
  const c = (o.cruise ?? ORBIT.cruise) * k;
  const w = (o.w0 ?? ORBIT.w0) * k - c; // the decaying part of the speed
  const r = clamp(o.ratio ?? ORBIT.ratio, 1e-6, 0.999999) ** k;
  const n = frame - o.start;
  if (n <= 0) return (w + c) * n;
  return (w * (1 - r ** n)) / (1 - r) + c * n;
};

/** The spin speed (degrees per film frame) of rotationDecay at frame f. */
export const rotationSpeed = (frame: number, o: DecayOpts, film?: Partial<FilmCtx>): number => rotationDecay(frame + 0.5, o, film) - rotationDecay(frame - 0.5, o, film);

export type SpinUpOpts = { start: number; cut: number; from?: number; to?: number; after?: { ratio?: number; cruise?: number } };

/** A spin that grows by a constant ratio a frame from `from` to `to` (deg per 60 fps frame) at `cut`, then decays. Pure. */
export const spinUp = (frame: number, o: SpinUpOpts, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  const k = 60 / fps;
  const w0 = (o.from ?? ORBIT.spinUp.from) * k;
  const w1 = (o.to ?? ORBIT.spinUp.to) * k;
  const N = Math.max(1, o.cut - o.start);
  const r = (w1 / w0) ** (1 / N);
  const up = (n: number) => (n <= 0 ? w0 * n : (w0 * (r ** n - 1)) / Math.log(r)); // the integral of w0 r^n
  if (frame <= o.cut) return up(frame - o.start);
  return up(N) + rotationDecay(frame, { start: o.cut, w0: o.to ?? ORBIT.spinUp.to, ratio: o.after?.ratio ?? ORBIT.ratio, cruise: o.after?.cruise ?? ORBIT.cruise }, film);
};

/** A point on a ring of radius r tilted `tilt` degrees toward the viewer (0 = edge-on, 90 = from above), at angle a. */
export const ringPoint = (a: number, r: number, o: { tilt?: number; depth?: [number, number] } = {}) => {
  const rad = (a * Math.PI) / 180;
  const z = Math.sin(rad); // +1 nearest
  const tilt = ((o.tilt ?? ORBIT.tilt) * Math.PI) / 180;
  const [far, near] = o.depth ?? ORBIT.depth;
  return { x: r * Math.cos(rad), y: r * z * Math.sin(tilt), z, scale: mix(far, near, (z + 1) / 2), front: z >= 0 };
};

export type BurstOpts = { at: number; n: number; from: number; to: number; frames?: number; ease?: Ease; grow?: number; spiral?: number; phase?: number };

/** Each satellite's position (px from the centre) and scale at frame f: radial, accelerating, growing. Pure. */
export const burstOut = (frame: number, o: BurstOpts, film?: Partial<FilmCtx>) => {
  const fr = Math.max(1, f60x(o.frames ?? ORBIT.burst.frames60, fpsOf(film)));
  const k = (o.ease ?? E.buildIn)(clamp((frame - o.at) / fr));
  return Array.from({ length: o.n }, (_, i) => {
    const a = (((o.phase ?? 0) + (360 * i) / o.n + (o.spiral ?? 0) * k * i) * Math.PI) / 180;
    const r = mix(o.from, o.to, k);
    return { i, x: r * Math.cos(a), y: r * Math.sin(a), scale: mix(1, o.grow ?? ORBIT.burst.grow, k), k };
  });
};

/**
 * Draws n items on a tilted ring round (x, y): back items, then `hero`, then front items. The ring turns at
 * `speed` deg per 60 fps frame from `start`, or by `decay` (rotationDecay), or a custom `angle(f)`.
 */
export const OrbitRing: React.FC<{
  frame: number;
  x: number;
  y: number;
  n: number;
  r: number;
  start?: number;
  speed?: number;
  decay?: DecayOpts;
  angle?: (f: number) => number;
  tilt?: number;
  depth?: [number, number];
  render: (i: number, depth: number) => React.ReactNode;
  hero?: React.ReactNode;
}> = (props) => {
  const film = useFilm();
  const a0 = props.angle ? props.angle(props.frame) : props.decay ? rotationDecay(props.frame, props.decay, film) : ((props.speed ?? 0.6) * 60 * (props.frame - (props.start ?? 0))) / film.fps;
  const pts = Array.from({ length: props.n }, (_, i) => ({ i, ...ringPoint(a0 + (360 * i) / props.n, props.r, { tilt: props.tilt, depth: props.depth }) })).sort((p, q) => p.z - q.z);
  const item = (p: (typeof pts)[number]) => (
    <div key={p.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(props.x + p.x).toFixed(2)}px, ${(props.y + p.y).toFixed(2)}px) scale(${p.scale.toFixed(4)})` }}>
      <div style={{ transform: 'translate(-50%, -50%)' }}>{props.render(p.i, p.z)}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {pts.filter((p) => !p.front).map(item)}
      {props.hero}
      {pts.filter((p) => p.front).map(item)}
    </div>
  );
};

/** Sync: the frame a decaying spin is within `share` of its cruise (a soft landing cue). */
export const decaySettled = (o: DecayOpts, film?: Partial<FilmCtx>, share = 0.1): number => {
  const fps = fpsOf(film);
  const k = 60 / fps;
  const c = (o.cruise ?? ORBIT.cruise) * k;
  const w = (o.w0 ?? ORBIT.w0) * k - c;
  const r = clamp(o.ratio ?? ORBIT.ratio, 1e-6, 0.999999) ** k;
  return Math.ceil(o.start + (w > 0 ? Math.log(share) / Math.log(r) : 0));
};

/** Pixels at 1080p for a film. */
export const orbitPx = (px: number, film?: Partial<FilmCtx>): number => px * uOf(film);

/**
 * Orbits are continuous: nothing steps or flashes. A spin-up runs into a cut on its fastest frame: with `seam` the
 * cut is declared here as a velocity seam carrying the rotation (on the frame after `cut`, as Rush does); without
 * it the act declares that seam with its timeline.
 */
export const declares = (p?: { spinUp?: SpinUpOpts; seam?: boolean; id?: string }, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p?.spinUp || !p.seam) return none;
  fpsOf(film);
  const dir = (p.spinUp.to ?? ORBIT.spinUp.to) >= 0 ? 1 : -1;
  return { ...none, seams: [{ at: p.spinUp.cut + 1, kind: 'velocity', carry: 'rot', dir, id: p.id ?? 'spin-up' }] };
};

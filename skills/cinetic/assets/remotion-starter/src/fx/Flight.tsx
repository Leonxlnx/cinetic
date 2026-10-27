import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Flight: objects that move like objects.
 *
 *   arcFlight       a thrown arc in closed form: x and y each on their own curve (x front-loaded, y lifted by an
 *                   apex and falling), so a glyph that lifts off the wordmark flies to its place in the UI on a
 *                   parabola-like path, and back
 *   launchHangFall  a blob pops off a bar, rises fast (29 f, ease-out), hangs at the top (8 f) and falls back
 *                   (21 f, ease-in): the one object in a film that jumps
 *   gravityDrop     chips fall like objects (accelerating, 24 f), straighten as they land, then drift back up
 *   stretchOf       squash and stretch from speed, volume kept: up to 1.38 : 1 along the travel on the fastest
 *                   frames only; a landing squash on contact (lib/anim squash)
 *
 * All closed form (any frame, any order). <Flight> draws its children at the path, stretched along the
 * velocity and, if asked, turned with it.
 */

type XY = { x: number; y: number };

/** House numbers: frames at 60 fps, px at 1080p. */
export const FLIGHT = { frames60: 34, apex: 0.35, up60: 29, hang60: 8, down60: 21, drop60: 24, stretch: { max: 1.38, at60: 32 }, drift60: 5 / 2 } as const;

export type ArcOpts = {
  at: number;
  from: XY;
  to: XY;
  frames?: number; // 60 fps frames (house 34)
  apex?: number; // lift at the middle of the path, share of the distance (house 0.35; negative arcs downward)
  xEase?: Ease; // house E.glideOut (front-loaded travel)
  liftEase?: Ease; // progress that drives the lift (house E.stdInOut: the hang sits in the middle)
};

/** Position on the arc at frame f (fractional frames welcome). */
export const arcPoint = (frame: number, o: ArcOpts, film?: Partial<FilmCtx>): XY & { t: number } => {
  const fr = Math.max(1, f60x(o.frames ?? FLIGHT.frames60, fpsOf(film)));
  const t = clamp((frame - o.at) / fr);
  const k = (o.xEase ?? E.glideOut)(t);
  const L = Math.hypot(o.to.x - o.from.x, o.to.y - o.from.y);
  const q = (o.liftEase ?? E.stdInOut)(t);
  const lift = (o.apex ?? FLIGHT.apex) * L * 4 * q * (1 - q);
  return { x: mix(o.from.x, o.to.x, k), y: mix(o.from.y, o.to.y, k) - lift, t };
};

/** The arc's point, its velocity (px per film frame) and heading (degrees) at frame f. Pure. */
export const arcFlight = (frame: number, o: ArcOpts, film?: Partial<FilmCtx>) => {
  const a = arcPoint(frame - 0.5, o, film);
  const b = arcPoint(frame + 0.5, o, film);
  const p = arcPoint(frame, o, film);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  return { x: p.x, y: p.y, t: p.t, vx, vy, speed: Math.hypot(vx, vy), heading: (Math.atan2(vy, vx) * 180) / Math.PI };
};

export type HopOpts = { at: number; height: number; up?: number; hang?: number; down?: number; upEase?: Ease; downEase?: Ease };

/** A launch, hang and fall: the lift (px, positive = up), its speed and phase at frame f. Pure. */
export const launchHangFall = (frame: number, o: HopOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const up = Math.max(1, f60x(o.up ?? FLIGHT.up60, fps));
  const hang = f60x(o.hang ?? FLIGHT.hang60, fps);
  const down = Math.max(1, f60x(o.down ?? FLIGHT.down60, fps));
  const lift = (f: number) => {
    const t = f - o.at;
    if (t <= 0) return 0;
    if (t < up) return o.height * (o.upEase ?? E.glideOut)(t / up);
    if (t < up + hang) return o.height;
    return o.height * (1 - (o.downEase ?? E.buildIn)(clamp((t - up - hang) / down)));
  };
  const t = frame - o.at;
  const phase = t < 0 ? 'before' : t < up ? 'up' : t < up + hang ? 'hang' : t < up + hang + down ? 'down' : 'landed';
  return { lift: lift(frame), v: lift(frame + 0.5) - lift(frame - 0.5), phase, landed: Math.ceil(o.at + up + hang + down) };
};

export type DropOpts = { at: number; fall: number; frames?: number; rot?: number; drift?: { at: number; speed?: number } };

/** A chip dropping like an object: fall (px down), rotation easing to flat on landing, a slow drift back up. Pure. */
export const gravityDrop = (frame: number, o: DropOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const fr = Math.max(1, f60x(o.frames ?? FLIGHT.drop60, fps));
  const t = clamp((frame - o.at) / fr);
  const y = o.fall * E.buildIn(t);
  const rot = (o.rot ?? 0) * (1 - E.snapOut(clamp((t - 0.7) / 0.3)));
  const drift = o.drift && frame > o.drift.at ? (((o.drift.speed ?? FLIGHT.drift60) * uOf(film) * 60) / fps) * (frame - o.drift.at) : 0;
  return { y: y - drift, rot, landed: t >= 1 };
};

/** Stretch along the travel from speed (px per film frame): along x across = 1, along / across up to `max`. */
export const stretchOf = (speed: number, film?: Partial<FilmCtx>, o: { max?: number; at?: number } = {}) => {
  const vRef = ((o.at ?? FLIGHT.stretch.at60) * uOf(film) * 60) / fpsOf(film);
  const r = 1 + ((o.max ?? FLIGHT.stretch.max) - 1) * clamp(speed / Math.max(1e-6, vRef));
  return { along: Math.sqrt(r), across: 1 / Math.sqrt(r) };
};

/** Sync: lift-off (a pop or a whoosh), the apex or hang, the landing (a soft knock). */
export const flightFrames = (o: ArcOpts, film?: Partial<FilmCtx>) => {
  const fr = f60x(o.frames ?? FLIGHT.frames60, fpsOf(film));
  return { lift: o.at, apex: Math.round(o.at + fr / 2), land: Math.ceil(o.at + fr) };
};

/**
 * Draws `children` centred on the arc at frame f, stretched along its velocity (`stretch`, house on) and
 * optionally turned to its heading (`orient`). `scale` interpolates the object's size from start to end
 * (a glyph growing into an icon).
 */
export const Flight: React.FC<ArcOpts & { frame: number; stretch?: boolean; orient?: boolean; scale?: [number, number]; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = arcFlight(props.frame, props, film);
  const st = props.stretch === false ? { along: 1, across: 1 } : stretchOf(s.speed, film);
  const k = props.scale ? mix(props.scale[0], props.scale[1], (props.xEase ?? E.glideOut)(s.t)) : 1;
  const h = s.speed > 0.01 ? s.heading : 0;
  const turn = props.orient ? `rotate(${h.toFixed(2)}deg) scale(${st.along.toFixed(4)}, ${st.across.toFixed(4)})` : `rotate(${h.toFixed(2)}deg) scale(${st.along.toFixed(4)}, ${st.across.toFixed(4)}) rotate(${(-h).toFixed(2)}deg)`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `${turn} scale(${k.toFixed(4)}) translate(-50%, -50%)`, transformOrigin: '0 0' }}>{props.children}</div>
    </div>
  );
};

/** A J-curve launch: the button leaves on x cubic-out and y cubic-in over 36 f at 60 fps, growing x1.74 as it goes. */
export const J_LAUNCH = { frames60: 36, grow: 1.74 } as const;

/**
 * An object launched off the frame on a J (a send button that takes off): it moves out along x on a cubic-out while it
 * sinks into y on a cubic-in, so it starts sideways and ends rising fast; it grows linearly (house x1.74). `x`, `y` are
 * the offsets at the end (px at 1080p, x u). Returns its offset, scale and whether it is gone. Pure.
 */
export const jLaunch = (frame: number, o: { at: number; x: number; y: number; frames?: number; grow?: number }, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const t = clamp((frame - o.at) / Math.max(1, f60x(o.frames ?? J_LAUNCH.frames60, fps)));
  return { dx: o.x * u * (1 - (1 - t) ** 3), dy: o.y * u * t ** 3, scale: mix(1, o.grow ?? J_LAUNCH.grow, t), t, gone: t >= 1 };
};

/** Flights are continuous: nothing to declare. */
export const declares = (_p?: Partial<ArcOpts>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

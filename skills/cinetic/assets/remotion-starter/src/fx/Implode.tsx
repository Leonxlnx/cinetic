import React from 'react';
import { clamp, E, type Ease, fd, M, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Implode: an object collapses into a point and hands over to what comes next.
 *
 *   'spiral'  a ring spirals inward (radius 369 -> 291 -> 223 -> 64 -> a point on twos, accelerating: 20 f at
 *             60 fps); the point holds a beat, then the next thing is born from it
 *   'vortex'  a short swirl of two or three arcs turning and tightening (12 f): the soft ring that births a title
 *             after a button shrinks under the cursor
 *   'hole'    a disc dissolves from the inside out: a hole of the ground's colour grows in its centre while the
 *             disc dims (18 f)
 *
 * Flat strokes and fills (no glow). Pure state: implodeState(f).
 */

/** House numbers: frames at 60 fps, px at 1080p. */
export const IMPLODE = { spiral60: 20, vortex60: 12, hole60: 18, steps60: 5, turns: 1.5, point: 7, hold60: 6, arcs: 3, holeFrom: 0.16 } as const;

export type ImplodeProps = {
  at: number;
  kind?: 'spiral' | 'vortex' | 'hole';
  r: number; // the object's radius at the start, px
  frames?: number; // 60 fps frames (spiral 20, vortex 12, hole 18)
  ease?: Ease; // house M.squeeze (gathers, then collapses: radius 1, .79, .60, .17, 0 on its poses)
  steps?: number; // spiral: frames per pose at 60 fps (house 5: on twos at 24), 1 = continuous
  turns?: number; // spiral and vortex: total rotation in turns (house 1.5)
  hold?: number; // the point holds this many 60 fps frames after the collapse (house 6)
  id?: string;
};

export type ImplodeState = { phase: 'before' | 'collapse' | 'point' | 'done'; r: number; angle: number; k: number; hole: number; opacity: number };

/** Radius, rotation (degrees), progress, the hole's radius and the opacity at frame f. Pure. */
export const implodeState = (frame: number, p: ImplodeProps, film?: Partial<FilmCtx>): ImplodeState => {
  const fps = fpsOf(film);
  const kind = p.kind ?? 'spiral';
  const fr = Math.max(1, f60x(p.frames ?? (kind === 'spiral' ? IMPLODE.spiral60 : kind === 'vortex' ? IMPLODE.vortex60 : IMPLODE.hole60), fps));
  const hold = f60x(p.hold ?? IMPLODE.hold60, fps);
  const per = kind === 'spiral' ? Math.max(1, f60x(p.steps ?? IMPLODE.steps60, fps)) : 0;
  const g = per > 1 ? p.at + Math.floor((fd(frame) - p.at) / per) * per : frame; // stepped poses
  const t = clamp((g - p.at) / fr + 1e-9);
  if (frame < p.at) return { phase: 'before', r: p.r, angle: 0, k: 0, hole: 0, opacity: 1 };
  const k = (p.ease ?? (kind === 'spiral' ? M.squeeze : E.buildIn))(t);
  const turns = p.turns ?? IMPLODE.turns;
  if (kind === 'hole') {
    const hole = mix(p.r * IMPLODE.holeFrom, p.r, E.snapOut(t));
    return { phase: t >= 1 ? 'done' : 'collapse', r: p.r, angle: 0, k: t, hole, opacity: 1 - E.softIn(clamp((t - 0.15) / 0.85)) };
  }
  if (t >= 1) {
    const done = frame >= p.at + fr + hold;
    return { phase: done ? 'done' : 'point', r: 0, angle: 360 * turns, k: 1, hole: 0, opacity: done ? 0 : 1 };
  }
  return { phase: 'collapse', r: p.r * (1 - k), angle: 360 * turns * k, k, hole: 0, opacity: kind === 'vortex' ? 1 - 0.4 * k : 1 };
};

/** Sync: the collapse (a suck), the point (the hit on which the next thing is born), the end of the hold. */
export const implodeFrames = (p: ImplodeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const kind = p.kind ?? 'spiral';
  const fr = f60x(p.frames ?? (kind === 'spiral' ? IMPLODE.spiral60 : kind === 'vortex' ? IMPLODE.vortex60 : IMPLODE.hole60), fps);
  return { start: p.at, point: Math.ceil(p.at + fr), done: Math.ceil(p.at + fr + f60x(p.hold ?? IMPLODE.hold60, fps)) };
};

/** An open spiral of `turns` from radius r0 to r1, starting at angle a0 (degrees), as an SVG path. */
const spiralPath = (r0: number, r1: number, a0: number, turns: number, n = 48) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = ((a0 + 360 * turns * u) * Math.PI) / 180;
    const r = mix(r0, r1, u);
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  }
  return d;
};

/** Draws the implosion centred on (x, y) in `color`; 'hole' needs `ground` (the hole's colour). */
export const Implode: React.FC<ImplodeProps & { frame: number; x: number; y: number; color: string; ground?: string; width?: number }> = (props) => {
  const film = useFilm();
  const s = implodeState(props.frame, props, film);
  if (s.phase === 'done' && (props.kind ?? 'spiral') !== 'hole') return null;
  if (s.phase === 'done') return null;
  const u = uOf(film);
  const sw = (props.width ?? 6) * u;
  const R = props.r + sw * 2;
  const kind = props.kind ?? 'spiral';
  let body: React.ReactNode = null;
  if (kind === 'hole') {
    body = (
      <>
        <circle cx={0} cy={0} r={props.r} fill={props.color} opacity={s.opacity} />
        <circle cx={0} cy={0} r={s.hole} fill={props.ground ?? 'transparent'} />
      </>
    );
  } else if (s.phase === 'point') {
    body = <circle cx={0} cy={0} r={IMPLODE.point * u} fill={props.color} />;
  } else if (kind === 'spiral') {
    // the ring opens into a spiral as it tightens: a full ring at k = 0, a 1.5-turn coil toward the centre later
    const open = clamp(s.k * 1.6);
    const r = Math.max(IMPLODE.point * u, s.r);
    body = s.k <= 0.001 ? <circle cx={0} cy={0} r={r} fill="none" stroke={props.color} strokeWidth={sw} /> : <path d={spiralPath(r, r * (1 - 0.55 * open), s.angle, mix(1, 1.25, open))} fill="none" stroke={props.color} strokeWidth={sw} strokeLinecap="round" />;
  } else {
    const n = IMPLODE.arcs;
    body = Array.from({ length: n }, (_, i) => {
      const r = Math.max(IMPLODE.point * u, s.r * (1 - 0.18 * i));
      return <path key={i} d={spiralPath(r, r * 0.86, s.angle + (360 / n) * i, 0.22)} fill="none" stroke={props.color} strokeWidth={sw * (1 - 0.2 * i)} strokeLinecap="round" opacity={s.opacity} />;
    });
  }
  return (
    <svg width={2 * R} height={2 * R} viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${props.x - R}px, ${props.y - R}px)` }} aria-hidden>
      {body}
    </svg>
  );
};

/** A spiral on twos is a stepped run; the vortex and the hole are continuous. */
export const declares = (p?: Partial<ImplodeProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || (p.kind ?? 'spiral') !== 'spiral' || (p.steps ?? IMPLODE.steps60) <= 1) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = implodeFrames(p as ImplodeProps, film);
  return { stepped: [{ from: p.at, to: fr.point + 1, id: p.id ?? 'implode' }], flashes: [], cameraBlur: [], seams: [] };
};

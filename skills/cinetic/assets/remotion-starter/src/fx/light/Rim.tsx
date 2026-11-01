/**
 * cinetic:light the world's key caught on an edge (a rim with its glint), and a light travelling along that edge (a sweep)
 *
 * RimLight: the lit border of a rounded rect or a circle. Brightest on the side that faces the world's key, falling to
 * a faint line on the far side, with a glint: the edge's hottest point, where it faces the key, as a short white-hot
 * stretch of the rim and (on a dark world) a soft bloom of that light just outside the edge. A uniform outline reads as
 * a wireframe; a rim with a side and a glint reads as glass catching a light. Inside a <World> it finds the key itself
 * from its box; elsewhere give `angle` (screen degrees toward the light).
 *
 *   <RimLight x={560} y={480} w={800} h={120} />          (r defaults to a pill under 140 px tall, else 28 px)
 *
 * LightSweep: a light running along the same edge: a white-hot head with a soft round glow and a flare along the edge,
 * and a tail that fades. It starts at `at`, crosses the edge on E.stdInOut in `dur60` frames (54 at 60 fps) and is gone:
 * the light passes once, the way a reflection crosses glass when it or the light moves. Never a loop, never a marching
 * border. Give it when something happens (the pane lands, the input sends).
 *
 *   <LightSweep x={560} y={480} w={800} h={120} at={42} />   (from 0.82 of the perimeter, travel 0.36: across the top)
 *
 * The perimeter is measured from the middle of the top edge, clockwise (0.25 is about the right side on a square).
 * Both are drawn in frame px at (x, y); inside a box that is already placed (fx/light Glass), give x = y = 0.
 * Cost: a rim is one masked element with two gradients (and one gradient for the bloom); a sweep is one small SVG of
 * strokes and two gradient sprites, only while it runs. No filters.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { MASK } from '../../brand/tokens';
import { sizeOf, uOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import { useWorld } from '../world/context';
import { activeSweep, edgeToward, keyAngle, perimeterPoint, radiusOf, rgbaOf, roundRectPath, SWEEP, type SweepOpts } from './light';

/** House numbers: px at 1080p, alphas, shares of the box. */
export const RIM_LIGHT = {
  width: 1.5,
  peak: 0.8,
  base: 0.14,
  glint: { reach: 0.24, min: 70, max: 300, core: 0.32, bloom: 0.22, bloomH: 22 }, // reach: share of the edge's length
  sweepWidth: 1.6,
  head: { r: 30, flare: 3.2, flareA: 0.45 },
  tail: [6, 3] as const, // the soft strokes under the streak (x its width) ...
  tailA: [0.07, 0.16] as const, // ... and their alphas
} as const;

export type RimLightProps = {
  x?: number; // the box in frame px (also where the key is seen from)
  y?: number;
  w: number;
  h: number;
  r?: number;
  circle?: boolean;
  angle?: number; // screen degrees toward the light (0 right, 90 down, -90 up); default from the world's key
  width?: number; // px at 1080p
  peak?: number; // alpha facing the light
  base?: number; // alpha on the far side
  glint?: number; // the glint's strength 0..1 (default 1 on a dark world, 0.7 on a light one; 0 for none)
  color?: string;
  opacity?: number;
};

/** The rim's gradient: base on the far side, rising through mid to peak on the side toward the light. Pure. */
export const rimGradient = (angle: number, color: string, peak: number, base: number, mid = (peak + base) / 2) =>
  `linear-gradient(${(angle + 90).toFixed(1)}deg, ${rgbaOf(color, base)} 0%, ${rgbaOf(color, base)} 34%, ${rgbaOf(color, mid)} 66%, ${rgbaOf(color, peak)} 100%)`;

/** The glint of a w x h box lit from `angle`: its point on the edge (box px), its reach (px) and the edge's direction there (degrees). Pure. */
export const glintOf = (w: number, h: number, r: number, angle: number, u = 1) => {
  const p = edgeToward(w, h, r, angle);
  const onSide = Math.abs(p.x) < 0.5 || Math.abs(p.x - w) < 0.5;
  const len = onSide ? h : w;
  const G = RIM_LIGHT.glint;
  return { ...p, reach: Math.min(G.max * u, Math.max(G.min * u, len * G.reach)), along: onSide ? 90 : 0 };
};

export const RimLight: React.FC<RimLightProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const { width: W, height: H } = sizeOf(film);
  const world = useWorld();
  const x = p.x ?? 0;
  const y = p.y ?? 0;
  const r = p.circle ? Math.min(p.w, p.h) / 2 : radiusOf(p, u);
  const key = world?.spec.key ?? { x: 0.5, y: -0.3, color: '#FFFFFF', strength: 0.8 };
  const angle = p.angle ?? keyAngle({ x, y, w: p.w, h: p.h }, key, W, H);
  const g = world?.spec.glass;
  const dark = (world?.spec.tone ?? 'dark') === 'dark';
  const color = p.color ?? g?.rim ?? '#FFFFFF';
  const peak = (p.peak ?? g?.rimPeak ?? RIM_LIGHT.peak) * (0.6 + 0.4 * key.strength);
  const base = p.base ?? g?.rimBase ?? RIM_LIGHT.base;
  const bw = (p.width ?? RIM_LIGHT.width) * u;
  const gk = Math.max(0, Math.min(1, p.glint ?? (dark ? 1 : 0.7))) * key.strength;
  const gl = glintOf(p.w, p.h, r, angle, u);
  const G = RIM_LIGHT.glint;
  const glint = gk > 0 ? `radial-gradient(circle at ${gl.x.toFixed(1)}px ${gl.y.toFixed(1)}px, ${rgbaOf('#FFFFFF', gk)} 0px, ${rgbaOf(color, gk * 0.55)} ${(gl.reach * G.core).toFixed(1)}px, ${rgbaOf(color, 0)} ${gl.reach.toFixed(1)}px), ` : '';
  const mask = `linear-gradient(${MASK} 0 0) content-box, linear-gradient(${MASK} 0 0)`;
  const bh = G.bloomH * u;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: p.w,
          height: p.h,
          borderRadius: r,
          padding: bw,
          boxSizing: 'border-box',
          background: `${glint}${rimGradient(angle, color, peak, base)}`,
          WebkitMask: mask,
          WebkitMaskComposite: 'xor',
          mask: `linear-gradient(${MASK} 0 0) content-box exclude, linear-gradient(${MASK} 0 0)`,
          opacity: p.opacity ?? 1,
          pointerEvents: 'none',
        }}
      />
      {gk > 0 && dark ? (
        // the glint's light blooming just past the edge, stretched along it
        <div
          style={{
            position: 'absolute',
            left: x + gl.x - gl.reach,
            top: y + gl.y - bh,
            width: 2 * gl.reach,
            height: 2 * bh,
            transform: gl.along ? `rotate(${gl.along}deg)` : undefined,
            background: `radial-gradient(closest-side, ${rgbaOf(color, G.bloom * gk)}, ${rgbaOf(color, G.bloom * gk * 0.35)} 45%, ${rgbaOf(color, 0)})`,
            mixBlendMode: 'plus-lighter',
            opacity: p.opacity ?? 1,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </>
  );
};

export type LightSweepProps = Omit<SweepOpts, 'at'> & {
  x?: number;
  y?: number;
  w: number;
  h: number;
  r?: number;
  circle?: boolean;
  at: number | readonly number[]; // the frame (or frames) a light starts across the edge
  color?: string; // default the world's light
  width?: number; // the head's line width, px at 1080p
  halo?: number; // the head's glow 0..1 (default 1 on a dark world, 0.6 on a light one)
  frame?: number;
};

export const LightSweep: React.FC<LightSweepProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const world = useWorld();
  const s = activeSweep(f, p.at, { dur60: p.dur60, from: p.from, travel: p.travel, ease: p.ease }, film);
  if (!s) return null;
  const r = p.circle ? Math.min(p.w, p.h) / 2 : radiusOf(p, u);
  const dark = (world?.spec.tone ?? 'dark') === 'dark';
  const color = p.color ?? (dark ? (world?.spec.glow ?? '#FFFFFF') : '#FFFFFF');
  const halo = (p.halo ?? (dark ? 1 : 0.6)) * s.level;
  const lw = (p.width ?? RIM_LIGHT.sweepWidth) * u;
  const pad = Math.ceil(lw * RIM_LIGHT.tail[0] + 2);
  const d = roundRectPath(p.w, p.h, r, lw / 2);
  const x0 = p.x ?? 0;
  const y0 = p.y ?? 0;
  const blend = dark ? 'plus-lighter' : 'screen';
  const stroke = (k: number, alpha: number, key: string) =>
    SWEEP.tail.map((len, i) => (
      <path
        key={`${key}${i}`}
        d={d}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth={lw * k * (1 - 0.12 * i)}
        strokeOpacity={alpha * SWEEP.tailAlpha[i]}
        strokeLinecap="round"
        strokeDasharray={`${len} ${1 - len}`}
        strokeDashoffset={len - s.pos}
        transform={`translate(${pad} ${pad})`}
      />
    ));
  // the head: where the light is now, on the edge
  const hp = perimeterPoint(p.w, p.h, r, s.pos);
  const Hd = RIM_LIGHT.head;
  const hr = Hd.r * u;
  const fl = hr * Hd.flare;
  return (
    <>
      <svg width={p.w + 2 * pad} height={p.h + 2 * pad} style={{ position: 'absolute', left: x0 - pad, top: y0 - pad, overflow: 'visible', pointerEvents: 'none', mixBlendMode: blend, opacity: s.level }}>
        {stroke(RIM_LIGHT.tail[0], RIM_LIGHT.tailA[0], 'a')}
        {stroke(RIM_LIGHT.tail[1], RIM_LIGHT.tailA[1], 'b')}
        {stroke(1, 1, 'c')}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 2 * fl,
          height: hr * 0.84,
          transform: `translate(${(x0 + hp.x - fl).toFixed(2)}px, ${(y0 + hp.y - hr * 0.42).toFixed(2)}px) rotate(${(hp.n + 90).toFixed(1)}deg)`,
          background: `radial-gradient(closest-side, ${rgbaOf(color, Hd.flareA * halo)}, ${rgbaOf(color, 0)})`,
          mixBlendMode: blend,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 2 * hr,
          height: 2 * hr,
          transform: `translate(${(x0 + hp.x - hr).toFixed(2)}px, ${(y0 + hp.y - hr).toFixed(2)}px)`,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${rgbaOf('#FFFFFF', 0.95 * halo)}, ${rgbaOf(color, 0.45 * halo)} 22%, ${rgbaOf(color, 0.1 * halo)} 55%, ${rgbaOf(color, 0)})`,
          mixBlendMode: blend,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

/** Light on an edge is continuous: nothing to declare. */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

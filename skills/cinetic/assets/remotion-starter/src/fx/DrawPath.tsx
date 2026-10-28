import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * DrawPath: a connector or a route that draws itself along its length: a tree link from one node down to the next, a
 * dashed path between the pictures it joins, a leader from a label to what it names. A solid stroke is revealed with
 * a pathLength dash; a dashed stroke is shown through a solid mask stroke revealed the same way, so the dashes stay
 * put while the line grows (a dash pattern that slides as it draws reads as a loader, not a line).
 *
 *   drawPathState(f, o)       the share drawn (0..1) at frame f, from the start, the end or both ends from the centre
 *   elbowPath(a, b, o)        an orthogonal link with one rounded corner: across then down ('x') or down then across ('y')
 *   curvePath(points)         a smooth path through points (centripetal Catmull-Rom as cubic beziers)
 *   pointAtShare(points, s)   the point a share s along a polyline (the riding head of a drawn route)
 *   <DrawPath>                the stroke in a frame-sized SVG (d, or points with `curve`), solid or dashed, with an
 *                             optional head dot riding the drawn end and resting there (points only)
 *
 * House numbers (60 fps frames, px at 1080p): a link draws in 36 f on E.strongInOut, a long route 48-60 f; width 2.5;
 * dash 12 on, 10 off; round caps on a solid line, butt caps on dashes (a round cap fattens short dashes into beads);
 * the head dot 6 px. The line is part of the picture: the ink or the accent, never brighter than the type it links.
 */
export const DRAW_PATH = { dur60: 36, width: 2.5, dash: [12, 10] as [number, number], head: 6, radius: 28 } as const;

type Pt = [number, number];
export type DrawFrom = 'start' | 'end' | 'centre';
export type DrawPathOpts = { at: number; dur60?: number; ease?: Ease; from?: DrawFrom; reverse?: boolean };

/** The share of the path drawn at frame f (0 before `at`, 1 once drawn; `reverse` undraws it from the same end). Pure. */
export const drawPathState = (f: number, o: DrawPathOpts, film?: Partial<FilmCtx>): { drawn: number; done: boolean } => {
  const dur = Math.max(1, f60x(o.dur60 ?? DRAW_PATH.dur60, fpsOf(film)));
  const t = clamp((f - o.at) / dur);
  const p = (o.ease ?? E.strongInOut)(t);
  return { drawn: o.reverse ? 1 - p : p, done: t >= 1 };
};

/** The stroke-dasharray and offset (pathLength 1) that show `drawn` of a path growing from `from`. Pure. */
export const revealDash = (drawn: number, from: DrawFrom = 'start'): { dasharray: string; offset: number } => {
  const d = clamp(drawn);
  if (from === 'centre') return { dasharray: `0 ${((1 - d) / 2).toFixed(5)} ${d.toFixed(5)} 2`, offset: 0 };
  return { dasharray: '1 1', offset: from === 'end' ? -(1 - d) : 1 - d };
};

/** An orthogonal link from a to b with one rounded corner (radius px, clamped to the legs). axis 'x': across first; 'y': down first. Pure. */
export const elbowPath = (a: Pt, b: Pt, o: { r?: number; axis?: 'x' | 'y' } = {}): string => {
  const [ax, ay] = a;
  const [bx, by] = b;
  const axis = o.axis ?? 'x';
  const corner: Pt = axis === 'x' ? [bx, ay] : [ax, by];
  const r = Math.max(0, Math.min(o.r ?? DRAW_PATH.radius, Math.abs(bx - ax), Math.abs(by - ay)));
  const sx = Math.sign(bx - ax) || 1;
  const sy = Math.sign(by - ay) || 1;
  const p1: Pt = axis === 'x' ? [corner[0] - sx * r, corner[1]] : [corner[0], corner[1] - sy * r];
  const p2: Pt = axis === 'x' ? [corner[0], corner[1] + sy * r] : [corner[0] + sx * r, corner[1]];
  const n = (v: number) => v.toFixed(2);
  return `M${n(ax)} ${n(ay)} L${n(p1[0])} ${n(p1[1])} Q${n(corner[0])} ${n(corner[1])} ${n(p2[0])} ${n(p2[1])} L${n(bx)} ${n(by)}`;
};

/** A smooth path through the points (centripetal Catmull-Rom, written as cubic beziers). Pure. */
export const curvePath = (pts: readonly Pt[]): string => {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : '';
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const n = (v: number) => v.toFixed(2);
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
};

/** The point a share s (0..1) along a polyline, by arc length. Pure. */
export const pointAtShare = (pts: readonly Pt[], s: number): Pt => {
  if (pts.length < 2) return (pts[0] ?? [0, 0]) as Pt;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const L = seg.reduce((a, b) => a + b, 0) || 1;
  let left = clamp(s) * L;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? clamp(left / seg[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    left -= seg[i];
  }
  return pts[pts.length - 1] as Pt;
};

export type DrawPathProps = DrawPathOpts & {
  frame: number;
  d?: string; // the path in frame px (elbowPath, curvePath or any SVG path)
  points?: Pt[]; // or points in frame px (a polyline, or a curve through them with `curve`)
  curve?: boolean;
  width?: number; // px at 1080p
  color?: string;
  opacity?: number;
  dash?: [number, number] | false; // px at 1080p on / off; false: solid (default)
  head?: { r?: number; color?: string } | false; // a dot riding the drawn end (points only, from 'start')
  style?: React.CSSProperties;
};

export const DrawPath: React.FC<DrawPathProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const u = uOf(film);
  const id = `dp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const s = drawPathState(p.frame, p, film);
  if (s.drawn <= 0) return null;
  const d = p.d ?? (p.points ? (p.curve ? curvePath(p.points) : p.points.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' ')) : '');
  const sw = (p.width ?? DRAW_PATH.width) * u;
  const col = p.color ?? C.ink;
  const rv = revealDash(s.drawn, p.from);
  const dash = p.dash ? p.dash.map((v) => v * u) : null;
  const hd = p.head || {};
  const head = p.head && p.points && (p.from ?? 'start') === 'start' && !p.reverse ? pointAtShare(p.points, s.drawn) : null;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: p.opacity ?? 1, ...p.style }}>
      {dash ? (
        <>
          <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x={-W} y={-H} width={3 * W} height={3 * H}>
              <path d={d} fill="none" stroke={C.white} strokeWidth={sw + 4 * u} strokeLinecap="butt" strokeLinejoin="round" pathLength={1} strokeDasharray={rv.dasharray} strokeDashoffset={rv.offset} />
            </mask>
          </defs>
          <path d={d} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="butt" strokeLinejoin="round" strokeDasharray={`${dash[0].toFixed(2)} ${dash[1].toFixed(2)}`} mask={`url(#${id})`} />
        </>
      ) : (
        <path d={d} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={rv.dasharray} strokeDashoffset={rv.offset} />
      )}
      {head && <circle cx={head[0]} cy={head[1]} r={(hd.r ?? DRAW_PATH.head) * u} fill={hd.color ?? col} />}
    </svg>
  );
};

/** A drawn path declares nothing: it grows continuously. */
export const declares = (_p?: Partial<DrawPathProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

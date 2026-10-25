import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, prog } from '../lib/anim';
import type { FilmCtx } from '../lib/film';
import { sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * A line that belongs to the picture: it draws along a real edge in a photograph or a clip (a waterline, a
 * ridge, a roofline, a crack in a glaze), pinned to that picture, then lifts off and relaxes into a chart on
 * the same plane (a forecast curve, a profile, a route) with ticks and a riding dot. The chart reads as
 * something the place itself drew, not a widget laid over it.
 *
 * The edge is data, not a guess: trace it once from the frame the line draws on (a threshold or edge
 * contour, smoothed and resampled; keep it in image px) and map it through the picture's layer every frame
 * (photoPoint, or the footage's cover), so it stays on the edge while the camera moves. Pass both lines in
 * frame px for the current frame. Keep the stretch calm: cut hooks and notches out of it (they crumple into knots
 * when the line peels off), smooth it along its length (sigma ~25 px at 1080p) and move it 8-10 px to the darker
 * side, so a light line reads on dark water instead of vanishing on foam. On a moving clip, trace the frame the
 * draw is half done on.
 *
 * Timing: `draw` reveals the line along its length (house 36-44 f at 60 fps on strongInOut); `relax` moves
 * each point from the edge to the shape, staggered along the line so it peels off from one end (stagger
 * 0.35-0.5, 30-40 f, softOut); ticks land 8 f apart after the shape settles; the dot rides the shape's x
 * (time) from `from` to `to`. Keep the stroke at 4-6 px at 1080p and never brighter than the brightest real
 * thing in the picture (foam, sky): the picture stays the light.
 */
export type Pt = [number, number];
export type TraceTick = { u: number; at: number; label?: string };
export type TraceProps = {
  frame: number;
  edge: Pt[]; // frame px this frame: the real edge
  shape?: Pt[]; // frame px: what the line relaxes into (a function of x for ticks and the dot)
  draw: { start: number; dur: number; ease?: Ease; reverse?: boolean };
  relax?: { start: number; dur: number; ease?: Ease; stagger?: number };
  stroke?: { width?: number; color?: string; opacity?: number; shadow?: { color: string; blur: number; alpha: number } };
  ticks?: TraceTick[]; // u = fraction of the shape's x range; a tick lands at frame `at`
  tick?: { gap?: number; len?: number; width?: number; color?: string; opacity?: number; dur?: number };
  label?: { size: number; family: string; weight?: number; color?: string; gap?: number; opacity?: number; tracking?: string };
  dot?: { start: number; dur: number; ease?: Ease; from?: number; to?: number; r?: number; color: string; land?: number; drop?: number };
  samples?: number; // resampled point count (default 96)
};

export const TRACE_HOUSE = { draw60: 40, relax60: 34, stagger: 0.42, width: 5, tickGap60: 8, dotR: 13 } as const;

/** Arc-length resample of a polyline to n points. Pure. */
export const resample = (poly: Pt[], n: number): Pt[] => {
  if (poly.length < 2) return Array.from({ length: n }, () => (poly[0] ?? [0, 0]) as Pt);
  const arc = [0];
  for (let i = 1; i < poly.length; i++) arc.push(arc[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = arc[arc.length - 1] || 1;
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1);
    while (j < arc.length - 2 && arc[j + 1] < s) j++;
    const t = clamp((s - arc[j]) / Math.max(1e-9, arc[j + 1] - arc[j]));
    out.push([poly[j][0] + (poly[j + 1][0] - poly[j][0]) * t, poly[j][1] + (poly[j + 1][1] - poly[j][1]) * t]);
  }
  return out;
};

/** The point of a shape at a fraction u of its x range (the shape is a function of x, either direction). Pure. */
export const shapeAtX = (shape: Pt[], u: number): Pt => {
  const x0 = shape[0][0];
  const x1 = shape[shape.length - 1][0];
  const x = x0 + (x1 - x0) * clamp(u);
  for (let i = 1; i < shape.length; i++) {
    const a = shape[i - 1];
    const b = shape[i];
    if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return [x, a[1] + (b[1] - a[1]) * t];
    }
  }
  return u < 0.5 ? shape[0] : shape[shape.length - 1];
};

export type TraceState = { points: Pt[]; drawn: number; relax: number; dot: { x: number; y: number; u: number; shown: number } | null };

/** The line at frame f: its points (edge relaxing into shape), the drawn share, and the dot. Pure, closed form. */
export const traceState = (f: number, p: Omit<TraceProps, 'frame'>): TraceState => {
  const n = p.samples ?? 96;
  const edge = resample(p.edge, n);
  const shape = p.shape ? resample(p.shape, n) : edge;
  const drawn = prog(f, p.draw.start, p.draw.start + p.draw.dur, p.draw.ease ?? E.strongInOut);
  const st = p.relax?.stagger ?? TRACE_HOUSE.stagger;
  const rt = p.relax ? clamp((f - p.relax.start) / Math.max(1e-6, p.relax.dur)) : 0;
  const ease = p.relax?.ease ?? E.softOut;
  const points = edge.map((e, j) => {
    const s = j / (n - 1);
    const r = p.relax ? ease(clamp(rt * (1 + st) - st * s)) : 0;
    return [e[0] + (shape[j][0] - e[0]) * r, e[1] + (shape[j][1] - e[1]) * r] as Pt;
  });
  let dot: TraceState['dot'] = null;
  if (p.dot && p.shape && f >= (p.dot.start - (p.dot.land ?? 10))) {
    const k = prog(f, p.dot.start, p.dot.start + p.dot.dur, p.dot.ease ?? E.stdInOut);
    const u = (p.dot.from ?? 0) + ((p.dot.to ?? 1) - (p.dot.from ?? 0)) * k;
    const [x, y] = shapeAtX(p.shape, u);
    const shown = prog(f, p.dot.start - (p.dot.land ?? 10), p.dot.start, E.snapOut);
    dot = { x, y, u, shown };
  }
  return { points, drawn, relax: rt, dot };
};

const pathOf = (pts: Pt[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');

export const Trace: React.FC<TraceProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const s = traceState(p.frame, p);
  const sw = p.stroke?.width ?? TRACE_HOUSE.width;
  const col = p.stroke?.color ?? C.paper;
  const sh = p.stroke?.shadow;
  const tk = { gap: 18, len: 18, width: 3, opacity: 0.8, dur: 22, ...p.tick };
  const fid = `trace-${useId().replace(/:/g, '')}`;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {sh && (
        <defs>
          <filter id={fid} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={sh.blur} />
          </filter>
        </defs>
      )}
      {sh && s.drawn > 0 && (
        <path d={pathOf(s.points)} fill="none" stroke={sh.color} strokeOpacity={sh.alpha} strokeWidth={sw + 4} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`}
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={p.draw.reverse ? -(1 - s.drawn) : 1 - s.drawn} />
      )}
      {s.drawn > 0 && (
        <path d={pathOf(s.points)} fill="none" stroke={col} strokeOpacity={p.stroke?.opacity ?? 0.92} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={p.draw.reverse ? -(1 - s.drawn) : 1 - s.drawn} />
      )}
      {p.shape &&
        (p.ticks ?? []).map((t) => {
          const a = prog(p.frame, t.at, t.at + tk.dur, E.snapOut);
          if (a <= 0) return null;
          const [x, y] = shapeAtX(p.shape as Pt[], t.u);
          const base = y + tk.gap;
          return (
            <g key={`${t.u}`} opacity={a} transform={`translate(0 ${((1 - a) * 12).toFixed(2)})`}>
              <line x1={x} x2={x} y1={base} y2={base + tk.len} stroke={tk.color ?? col} strokeOpacity={tk.opacity} strokeWidth={tk.width} strokeLinecap="round" />
              {t.label && p.label && (
                <text x={x} y={base + tk.len + (p.label.gap ?? 12) + p.label.size * 0.8} textAnchor="middle" fill={p.label.color ?? col} fillOpacity={p.label.opacity ?? 0.9}
                  style={{ fontFamily: p.label.family, fontWeight: p.label.weight ?? 500, fontSize: p.label.size, letterSpacing: p.label.tracking ?? '-0.005em' }}>
                  {t.label}
                </text>
              )}
            </g>
          );
        })}
      {s.dot && s.dot.shown > 0 && p.dot && (
        <g>
          {p.dot.drop !== undefined && <line x1={s.dot.x} x2={s.dot.x} y1={s.dot.y + (p.dot.r ?? TRACE_HOUSE.dotR) + 6} y2={p.dot.drop} stroke={p.dot.color} strokeOpacity={0.75 * s.dot.shown} strokeWidth={2} />}
          <circle cx={s.dot.x} cy={s.dot.y} r={(p.dot.r ?? TRACE_HOUSE.dotR) * s.dot.shown} fill={p.dot.color} />
        </g>
      )}
    </svg>
  );
};

/** What a Trace does on purpose: nothing stepped, nothing cut. */
export const declares = (_p?: Partial<TraceProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

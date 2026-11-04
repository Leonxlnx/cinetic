import React from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { COOL_SPECTRUM, lab, srgbOf } from './plates';

/**
 * BorderBleed: colour that leaks along a border. A pill (or any rounded rect) in a thin ink stroke carries a
 * few small coloured dots (an integration each, a category each). On `at` colour leaks out of every dot along
 * the border in both directions (house 12 f at 60 fps, E.stdInOut) until neighbouring segments meet halfway
 * and the border is one continuous spectral ring; the dots shrink as they empty (9 -> 3 px) and are absorbed
 * on the next kick (`absorb`); then the ring turns slowly (a quarter turn in 4 s).
 *
 * Construction: the border is sampled into short segments (160), each coloured by an OKLab mix of the two
 * dots it lies between, so neighbouring hues meet without a grey seam; a segment shows while a leak covers
 * it, and each leak's leading 8 % of the perimeter feathers out (alpha), so an open segment never ends on a
 * hard cut. Order the dots by hue round the shape. Default colours: the cool side of the wheel. Pure state:
 * borderBleedState(f); declares nothing stepped (the absorb is a cue: borderBleedFrames).
 */

export const BORDER_BLEED = { leak60: 12, absorbAfter60: 14, feather: 0.08, dotFrom: 9, dotTo: 3, stroke: 3, segments: 160, turn60: 960 } as const;

export type BleedDot = { pos: number; color?: string }; // pos: share of the perimeter from the top centre, clockwise
export type BorderBleedProps = {
  at: number;
  w: number;
  h: number;
  r?: number; // corner radius (h / 2: a pill)
  dots: BleedDot[];
  leak?: number; // 60 fps frames (12)
  ease?: Ease;
  absorb?: number; // the frame the dots are absorbed (at + leak + 14)
  turn?: number; // 60 fps frames per full turn after closing (960; 0 = no spin)
  id?: string;
};

export type BorderBleedState = { k: number; reach: number[]; dotR: number; rot: number; closed: boolean; absorbed: boolean };

const sorted = (dots: BleedDot[]) => dots.map((d, i) => ({ ...d, i, pos: ((d.pos % 1) + 1) % 1 })).sort((a, b) => a.pos - b.pos);

/** Each dot's half-reach to the midpoint with its neighbours (shares of the perimeter). Pure. */
export const bleedReach = (dots: BleedDot[]): number[] => {
  const s = sorted(dots);
  const out = new Array(dots.length).fill(0.5);
  if (s.length < 2) return out;
  s.forEach((d, j) => {
    const nx = s[(j + 1) % s.length];
    const gap = (nx.pos - d.pos + 1) % 1 || 1;
    const pv = s[(j - 1 + s.length) % s.length];
    const gapB = (d.pos - pv.pos + 1) % 1 || 1;
    out[d.i] = Math.max(gap, gapB) / 2;
  });
  return out;
};

/** Leak progress, per-dot reach, dot radius (px at 1080p), ring rotation (share of the perimeter). Pure. */
export const borderBleedState = (frame: number, p: BorderBleedProps, film?: Partial<FilmCtx>): BorderBleedState => {
  const fps = fpsOf(film);
  const leak = Math.max(1, f60x(p.leak ?? BORDER_BLEED.leak60, fps));
  const t = frame - p.at;
  const k = (p.ease ?? E.stdInOut)(clamp(t / leak));
  const absorb = p.absorb ?? p.at + leak + f60x(BORDER_BLEED.absorbAfter60, fps);
  const turn = f60x(p.turn ?? BORDER_BLEED.turn60, fps);
  const rot = turn > 0 && t > leak ? (t - leak) / turn : 0;
  const full = bleedReach(p.dots);
  // the feathered lead overshoots the midpoint by its own length at k = 1, so the ring is whole on closing (no pop)
  return { k, reach: full.map((m) => (m + BORDER_BLEED.feather) * k), dotR: BORDER_BLEED.dotFrom + (BORDER_BLEED.dotTo - BORDER_BLEED.dotFrom) * k, rot, closed: k >= 1, absorbed: frame >= absorb };
};

/** Sync: leak start (a swell), closed, the absorb (the next kick). */
export const borderBleedFrames = (p: BorderBleedProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const leak = f60x(p.leak ?? BORDER_BLEED.leak60, fps);
  return { start: p.at, closed: Math.ceil(p.at + leak), absorb: Math.round(p.absorb ?? p.at + leak + f60x(BORDER_BLEED.absorbAfter60, fps)) };
};

/** A point on a rounded rect's perimeter at share u (0 = top centre, clockwise), box from (0, 0). Pure. */
export const roundRectPoint = (w: number, h: number, r: number, u: number): [number, number] => {
  const R = Math.min(r, w / 2, h / 2);
  const sx = w - 2 * R;
  const sy = h - 2 * R;
  const arc = (Math.PI * R) / 2;
  const P = 2 * sx + 2 * sy + 4 * arc;
  let d = (((u % 1) + 1) % 1) * P;
  const seg: [number, (q: number) => [number, number]][] = [
    [sx / 2, (q) => [w / 2 + q, 0]],
    [arc, (q) => { const a = -Math.PI / 2 + q / R; return [w - R + R * Math.cos(a), R + R * Math.sin(a)]; }],
    [sy, (q) => [w, R + q]],
    [arc, (q) => { const a = q / R; return [w - R + R * Math.cos(a), h - R + R * Math.sin(a)]; }],
    [sx, (q) => [w - R - q, h]],
    [arc, (q) => { const a = Math.PI / 2 + q / R; return [R + R * Math.cos(a), h - R + R * Math.sin(a)]; }],
    [sy, (q) => [0, h - R - q]],
    [arc, (q) => { const a = Math.PI + q / R; return [R + R * Math.cos(a), R + R * Math.sin(a)]; }],
    [sx / 2, (q) => [R + q, 0]],
  ];
  for (let i = 0; i < seg.length; i++) {
    const [len, f] = seg[i];
    if (d <= len || i === seg.length - 1) return f(Math.min(d, len));
    d -= len;
  }
  return [w / 2, 0];
};

/** Colour and opacity of the ring at perimeter share u for a state. Pure (the drawing samples it). */
export const bleedAt = (u: number, p: BorderBleedProps, s: BorderBleedState, colors: string[]): { rgb: [number, number, number]; a: number } => {
  const ds = sorted(p.dots);
  const uu = (((u - s.rot) % 1) + 1) % 1;
  // coverage: the best leak covering u, with a feathered leading edge
  let a = 0;
  for (const d of ds) {
    const dist = Math.min(Math.abs(uu - d.pos), 1 - Math.abs(uu - d.pos));
    const reach = s.reach[d.i];
    if (reach <= 0) continue;
    const f = BORDER_BLEED.feather;
    a = Math.max(a, s.closed ? 1 : clamp((reach - dist) / Math.max(1e-4, f)));
  }
  // hue: mix of the dots before and after u
  let j = ds.findIndex((d) => d.pos > uu) - 1;
  if (j < -1) j = ds.length - 1;
  if (j === -1) j = ds.length - 1;
  const A = ds[j];
  const B = ds[(j + 1) % ds.length];
  const span = (B.pos - A.pos + 1) % 1 || 1;
  const t = ((uu - A.pos + 1) % 1) / span;
  const la = lab(colors[A.i]);
  const lb = lab(colors[B.i]);
  const tt = t * t * (3 - 2 * t);
  return { rgb: srgbOf([la[0] + (lb[0] - la[0]) * tt, la[1] + (lb[1] - la[1]) * tt, la[2] + (lb[2] - la[2]) * tt]), a: clamp(a) };
};

/** Draws the border at (x, y) (top left of the box): the ink stroke, the leaking ring, the dots. */
export const BorderBleed: React.FC<BorderBleedProps & { frame: number; x: number; y: number; ink?: string; stroke?: number; glow?: boolean }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const s = borderBleedState(props.frame, props, film);
  const r = props.r ?? props.h / 2;
  const sw = (props.stroke ?? BORDER_BLEED.stroke) * u;
  const colors = props.dots.map((d, i) => d.color ?? COOL_SPECTRUM[(i * 2) % COOL_SPECTRUM.length]);
  const N = BORDER_BLEED.segments;
  const pts = Array.from({ length: N + 1 }, (_, i) => roundRectPoint(props.w, props.h, r, i / N));
  const segs: React.ReactNode[] = [];
  if (s.k > 0) {
    for (let i = 0; i < N; i++) {
      const c = bleedAt((i + 0.5) / N, props, s, colors);
      if (c.a <= 0.003) continue;
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const rgb = `rgb(${Math.round(c.rgb[0] * 255)}, ${Math.round(c.rgb[1] * 255)}, ${Math.round(c.rgb[2] * 255)})`;
      segs.push(<line key={i} x1={x0.toFixed(2)} y1={y0.toFixed(2)} x2={x1.toFixed(2)} y2={y1.toFixed(2)} stroke={rgb} strokeOpacity={c.a} strokeWidth={sw * 1.15} strokeLinecap={c.a > 0.98 ? 'round' : 'butt'} />);
    }
  }
  const ds = props.dots;
  return (
    <svg width={props.w} height={props.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${props.x}px, ${props.y}px)` }} aria-hidden>
      <rect x={0} y={0} width={props.w} height={props.h} rx={r} fill="none" stroke={props.ink ?? C.ink} strokeWidth={sw} />
      {props.glow && s.k > 0 ? <g style={{ filter: `blur(${6 * u}px)` }} opacity={0.55}>{segs}</g> : null}
      {segs}
      {!s.absorbed
        ? ds.map((d, i) => {
            const [cx, cy] = roundRectPoint(props.w, props.h, r, d.pos + s.rot);
            return <circle key={i} cx={cx} cy={cy} r={s.dotR * u} fill={colors[i]} />;
          })
        : null}
    </svg>
  );
};

/** A turning rim: a conic gradient of the section's colours around a container's border, 3 deg a 60 fps frame. */
export const SPIN_RIM = { deg60: 3 } as const;

/**
 * The background of a rim that turns (a pill whose border runs its colours round after its label swaps): a conic
 * gradient through `stops` (closed back to the first), turned SPIN_RIM.deg60 a 60 fps frame from `at` (0 before).
 * Paint it on the outer box and lay the fill inset by the rim's width over it. Pure.
 */
export const spinRim = (frame: number, at: number, stops: string[], o: { deg60?: number; from?: number } = {}, film?: Partial<FilmCtx>): string => {
  const deg = (o.from ?? 0) + (Math.max(0, frame - at) * (o.deg60 ?? SPIN_RIM.deg60) * 60) / fpsOf(film);
  return `conic-gradient(from ${deg.toFixed(2)}deg, ${[...stops, stops[0]].join(', ')})`;
};

/** Continuous by design (the absorb is a cut of tiny dots on a kick: a cue, not a stepped run). */
export const declares = (_p?: Partial<BorderBleedProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { hash01 } from './plates';

/**
 * MorphPath: outline morphs between any closed shapes, with secondary shapes that follow the hero, and jelly
 * blobs that fuse and split.
 *
 *   ShapeMorph  every shape is resampled by arc length to n points (96) starting at the top, clockwise; the
 *               target is rotated to the start index that moves least, and each point leaves on its own delay by
 *               its distance round the shape from `from` (`stagger` 0.35), so the change spreads both ways round
 *               the outline like a wave and meets on the far side (never a seam) instead of every point sliding
 *               at once; drawn through a closed Catmull-Rom spline. `followers`
 *               are smaller copies at offsets that run the same morph `lag60` (5) frames later each: the
 *               satellites echo the hero's change one after another
 *   Goo         two blobs enter from the edges, fuse, split and fuse again (3 cycles, each 0.7 the size, 24 f),
 *               then collapse into the mark's dot; in flight a blob stretches along its travel (rx = r(1 + kv),
 *               ry = r / (1 + kv)), slowing it wobbles with a facet that travels round its edge; a fixed blur and
 *               an alpha threshold merge them with crisp edges
 *
 * Pure state: shapePts(), alignPts(), morphPts(), shapeMorphState(), gooState(). Morphs are continuous.
 */

export const MORPH_PATH = {
  n: 96,
  stagger: 0.35,
  dur60: 36,
  follow: { lag60: 5, scale: 0.42, fade: 0.22 },
  goo: { blur: 16, cycles: 3, shrink: 0.7, cycle60: 24, enter60: 22, collapse60: 26 },
} as const;

export type Pt = [number, number];
export type ShapeSpec = { kind: 'circle' | 'rect' | 'pill' | 'star' | 'poly' | 'blob'; cx: number; cy: number; w: number; h: number; r?: number; points?: number; inner?: number; seed?: number; wobble?: number; rotate?: number };

// ---------------------------------------------------------------------------------------------------- shapes
/** A closed polyline resampled to n points evenly by arc length. Pure. */
export const resample = (poly: Pt[], n: number): Pt[] => {
  const m = poly.length;
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < m; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % m];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(d);
    total += d;
  }
  const out: Pt[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (acc + seg[i] < target && i < m - 1) acc += seg[i++];
    const t = seg[i] > 0 ? (target - acc) / seg[i] : 0;
    const a = poly[i];
    const b = poly[(i + 1) % m];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
};

const dense = (s: ShapeSpec): Pt[] => {
  const pts: Pt[] = [];
  const rx = s.w / 2;
  const ry = s.h / 2;
  const rot = ((s.rotate ?? 0) * Math.PI) / 180;
  const at = (a: number, r: number): Pt => [s.cx + r * rx * Math.cos(a + rot), s.cy + r * ry * Math.sin(a + rot)];
  const N = 720;
  if (s.kind === 'circle') for (let i = 0; i < N; i++) pts.push(at(-Math.PI / 2 + (2 * Math.PI * i) / N, 1));
  else if (s.kind === 'blob') {
    const wob = s.wobble ?? 0.12;
    const ph = [0, 1, 2].map((k) => hash01(k, 7, s.seed ?? 1) * 6.283);
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
      pts.push(at(a, 1 + wob * (0.6 * Math.sin(2 * a + ph[0]) + 0.3 * Math.sin(3 * a + ph[1]) + 0.2 * Math.sin(5 * a + ph[2]))));
    }
  } else if (s.kind === 'star' || s.kind === 'poly') {
    const k = s.points ?? 5;
    const inner = s.kind === 'star' ? (s.inner ?? 0.45) : 1;
    const v = s.kind === 'star' ? 2 * k : k;
    for (let i = 0; i < v; i++) pts.push(at(-Math.PI / 2 + (2 * Math.PI * i) / v, i % 2 && s.kind === 'star' ? inner : 1));
  } else {
    // rect / pill: rounded rect traced from the top centre, clockwise
    const r = Math.min(s.kind === 'pill' ? Math.min(rx, ry) : (s.r ?? 0), rx, ry);
    const x0 = s.cx - rx;
    const y0 = s.cy - ry;
    const x1 = s.cx + rx;
    const y1 = s.cy + ry;
    const arc = (cx: number, cy: number, a0: number) => {
      for (let i = 0; i <= 24; i++) {
        const a = a0 + (Math.PI / 2) * (i / 24);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    };
    pts.push([s.cx, y0]);
    arc(x1 - r, y0 + r, -Math.PI / 2);
    arc(x1 - r, y1 - r, 0);
    arc(x0 + r, y1 - r, Math.PI / 2);
    arc(x0 + r, y0 + r, Math.PI);
  }
  return pts;
};

/** A shape as n points, evenly spaced, starting at its top, clockwise. Pure. */
export const shapePts = (s: ShapeSpec, n: number = MORPH_PATH.n): Pt[] => resample(dense(s), n);

/** b rotated to the start index that moves least from a (same length). Pure. */
export const alignPts = (a: Pt[], b: Pt[]): Pt[] => {
  const n = a.length;
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s < n; s++) {
    let d = 0;
    for (let i = 0; i < n && d < bestD; i += 2) {
      const q = b[(i + s) % n];
      d += (q[0] - a[i][0]) ** 2 + (q[1] - a[i][1]) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return a.map((_, i) => b[(i + best) % n]);
};

const centroid = (p: Pt[]): Pt => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];

/** a -> b at t with a travelling delay: point i waits stagger x its distance round a's centre from angle `from` (deg), both ways. Pure. */
export const morphPts = (a: Pt[], b: Pt[], t: number, o: { stagger?: number; from?: number; ease?: Ease } = {}): Pt[] => {
  const st = clamp(o.stagger ?? MORPH_PATH.stagger, 0, 0.95);
  const ease = o.ease ?? E.stdInOut;
  const [cx, cy] = centroid(a);
  const f0 = (((o.from ?? -90) * Math.PI) / 180);
  return a.map((p, i) => {
    let turn = (Math.atan2(p[1] - cy, p[0] - cx) - f0) / (2 * Math.PI);
    turn -= Math.floor(turn);
    const d = 2 * Math.min(turn, 1 - turn); // 0 at `from`, 1 opposite: the wave spreads both ways, no seam
    const k = ease(clamp((t - st * d) / (1 - st)));
    return [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k];
  });
};

/** Points as a closed Catmull-Rom spline path. Pure. */
export const ptsPath = (p: Pt[]): string => {
  const n = p.length;
  if (n < 3) return '';
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
};

// ---------------------------------------------------------------------------------------------------- morph chain
export type ShapeMorphProps = {
  shapes: (ShapeSpec | Pt[])[];
  keys: { at: number; dur60?: number }[]; // shape k -> k + 1 starts at keys[k].at
  stagger?: number;
  from?: number;
  ease?: Ease;
  n?: number;
  followers?: { offsets: Pt[]; lag60?: number; scale?: number; fade?: number };
};

const chainCache = new WeakMap<object, Pt[][]>();
const chainPts = (p: ShapeMorphProps): Pt[][] => {
  const hit = chainCache.get(p.shapes);
  if (hit) return hit;
  const n = p.n ?? MORPH_PATH.n;
  const raw = p.shapes.map((s) => (Array.isArray(s) ? resample(s, n) : shapePts(s, n)));
  const out: Pt[][] = [raw[0]];
  for (let i = 1; i < raw.length; i++) out.push(alignPts(out[i - 1], raw[i]));
  chainCache.set(p.shapes, out);
  return out;
};

/** The hero outline at frame f (the chain of keyed morphs). Pure. */
export const heroPts = (f: number, p: ShapeMorphProps, film: Partial<FilmCtx>): Pt[] => {
  const fps = fpsOf(film);
  const pts = chainPts(p);
  let cur = pts[0];
  for (let k = 0; k < p.keys.length && k + 1 < pts.length; k++) {
    const t = clamp((f - p.keys[k].at) / f60x(p.keys[k].dur60 ?? MORPH_PATH.dur60, fps));
    if (t <= 0) break;
    if (t < 1) return morphPts(pts[k], pts[k + 1], t, p);
    cur = pts[k + 1];
  }
  return cur;
};

/** Hero and followers at frame f: each follower runs the hero's morph lag x (j + 1) frames late, scaled about its own centre and moved to its offset. Pure. */
export const shapeMorphState = (f: number, p: ShapeMorphProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const hero = heroPts(f, p, film);
  const F = p.followers;
  const followers = (F?.offsets ?? []).map((off, j) => {
    const q = heroPts(f - f60x((F?.lag60 ?? MORPH_PATH.follow.lag60) * (j + 1), fps), p, film);
    const [cx, cy] = centroid(q);
    const sc = F?.scale ?? MORPH_PATH.follow.scale;
    return { pts: q.map(([x, y]) => [cx + (x - cx) * sc + off[0], cy + (y - cy) * sc + off[1]] as Pt), opacity: clamp(1 - (F?.fade ?? MORPH_PATH.follow.fade) * j) };
  });
  return { hero, followers };
};

export const ShapeMorph: React.FC<ShapeMorphProps & { frame: number; fill?: string; stroke?: string; strokeWidth?: number; followerFill?: string }> = (p) => {
  const film = useFilm();
  const s = shapeMorphState(p.frame, p, film);
  const sw = (p.strokeWidth ?? 0) * uOf(film);
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {s.followers.map((fl, j) => (
        <path key={j} d={ptsPath(fl.pts)} fill={p.followerFill ?? p.fill ?? C.accent} opacity={fl.opacity} />
      ))}
      <path d={ptsPath(s.hero)} fill={p.fill ?? C.accent} stroke={p.stroke} strokeWidth={sw || undefined} />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------- goo
export type GooProps = { at: number; cx: number; cy: number; span: number; r: number; dot: number; cycles?: number; cycle60?: number; shrink?: number; enter60?: number; collapse60?: number };

/** Centre separation (px, half-distance between the blobs) and radius at frame f, before stretch. Pure. */
export const gooPose = (f: number, p: GooProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const G = MORPH_PATH.goo;
  const n = p.cycles ?? G.cycles;
  const sh = p.shrink ?? G.shrink;
  const enter = f60x(p.enter60 ?? G.enter60, fps);
  const cyc = f60x(p.cycle60 ?? G.cycle60, fps);
  const col = f60x(p.collapse60 ?? G.collapse60, fps);
  const t = f - p.at;
  if (t < enter) {
    const k = E.buildIn(clamp(t / enter)); // accelerating into the first hit
    return { sep: p.span + (0.55 * p.r - p.span) * k, r: p.r, phase: 'enter' as const, done: false };
  }
  if (t < enter + n * cyc) {
    const c = Math.floor((t - enter) / cyc);
    const u = (t - enter - c * cyc) / cyc;
    const r = p.r * sh ** (c + u);
    return { sep: 0.55 * r + 2.2 * r * Math.sin(Math.PI * u) ** 0.8, r, phase: 'cycle' as const, done: false };
  }
  const u = clamp((t - enter - n * cyc) / col);
  const r0 = p.r * sh ** n;
  const k = E.softIn(u);
  return { sep: 0.55 * r0 * (1 - k), r: r0 + (p.dot - r0) * k, phase: 'collapse' as const, done: u >= 1 };
};

/** The two blobs at frame f: centres, radii stretched along their travel (speed per 60 fps frame) and the wobble phase. Pure. */
export const gooState = (f: number, p: GooProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const a = gooPose(f, p, film);
  const b = gooPose(f - 0.5, p, film);
  const c = gooPose(f + 0.5, p, film);
  const v60 = (Math.abs(c.sep - b.sep) * fps) / 60; // px per 60 fps frame
  const k = clamp(0.012 * v60, 0, 0.3); // at most 1.3 : 0.77, a blob, never a flat disc
  const blobs = [-1, 1].map((side) => ({ x: p.cx + side * a.sep, y: p.cy, rx: a.r * (1 + k), ry: a.r / (1 + k), still: 1 - clamp(k / 0.15) }));
  return { blobs, merged: a.done, phase: a.phase, k };
};

const blobPath = (b: { x: number; y: number; rx: number; ry: number; still: number }, ph: number) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (2 * Math.PI * i) / 48;
    const w = 1 + 0.06 * b.still * Math.sin(3 * t + ph);
    pts.push([b.x + b.rx * w * Math.cos(t), b.y + b.ry * w * Math.sin(t)]);
  }
  return ptsPath(pts);
};

export const Goo: React.FC<GooProps & { frame: number; fill?: string }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const uid = useId().replace(/[:]/g, '');
  const s = gooState(p.frame, p, film);
  const ph = (0.2 * p.frame * 60) / film.fps;
  // one fixed blur per instance, small against the last cycle's blob so the threshold keeps its size
  const blur = clamp(0.3 * p.r * (p.shrink ?? MORPH_PATH.goo.shrink) ** (p.cycles ?? MORPH_PATH.goo.cycles), 4 * u, MORPH_PATH.goo.blur * u);
  if (p.frame < p.at) return null;
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <filter id={`goo${uid}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={blur} />
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -11" />
        </filter>
      </defs>
      <g filter={`url(#goo${uid})`}>
        {s.merged ? <circle cx={p.cx} cy={p.cy} r={p.dot} fill={p.fill ?? C.accent} /> : s.blobs.map((b, i) => <path key={i} d={blobPath(b, ph + i * 1.7)} fill={p.fill ?? C.accent} />)}
      </g>
    </svg>
  );
};

/** Morphs and goo are continuous: nothing steps or flashes. */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

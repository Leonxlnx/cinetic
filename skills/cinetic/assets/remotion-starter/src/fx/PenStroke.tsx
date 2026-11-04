import React from 'react';
import { clamp, E, type Ease, fd, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * PenStroke: marker-pen strokes in one bright colour (about 30 px, round ends) that write on over the type
 * at pen speed, hold, and erase in drawing order: a big X slashes a word (the second stroke starts as the
 * first ends; most of it in 5 of 17 frames), an underline writes right to left, a zigzag arrow starts as a
 * dot and draws through the line, small arrows write and erase between words, a dashed arrow writes dash by
 * dash, a loose ring circles a word. Doodles can be cut mid-erase.
 *
 * Strokes of a group share one pen: the write time is split by length (constant pen speed) and the strokes
 * follow each other ('chain'), or all write at once ('together'). Pure state: the visible window of each
 * stroke, as shares of its length. penPaths builds hand-drawn shapes around a box (seeded wobble).
 */

/** House numbers: frames at 60 fps, px at 1080p. */
export const PEN = { write60: 20, hold60: 8, erase60: 16, width: 30, wobble: 0.025 } as const;

export type PenProps = {
  at: number; // the pen touches down
  lengths?: number[]; // relative stroke lengths (constant pen speed; default equal)
  write?: { frames?: number; ease?: Ease }; // 60 fps frames for the whole group (house 20) on E.stdInOut
  sequence?: 'chain' | 'together';
  hold?: number; // 60 fps frames before the erase (house 8)
  erase?: false | { frames?: number; order?: 'drawing' | 'reverse'; ease?: Ease }; // house 16 f in drawing order on E.stdInOut
  dash?: { n: number }; // reveal dash by dash: the window snaps to whole dashes (n per stroke)
  id?: string;
};

export type PenWindow = { a: number; b: number; visible: boolean };

/** Split [0, 1] of the group's progress into each stroke's own progress (chain: by length; together: all of it). */
const split = (k: number, lengths: number[], seq: 'chain' | 'together'): number[] => {
  if (seq === 'together') return lengths.map(() => k);
  const total = lengths.reduce((s, l) => s + l, 0) || 1;
  let acc = 0;
  return lengths.map((l) => {
    const a = acc / total;
    acc += l;
    const b = acc / total;
    return clamp((k - a) / Math.max(1e-6, b - a));
  });
};

/** Each stroke's visible window [a, b] (shares of its length) at frame f. Pure. */
export const penStrokeState = (frame: number, p: PenProps, n: number, film?: Partial<FilmCtx>): PenWindow[] => {
  const fps = fpsOf(film);
  const lengths = p.lengths ?? Array.from({ length: n }, () => 1);
  const seq = p.sequence ?? 'chain';
  const wf = Math.max(1, f60x(p.write?.frames ?? PEN.write60, fps));
  const w = (p.write?.ease ?? E.stdInOut)(clamp((frame - p.at) / wf));
  const heads = split(w, lengths, seq);
  let tails = lengths.map(() => 0);
  let shrink = lengths.map(() => 1);
  if (p.erase !== false) {
    const e0 = p.at + wf + f60x(p.hold ?? PEN.hold60, fps);
    const ef = Math.max(1, f60x(p.erase?.frames ?? PEN.erase60, fps));
    const e = (p.erase?.ease ?? E.stdInOut)(clamp((frame - e0) / ef));
    const parts = split(e, lengths, seq);
    if ((p.erase?.order ?? 'drawing') === 'drawing') tails = parts;
    else shrink = parts.map((q) => 1 - q);
  }
  return heads.map((h, i) => {
    let b = Math.min(h, shrink[i]);
    let a = tails[i];
    if (p.dash) {
      const d = p.dash.n;
      b = Math.floor(b * d + 1e-9) / d;
      a = Math.ceil(a * d - 1e-9) / d;
    }
    return { a, b, visible: frame >= p.at && h > 0 && b > a };
  });
};

/** Sync: touch-down (a marker squeak), the end of the write, the erase start and end. */
export const penFrames = (p: PenProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const wf = f60x(p.write?.frames ?? PEN.write60, fps);
  const e0 = p.at + wf + f60x(p.hold ?? PEN.hold60, fps);
  return { down: p.at, written: Math.ceil(p.at + wf), erase: p.erase === false ? undefined : Math.round(e0), gone: p.erase === false ? undefined : Math.ceil(e0 + f60x(p.erase?.frames ?? PEN.erase60, fps)) };
};

type Pt = [number, number];
type BoxLike = { x: number; y: number; w: number; h: number };
const jit = (seed: string, i: number, s: number) => (rand(`${seed}:${i}`) * 2 - 1) * s;
const fmt = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
/** A smooth path through points (Catmull-Rom as cubic Beziers). */
const smooth = (pts: Pt[]) => {
  if (pts.length < 3) return fmt(pts);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/** Hand-drawn shapes (SVG path strings and their relative lengths) around a box or between points, seeded. */
export const penPaths = {
  /** An underline under a box, written left to right (or right to left), slightly rising. */
  underline: (b: BoxLike, o: { rtl?: boolean; seed?: string; below?: number } = {}) => {
    const s = o.seed ?? 'u';
    const y = b.y + b.h + (o.below ?? b.h * 0.08);
    const pts: Pt[] = [0, 0.33, 0.66, 1].map((t, i) => [b.x - b.w * 0.03 + t * b.w * 1.06, y - t * b.h * 0.06 + jit(s, i, b.h * PEN.wobble)]);
    if (o.rtl) pts.reverse();
    return { d: [smooth(pts)], lengths: [1] };
  },
  /** A big X over a box: two strokes, the second starting where the pen lifts. */
  x: (b: BoxLike, o: { seed?: string; over?: number } = {}) => {
    const s = o.seed ?? 'x';
    const m = o.over ?? 0.08;
    const a: Pt[] = [[b.x - b.w * m, b.y - b.h * m], [b.x + b.w * (1 + m), b.y + b.h * (1 + m)]];
    const c: Pt[] = [[b.x + b.w * (1 + m), b.y - b.h * m + jit(s, 1, b.h * 0.05)], [b.x - b.w * m, b.y + b.h * (1 + m)]];
    return { d: [fmt(a), fmt(c)], lengths: [1, 1] };
  },
  /** A loose ring around a box that overshoots its start (a marker circling a word). */
  ring: (b: BoxLike, o: { seed?: string; turns?: number } = {}) => {
    const s = o.seed ?? 'o';
    const turns = o.turns ?? 1.12;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const n = 24;
    const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * turns * Math.PI * 2 - Math.PI * 0.8;
      const r = 1 + jit(s, i, 0.04) + (i / n) * 0.06;
      return [cx + (b.w / 2) * 1.12 * r * Math.cos(t), cy + (b.h / 2) * 1.3 * r * Math.sin(t)];
    });
    return { d: [smooth(pts)], lengths: [1] };
  },
  /** An arrow from a to b: the shaft, then the head's two strokes. */
  arrow: (a: Pt, b: Pt, o: { head?: number; bend?: number; seed?: string } = {}) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const bend = (o.bend ?? 0.08) * L;
    const mid: Pt = [(a[0] + b[0]) / 2 + nx * bend, (a[1] + b[1]) / 2 + ny * bend];
    const h = o.head ?? Math.min(70, L * 0.22);
    const ang = Math.atan2(b[1] - mid[1], b[0] - mid[0]);
    const wing = (s: number): Pt[] => [b, [b[0] - h * Math.cos(ang + s * 0.5), b[1] - h * Math.sin(ang + s * 0.5)]];
    return { d: [smooth([a, mid, b]), fmt(wing(1)), fmt(wing(-1))], lengths: [L, h, h] };
  },
  /** A rising zigzag from a to b with n teeth (a growth arrow), head at b. */
  zigzag: (a: Pt, b: Pt, o: { n?: number; amp?: number; head?: number } = {}) => {
    const n = o.n ?? 3;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const amp = (o.amp ?? 0.12) * L;
    const pts: Pt[] = [a];
    for (let i = 1; i < 2 * n; i++) {
      const t = i / (2 * n);
      const sgn = i % 2 ? 1 : -1;
      pts.push([a[0] + dx * t + nx * amp * sgn, a[1] + dy * t + ny * amp * sgn]);
    }
    pts.push(b);
    const h = o.head ?? Math.min(70, L * 0.18);
    const ang = Math.atan2(dy, dx);
    const wing = (s: number): Pt[] => [b, [b[0] - h * Math.cos(ang + s * 0.55), b[1] - h * Math.sin(ang + s * 0.55)]];
    return { d: [fmt(pts), fmt(wing(1)), fmt(wing(-1))], lengths: [L * 1.4, h, h] };
  },
};

/** Draws the strokes: round-capped SVG paths in `color`, `width` px at 1080p (house 30). */
export const PenStroke: React.FC<PenProps & { frame: number; d: string[]; color: string; width?: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const ws = penStrokeState(props.frame, props, props.d.length, film);
  if (!ws.some((w) => w.visible)) return null;
  const sw = (props.width ?? PEN.width) * uOf(film);
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...props.style }} aria-hidden>
      {props.d.map((d, i) => {
        const w = ws[i];
        if (!w.visible) return null;
        return <path key={i} d={d} fill="none" stroke={props.color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${(w.b - w.a).toFixed(4)} 2`} strokeDashoffset={(-w.a).toFixed(4)} />;
      })}
    </svg>
  );
};

/** Continuous by default; a dash-by-dash reveal steps (its write span is declared stepped). */
export const declares = (p?: Partial<PenProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || !p.dash) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = penFrames(p as PenProps, film);
  return { stepped: [{ from: p.at, to: (fr.gone ?? fr.written) + 1, id: p.id ?? 'pen' }], flashes: [], cameraBlur: [], seams: [] };
};

/** Whole frame helper for callers that cut a doodle mid-erase: the erase's progress at a cut frame. */
export const penEraseShare = (cut: number, p: PenProps, film?: Partial<FilmCtx>) => {
  const fr = penFrames(p, film);
  if (fr.erase === undefined || fr.gone === undefined) return 0;
  return clamp((fd(cut) - fr.erase) / Math.max(1, fr.gone - fr.erase));
};

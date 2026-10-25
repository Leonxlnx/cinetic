import React, { useLayoutEffect, useRef } from 'react';
import { Img } from 'remotion';
import { clamp, E, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { useImageGrid } from './Cascade';

/**
 * DotMatrix: a cut that turns on like a screen. Over the outgoing shot the next one appears as round dots on a
 * regular grid (12 px pitch, 4.5 px radius at 1080p), each dot the colour of the incoming picture at its cell,
 * in shapes that grow frame by frame: a blob (an ellipse round `centre`, 0.3 -> 1.2 of the half-diagonal on
 * twos) and full-width bands of rows switched on by a seeded order. The gaps keep showing the outgoing shot,
 * never black, so the two interleave cell by cell; then the solid picture fades in under the dots and the dots
 * go. House at 60 fps: first cluster 2 f, growth 14 f, solid 8 f, dots gone 6 f (about 28 f).
 *
 * Pure state: dotMatrixState(f) and dotOn(col, row, state); <DotMatrix> paints one canvas from the picture's
 * grid (sampled once, Cascade's useImageGrid) and puts the plain picture under it. Stepped: declared.
 */

export const DOT_MATRIX = { cell: 12, r: 4.5, cluster60: 2, grow60: 14, solid60: 8, gone60: 6, ellipse: [0.3, 1.2] as [number, number], rowsFrom: 0.35, band: 3, step60: 2 } as const;

export type DotMatrixProps = {
  at: number;
  cell?: number; // px at 1080p
  r?: number; // dot radius, px at 1080p
  centre?: [number, number]; // the blob's centre as shares of the box (0.5, 0.5)
  ellipse?: [number, number]; // radius from, to (shares of the half-diagonal)
  rowsFrom?: number; // share of the growth after which bands of rows start switching on
  band?: number; // rows per band (3)
  grow?: number; // 60 fps frames (14)
  solid?: number; // 60 fps frames (8)
  gone?: number; // 60 fps frames (6)
  seed?: string | number;
  id?: string;
};

export type DotMatrixState = { phase: 'before' | 'dots' | 'solid' | 'done'; ellipse: number; rowsOn: number; solid: number; dots: number };

/** The mask's growth, the share of bands on, the solid picture's opacity and the dots' opacity at frame f. Pure. */
export const dotMatrixState = (frame: number, p: DotMatrixProps, film?: Partial<FilmCtx>): DotMatrixState => {
  const fps = fpsOf(film);
  const t = frame - p.at;
  if (t < 0) return { phase: 'before', ellipse: 0, rowsOn: 0, solid: 0, dots: 0 };
  const step = Math.max(1, f60x(DOT_MATRIX.step60, fps));
  const g = Math.floor(t / step) * step; // on twos at 60 fps
  const cl = f60x(DOT_MATRIX.cluster60, fps);
  const grow = Math.max(1, f60x(p.grow ?? DOT_MATRIX.grow60, fps));
  const [e0, e1] = p.ellipse ?? DOT_MATRIX.ellipse;
  const k = clamp((g - cl) / grow);
  const ellipse = g < cl ? e0 : e0 + (e1 - e0) * E.buildIn(k);
  const rf = p.rowsFrom ?? DOT_MATRIX.rowsFrom;
  const rowsOn = clamp((k - rf) / (1 - rf));
  const sAt = cl + grow;
  const sd = Math.max(1, f60x(p.solid ?? DOT_MATRIX.solid60, fps));
  const gd = Math.max(1, f60x(p.gone ?? DOT_MATRIX.gone60, fps));
  const solid = E.linear(clamp((t - sAt) / sd));
  const dots = 1 - E.linear(clamp((t - (sAt + sd - gd / 2)) / gd));
  const phase = dots <= 0 ? 'done' : solid > 0 ? 'solid' : 'dots';
  return { phase, ellipse, rowsOn, solid, dots };
};

/** Is the dot at (col, row) of a cols x rows grid on? Blob or band. Pure. */
export const dotOn = (c: number, r: number, cols: number, rows: number, s: DotMatrixState, p: DotMatrixProps): boolean => {
  if (s.phase === 'before') return false;
  if (s.phase !== 'dots') return true;
  const [cx, cy] = p.centre ?? [0.5, 0.5];
  const dx = (c + 0.5) / cols - cx;
  const dy = ((r + 0.5) / rows - cy) * (rows / cols); // round in pixels
  const half = Math.hypot(0.5, 0.5 * (rows / cols));
  if (Math.hypot(dx, dy) <= s.ellipse * half) return true;
  if (s.rowsOn <= 0) return false;
  const b = Math.floor(r / (p.band ?? DOT_MATRIX.band));
  return rand(`${p.seed ?? 'dm'}:band:${b}`) < s.rowsOn;
};

/** Sync: the first cluster (a tick), the end of growth, the solid picture, done. */
export const dotMatrixFrames = (p: DotMatrixProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const cl = f60x(DOT_MATRIX.cluster60, fps);
  const grow = f60x(p.grow ?? DOT_MATRIX.grow60, fps);
  const sd = f60x(p.solid ?? DOT_MATRIX.solid60, fps);
  const gd = f60x(p.gone ?? DOT_MATRIX.gone60, fps);
  return { start: p.at, grown: Math.ceil(p.at + cl + grow), solid: Math.ceil(p.at + cl + grow + sd), done: Math.ceil(p.at + cl + grow + sd + gd / 2) };
};

/** Draws the incoming picture `src` as the dot matrix over whatever is behind it, in the box (x, y, w, h). */
export const DotMatrix: React.FC<DotMatrixProps & { frame: number; src: string; x: number; y: number; w: number; h: number }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const cell = (props.cell ?? DOT_MATRIX.cell) * u;
  const cols = Math.max(1, Math.round(props.w / cell));
  const rows = Math.max(1, Math.round(props.h / cell));
  const grid = useImageGrid(props.src, cols, rows, props.w / props.h);
  const s = dotMatrixState(props.frame, props, film);
  const ref = useRef<HTMLCanvasElement>(null);
  const cw = props.w / cols;
  const ch = props.h / rows;
  const rr = (props.r ?? DOT_MATRIX.r) * u;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!grid || s.dots <= 0 || s.phase === 'before') return;
    ctx.globalAlpha = s.dots;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!dotOn(c, r, cols, rows, s, props)) continue;
        const g = grid[r * cols + c];
        ctx.fillStyle = `rgb(${g[0]}, ${g[1]}, ${g[2]})`;
        ctx.beginPath();
        ctx.arc((c + 0.5) * cw, (r + 0.5) * ch, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  if (s.phase === 'before') return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)` }}>
      {s.solid > 0 ? <Img src={props.src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: s.solid }} /> : null}
      {s.phase !== 'done' ? <canvas ref={ref} width={Math.round(props.w)} height={Math.round(props.h)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : null}
    </div>
  );
};

/** The mask grows on twos: a stepped run from the first cluster to the end of growth. */
export const declares = (p?: Partial<DotMatrixProps>, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.at === undefined) return none;
  const fr = dotMatrixFrames(p as DotMatrixProps, film);
  return { ...none, stepped: [{ from: p.at, to: fr.grown + 1, id: p.id ?? 'dot-matrix' }] };
};

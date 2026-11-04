import React from 'react';
import { clamp, E, type Ease, fd, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { rectsPath } from './deviceUtil';
import { bayer8 } from './Gradients';

/**
 * Dither bands: the next scene dissolves in through a few wide rectangles that open from their own
 * centres, each born a little after the last, and whose edges are an ordered dither of small square
 * cells instead of a feather. A cell is either the old scene or the new one, never a mix, so the
 * hand-off reads as print or screen, not as a cross-fade, and it works on any two scenes (type, UI,
 * a colour field): no photo needed.
 *
 * Every frame is a new step of the pattern and a cell, once switched, stays switched; the share of the
 * frame that has switched follows `ease` exactly (cells are switched in a fixed seeded order: rectangles
 * first, their dithered rims after). declares() marks the run stepped and its last frame a wipe seam.
 *
 * House numbers: 16 f at 60 fps (0.27 s) on E.stdInOut, cells 10 px at 1080p (8-12 reads), 6 rectangles
 * 2.5-7 times wider than tall, born over the first 45 % of the run, a dithered rim 0.06 of the frame
 * height deep on every side. Put it where a scene of type hands over to a UI or a field; the old scene keeps still.
 */
export const DITHER_BANDS = { frames60: 16, cell: 10, boxes: 6, aspect: [2.5, 7] as [number, number], born: 0.45, soft: 0.06 } as const;

export type DitherBandsProps = {
  at: number; // first frame of the dissolve (local)
  frames?: number; // 60 fps frames (house 16)
  cell?: number; // px at 1080p (house 10)
  boxes?: number; // rectangles that open (house 6)
  aspect?: [number, number]; // width over height of the rectangles, seeded in this range (house 2.5-7)
  born?: number; // the rectangles are born over this share of the run (house 0.45; 0 = all at once)
  soft?: number; // depth of the dithered rim, share of the frame height (house 0.06; 0 = hard rectangles)
  ease?: Ease; // switched share over the run (house E.stdInOut)
  seed?: number | string;
  id?: string;
};

export type DitherRun = { x: number; y: number; w: number; h: number };

type Order = { cols: number; rows: number; rank: Int32Array };
const ORDERS = new Map<string, Order>();

/** The order cells switch in (rank per cell, row-major) for a grid and its props. Pure (memoised). */
export const ditherOrder = (cols: number, rows: number, p: Pick<DitherBandsProps, 'boxes' | 'aspect' | 'born' | 'soft' | 'seed'>): Order => {
  const seed = p.seed ?? 'bands';
  const nb = Math.max(1, Math.round(p.boxes ?? DITHER_BANDS.boxes));
  const [a0, a1] = p.aspect ?? DITHER_BANDS.aspect;
  const born = clamp(p.born ?? DITHER_BANDS.born);
  const soft = Math.max(0, p.soft ?? DITHER_BANDS.soft);
  const key = `${cols}x${rows}|${seed}|${nb}|${a0},${a1}|${born}|${soft}`;
  const hit = ORDERS.get(key);
  if (hit) return hit;
  // in frame heights: x across 0..cols/rows, y down 0..1
  const wide = cols / rows;
  const boxes = Array.from({ length: nb }, (_, k) => ({
    cx: (0.08 + 0.84 * rand(`${seed}:bx:${k}`)) * wide,
    cy: 0.1 + 0.8 * rand(`${seed}:by:${k}`),
    a: a0 + (a1 - a0) * rand(`${seed}:ba:${k}`),
    b: k === 0 ? 0 : born * (k / Math.max(1, nb - 1)) * (0.6 + 0.4 * rand(`${seed}:bb:${k}`)),
  }));
  const n = cols * rows;
  const t = new Float64Array(n);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / rows;
      const y = (r + 0.5) / rows;
      // a box at time T spans half-height T - b and half-width a (T - b); its rim is dithered over `soft`
      // (absolute, on every side): the cell is in once its distance outside the box is under soft x (2 bayer - 1)
      const s = soft * 2 * (bayer8(c, r) - 0.5);
      let d = Infinity;
      for (const bx of boxes) d = Math.min(d, bx.b + Math.max((Math.abs(x - bx.cx) - s) / bx.a, Math.abs(y - bx.cy) - s));
      t[r * cols + c] = d;
    }
  const idx = Array.from({ length: n }, (_, i) => i).sort((i, j) => t[i] - t[j] || i - j);
  const rank = new Int32Array(n);
  idx.forEach((cell, k) => (rank[cell] = k));
  const out = { cols, rows, rank };
  ORDERS.set(key, out);
  return out;
};

/** The switched cells at frame f, merged per row into runs (px), and the share switched. Pure, whole frames. */
export const ditherBandsState = (frame: number, p: DitherBandsProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const cell = Math.max(1, (p.cell ?? DITHER_BANDS.cell) * uOf(film));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const frames = Math.max(1, f60x(p.frames ?? DITHER_BANDS.frames60, fps));
  const F = fd(frame);
  const q = clamp((F - p.at) / frames);
  const share = F < p.at ? 0 : (p.ease ?? E.stdInOut)(q);
  const n = cols * rows;
  const count = Math.round(share * n);
  const runs: DitherRun[] = [];
  if (count > 0 && count < n) {
    const { rank } = ditherOrder(cols, rows, p);
    for (let r = 0; r < rows; r++) {
      let run: DitherRun | null = null;
      for (let c = 0; c < cols; c++) {
        if (rank[r * cols + c] >= count) {
          run = null;
          continue;
        }
        if (run) run.w += cell;
        else runs.push((run = { x: c * cell, y: r * cell, w: cell, h: cell }));
      }
    }
  }
  return { share: count / n, count, cells: n, cols, rows, cell, runs, done: count >= n, active: F >= p.at };
};

/** Sync: the first frame, the frame the new scene is whole (a seam; a texture runs between). */
export const ditherBandsFrames = (p: DitherBandsProps, film?: Partial<FilmCtx>) => ({ start: p.at, end: Math.ceil(p.at + f60x(p.frames ?? DITHER_BANDS.frames60, fpsOf(film))) });

/** Renders the dissolve: `outgoing` under `incoming`, which shows only through the switched cells. `frame` is local. */
export const DitherBands: React.FC<DitherBandsProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = ditherBandsState(props.frame, props, film);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {!s.done && props.outgoing}
      {s.count > 0 && <div style={{ position: 'absolute', inset: 0, clipPath: s.done ? undefined : `path('${rectsPath(s.runs)}')` }}>{props.incoming}</div>}
    </div>
  );
};

/** Each frame of the dissolve is a designed step (one sample, no shutter blur across it); the new scene is whole on a wipe seam. */
export const declares = (p?: Partial<DitherBandsProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = ditherBandsFrames(p as DitherBandsProps, film);
  const id = p.id ?? 'dither-bands';
  return { stepped: [{ from: fr.start, to: fr.end + 1, id }], flashes: [], cameraBlur: [], seams: [{ at: fr.end, kind: 'wipe', id }] };
};

import React from 'react';
import { clamp, fd, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import { FONT } from '../brand/tokens';
import { irregularOnsets } from './deviceUtil';
import { type RGB, useImageGrid } from './Cascade';
import type { Declares } from '../timeline';

/**
 * AsciiField: a short string of symbols repeats in a grid that fills the panel, turns into character columns
 * (column by column, seeded), and resolves into an object drawn in characters (a picture's luminance through a
 * glyph ramp) that keeps flickering like a dither: a few cells swap to their neighbours on the ramp on an
 * irregular beat (every 3-8 f at 60 fps). Settles in 63 f.
 *
 * Pure state (asciiState, asciiCell); <AsciiField> renders monospace rows (one text node per row), the picture's
 * grid sampled once from `src` (Cascade's useImageGrid) or passed as `grid`.
 */

/** House numbers: frames at 60 fps after `at`. */
export const ASCII = { cols: 64, rows: 30, ramp: ' .:-=+*#%@', symbols: '+-/x', columns60: 22, image60: 44, settle60: 63, flicker60: [3, 8] as [number, number], flickerShare: 0.05 } as const;

export type AsciiProps = {
  at: number; // the symbol tile fills the panel
  cols?: number;
  rows?: number;
  symbols?: string; // the repeating string (house '+-/x')
  ramp?: string; // dark to light (house ' .:-=+*#%@')
  columns?: number; // 60 fps frames after `at` when the columns start (house 22)
  image?: number; // ... when the picture starts to resolve (house 44); settled by 63
  flicker?: false | { every?: [number, number]; share?: number; seed?: string | number };
  invert?: boolean; // light picture on a dark ground: dense glyphs for the light (house true)
  id?: string;
};

export type AsciiStage = 'off' | 'tile' | 'columns' | 'image';

/** The stage, the share of columns turned, the share of the picture resolved and the flicker variant at frame f. Pure. */
export const asciiState = (frame: number, p: AsciiProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const F = fd(frame);
  const c0 = p.at + f60x(p.columns ?? ASCII.columns60, fps);
  const i0 = p.at + f60x(p.image ?? ASCII.image60, fps);
  const settle = p.at + f60x(ASCII.settle60, fps);
  let variant = 0;
  if (p.flicker !== false) {
    const fl = p.flicker ?? {};
    const on = irregularOnsets(Math.round(i0), 200, fl.every ?? ASCII.flicker60, fl.seed ?? 'ascii', fps);
    variant = on.filter((o) => o <= F).length;
  }
  const stage: AsciiStage = F < p.at ? 'off' : F < c0 ? 'tile' : F < i0 ? 'columns' : 'image';
  return { stage, columns: clamp((F - c0) / Math.max(1, i0 - c0)), resolve: clamp((F - i0) / Math.max(1, settle - i0)), variant, settled: F >= settle };
};

/** The character of cell (c, r) at frame f, given the picture's luminance there (0..1). Pure. */
export const asciiCell = (c: number, r: number, lum: number, s: ReturnType<typeof asciiState>, p: AsciiProps): string => {
  const sym = p.symbols ?? ASCII.symbols;
  const ramp = p.ramp ?? ASCII.ramp;
  const cols = p.cols ?? ASCII.cols;
  const seed = p.flicker === false ? 'ascii' : (p.flicker?.seed ?? 'ascii');
  if (s.stage === 'off') return ' ';
  const tileCh = sym[(c + 2 * r) % sym.length];
  const colOrder = rand(`${seed}:col:${c}`);
  const colCh = sym[Math.floor(rand(`${seed}:colch:${c}`) * sym.length)];
  if (s.stage === 'tile') return tileCh;
  if (s.stage === 'columns') return colOrder < s.columns ? colCh : tileCh;
  // the picture resolves in a seeded order; cells not yet resolved keep their column character
  if (rand(`${seed}:res:${c}:${r}`) > s.resolve && s.resolve < 1) return colCh;
  const l = (p.invert ?? true) ? lum : 1 - lum;
  let k = Math.min(ramp.length - 1, Math.max(0, Math.round(l * (ramp.length - 1))));
  if (s.variant > 0 && rand(`${seed}:fl:${s.variant}:${c + r * cols}`) < (p.flicker === false ? 0 : (p.flicker?.share ?? ASCII.flickerShare))) k = Math.max(0, Math.min(ramp.length - 1, k + (rand(`${seed}:fd:${s.variant}:${c}:${r}`) < 0.5 ? -1 : 1)));
  return ramp[k];
};

/** Sync: the tile (a typing burst), the columns, the picture (a riser to its settle), each flicker step (soft ticks). */
export const asciiFrames = (p: AsciiProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  return { tile: p.at, columns: Math.round(p.at + f60x(p.columns ?? ASCII.columns60, fps)), image: Math.round(p.at + f60x(p.image ?? ASCII.image60, fps)), settled: Math.ceil(p.at + f60x(ASCII.settle60, fps)) };
};

/** Draws the field in a box (x, y, w, h) as monospace rows in `color`; the cells are w / cols wide. */
export const AsciiField: React.FC<AsciiProps & { frame: number; x: number; y: number; w: number; h: number; color: string; src?: string; grid?: RGB[]; weight?: number }> = (props) => {
  const film = useFilm();
  const cols = props.cols ?? ASCII.cols;
  const rows = props.rows ?? ASCII.rows;
  const sampled = useImageGrid(props.grid ? undefined : props.src, cols, rows, props.w / props.h);
  const grid = props.grid ?? sampled;
  const s = asciiState(props.frame, props, film);
  if (s.stage === 'off') return null;
  const cw = props.w / cols;
  const lh = props.h / rows;
  const lines = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const px = grid?.[r * cols + c];
      const lum = px ? (0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255 : 0.5;
      return asciiCell(c, r, lum, s, props);
    }).join(''),
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.w, height: props.h, transform: `translate(${props.x}px, ${props.y}px)`, overflow: 'hidden', fontFamily: FONT.mono, fontSize: cw / 0.6, fontWeight: props.weight ?? 400, lineHeight: `${lh}px`, color: props.color, whiteSpace: 'pre', letterSpacing: 0 }} aria-hidden>
      {lines.map((ln, r) => (
        <div key={r} style={{ height: lh }}>{ln}</div>
      ))}
    </div>
  );
};

/** The field changes character on frames (tile, columns, flicker): its span is stepped. */
export const declares = (p?: Partial<AsciiProps> & { until?: number }, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = asciiFrames(p as AsciiProps, film);
  return { stepped: [{ from: p.at, to: p.until ?? fr.settled + 1, id: p.id ?? 'ascii' }], flashes: [], cameraBlur: [], seams: [] };
};

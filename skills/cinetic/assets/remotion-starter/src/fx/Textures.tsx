import React, { useLayoutEffect, useRef, useState } from 'react';
import { Img, useDelayRender } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { bakeGrain, bayer8, GRADIENTS, grainFrame, ign } from './Gradients';
import { hash01 } from './plates';

/**
 * Textures: grain and ordered dither as the picture's surface, and dither as a hand-off between pictures.
 *
 *   Grain        monochrome film grain over everything under it: a baked tile (mid-grey plus triangular noise of
 *                `sigma` levels) in overlay blend, re-seeded at 24 fps whatever the film's rate (a 60 fps film
 *                holds each grain 2-3 frames, as film does), offset per grain frame so the tile never repeats
 *   DitherPhoto  a photo printed in 2-4 inks through an ordered (Bayer 8x8) or blue-noise dither on a `cell` px
 *                grid, which develops into the true photo through the same threshold pattern: a soft front
 *                (`soft` share) travels along `angle` (or out from a point) and every cell turns on its own
 *                threshold, so the edge is a dither, not a blur; with `srcB` it dissolves one photo into the next
 *
 * Pure state: grainState(), ditherPhotoState(), inkIndex() and cellShowsB(). The develop is continuous; a
 * dither `crawl` (the pattern stepping) is declared stepped, and so is grain in a film faster than its 24 fps.
 */

export const TEXTURES = { grain: { sigma: 6, size: 256, tiles: 16 }, dither: { cell: 2, dur60: 44, soft: 0.35 } } as const;

/** House inks for the print look: the brand's ink, the accent and paper. */
export const INKS_NIGHT = [C.ink, C.accent, C.paper] as const;

// ---------------------------------------------------------------------------------------------------- grain
/** The grain frame, its tile index and its offset (px) at film frame f. Pure. */
export const grainState = (f: number, film: Partial<FilmCtx>, gfps: number = GRADIENTS.grainFps, size: number = TEXTURES.grain.size) => {
  const g = grainFrame(f, fpsOf(film), gfps);
  return { g, tile: g % TEXTURES.grain.tiles, dx: Math.floor(hash01(g, 1, 71) * size), dy: Math.floor(hash01(g, 2, 73) * size) };
};

export const Grain: React.FC<{ frame: number; sigma?: number; fps?: number; opacity?: number; blend?: React.CSSProperties['mixBlendMode'] }> = (p) => {
  const film = useFilm();
  const size = TEXTURES.grain.size;
  const s = grainState(p.frame, film, p.fps, size);
  const tile = bakeGrain(size, p.sigma ?? TEXTURES.grain.sigma, s.tile);
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${tile})`, backgroundPosition: `${s.dx}px ${s.dy}px`, mixBlendMode: p.blend ?? 'overlay', opacity: p.opacity ?? 1, pointerEvents: 'none' }} />;
};

// ---------------------------------------------------------------------------------------------------- dither photo
export type DitherPhotoProps = {
  src: string;
  srcB?: string; // dissolve into this photo instead of developing `src`
  x: number;
  y: number;
  w: number;
  h: number;
  cell?: number; // px per dither cell (2)
  inks?: readonly string[]; // 2-4 inks, dark to light
  kind?: 'ordered' | 'blue';
  at?: number; // develop start (no `at`: the ink look holds)
  dur60?: number;
  soft?: number; // the front's width, share of the travel
  angle?: number; // front direction, degrees (0 = left to right)
  from?: [number, number]; // a radial front from this point (shares of the box) instead of `angle`
  ease?: Ease;
  crawl60?: number; // the pattern steps every n 60 fps frames (a living print); 0 = still
};

/** Develop progress at frame f: 0 = all ink (or all A), 1 = the true photo (or all B). Pure. */
export const ditherPhotoState = (f: number, p: Pick<DitherPhotoProps, 'at' | 'dur60' | 'ease'>, film: Partial<FilmCtx>) => {
  if (p.at === undefined) return { t: 0 };
  const fps = fpsOf(film);
  return { t: (p.ease ?? E.stdInOut)(clamp((f - p.at) / f60x(p.dur60 ?? TEXTURES.dither.dur60, fps))) };
};

/** The cell's dither threshold (0..1): Bayer 8x8 or blue noise, shifted by the crawl step. Pure. */
export const cellThreshold = (i: number, j: number, kind: 'ordered' | 'blue' = 'ordered', step = 0) => (kind === 'ordered' ? bayer8(i + 3 * step, j + 5 * step) : ign(i, j, step));

/** Ink index for a luma (0..1) at cell (i, j): ordered dither over n inks. Pure. */
export const inkIndex = (luma: number, n: number, th: number) => Math.max(0, Math.min(n - 1, Math.floor(luma * (n - 1) + th)));

/** Does cell (i, j) of a cols x rows grid show the developed picture at progress t? Pure. */
export const cellShowsB = (i: number, j: number, cols: number, rows: number, t: number, th: number, o: { soft?: number; angle?: number; from?: [number, number] } = {}) => {
  if (t <= 0) return false;
  if (t >= 1) return true;
  const soft = o.soft ?? TEXTURES.dither.soft;
  const ux = (i + 0.5) / cols;
  const uy = (j + 0.5) / rows;
  let g: number;
  if (o.from) g = Math.hypot(ux - o.from[0], (uy - o.from[1]) * (rows / cols)) / Math.hypot(Math.max(o.from[0], 1 - o.from[0]), Math.max(o.from[1], 1 - o.from[1]) * (rows / cols));
  else {
    const a = ((o.angle ?? 0) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const lo = Math.min(0, c) + Math.min(0, s);
    const hi = Math.max(0, c) + Math.max(0, s);
    g = (ux * c + uy * s - lo) / (hi - lo);
  }
  const local = clamp((t * (1 + soft) - g) / soft);
  return th < local;
};

/** A picture sampled once at cols x rows (object-fit cover to `aspect`) as RGBA bytes; holds the render until loaded. */
export const usePixels = (src: string | undefined, cols: number, rows: number, aspect: number): Uint8ClampedArray | null => {
  const { delayRender, continueRender } = useDelayRender();
  const [px, setPx] = useState<Uint8ClampedArray | null>(null);
  const [handle] = useState(() => (src ? delayRender(`Textures pixels ${src}`) : null));
  useLayoutEffect(() => {
    if (!src || handle === null) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = cols;
      cv.height = rows;
      const ctx = cv.getContext('2d');
      if (ctx) {
        const ia = img.naturalWidth / img.naturalHeight;
        const [sw, sh] = ia > aspect ? [img.naturalHeight * aspect, img.naturalHeight] : [img.naturalWidth, img.naturalWidth / aspect];
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
        setPx(ctx.getImageData(0, 0, cols, rows).data);
      }
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = src;
  }, [src, cols, rows, aspect, handle, continueRender]);
  return px;
};

const inkRgb = (inks: readonly string[]) =>
  inks.map((c) => {
    const h = c.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  });

export const DitherPhoto: React.FC<DitherPhotoProps & { frame: number }> = (p) => {
  const film = useFilm();
  const ref = useRef<HTMLCanvasElement>(null);
  const cell = Math.max(1, p.cell ?? TEXTURES.dither.cell);
  const cols = Math.max(2, Math.round(p.w / cell));
  const rows = Math.max(2, Math.round(p.h / cell));
  const a = usePixels(p.src, cols, rows, p.w / p.h);
  const { t } = ditherPhotoState(p.frame, p, film);
  const step = p.crawl60 ? Math.floor(p.frame / f60x(p.crawl60, fpsOf(film))) : 0;
  const inks = inkRgb(p.inks ?? INKS_NIGHT);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !a) return;
    const img = ctx.createImageData(cols, rows);
    const d = img.data;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        const th = cellThreshold(i, j, p.kind, step);
        if (cellShowsB(i, j, cols, rows, t, th, p)) continue; // transparent: the photo underneath shows
        if (p.srcB) {
          d[k] = a[k];
          d[k + 1] = a[k + 1];
          d[k + 2] = a[k + 2];
        } else {
          const luma = (0.2126 * a[k] + 0.7152 * a[k + 1] + 0.0722 * a[k + 2]) / 255;
          const c = inks[inkIndex(luma, inks.length, th)];
          d[k] = c[0];
          d[k + 1] = c[1];
          d[k + 2] = c[2];
        }
        d[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, overflow: 'hidden' }}>
      {t > 0 ? <Img src={p.srcB ?? p.src} style={{ position: 'absolute', inset: 0, width: p.w, height: p.h, objectFit: 'cover' }} /> : null}
      {t < 1 ? <canvas ref={ref} width={cols} height={rows} style={{ position: 'absolute', inset: 0, width: p.w, height: p.h, imageRendering: 'pixelated' }} /> : null}
    </div>
  );
};

/**
 * A crawling dither steps on its own cadence: declared stepped over `span` [from, to). The develop itself is
 * continuous. Grain re-seeds at its own rate (24 fps, Grain's `fps`): in a faster film each grain holds 2-3 frames,
 * so `grain` (the frames the Grain layer is on screen, and its rate if not 24) is declared stepped too.
 */
export const declares = (
  p?: { crawl60?: number; span?: [number, number]; id?: string; grain?: { span: [number, number]; fps?: number; id?: string } },
  film?: Partial<FilmCtx>,
): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!(p?.crawl60 && p.span) && !p?.grain) return none;
  const fps = fpsOf(film);
  const stepped: NonNullable<Declares['stepped']> = [];
  if (p.crawl60 && p.span) stepped.push({ from: p.span[0], to: p.span[1], id: p.id ?? 'dither-crawl' });
  if (p.grain && fps > (p.grain.fps ?? GRADIENTS.grainFps)) stepped.push({ from: p.grain.span[0], to: p.grain.span[1], id: p.grain.id ?? 'grain' });
  return { ...none, stepped };
};

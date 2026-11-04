// pixel-assemble: a grid of square tiles assembles the product. A wave crosses the product's box from its focus point:
// each tile lands (from 55 % of its size, snapping out), flashes in the accent (two tones of the one hue) and clears to
// its piece of the product's scene; the gaps close and the corners square off until the tiles are one whole screen, and
// the scene's surroundings come in with it. The product is built in front of the viewer, tile by tile.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, frameOf, hash01, k60, padBox, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080): tile size and gap, the wave's crossing, a tile's landing and flash, the gaps closing. */
export const PIXEL = { cell: 76, gap: 7, radius: 10, from: 0.55, wave: 46, jitter: 6, land: 16, flash: 14, close: 20, pad: 0.04, around: 18 } as const;

export const RECIPE: Recipe = {
  id: 'pixel-assemble',
  recipe:
    'A grid of square tiles assembles the product: a wave crosses the product box from its focus point (46 f), each tile lands from 55 % of its size (snapOut, 16 f), flashes in two tones of the accent and clears to its piece of the scene (14 f); the 7 px gaps close and the corners square off (20 f) until the tiles are one screen, and the scene around it comes in.',
  params: { ...PIXEL },
};

export type PixelCell = { x: number; y: number; s: number; onset: number };
/** The tiles over the box (film px) and each one's onset (frames after the wave starts), nearest the origin first. */
export const pixelCells = (box: Box, origin: { x: number; y: number }, seed: number, film?: Partial<FilmCtx>, o: Params<typeof PIXEL> = {}): PixelCell[] => {
  const P = { ...PIXEL, ...o };
  const { u } = frameOf(film);
  const k = k60(film);
  const s = P.cell * u;
  const cols = Math.max(1, Math.ceil(box.w / s));
  const rows = Math.max(1, Math.ceil(box.h / s));
  const x0 = box.x + (box.w - cols * s) / 2;
  const y0 = box.y + (box.h - rows * s) / 2;
  const cells: PixelCell[] = [];
  let far = 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) far = Math.max(far, Math.hypot(x0 + (c + 0.5) * s - origin.x, y0 + (r + 0.5) * s - origin.y));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * s;
      const y = y0 + r * s;
      const d = Math.hypot(x + s / 2 - origin.x, y + s / 2 - origin.y) / far;
      cells.push({ x, y, s, onset: (P.wave * d ** 0.85 + P.jitter * hash01(seed, r * 97 + c)) * k });
    }
  return cells.sort((a, b) => a.onset - b.onset);
};

/** The state at frame t after the wave starts: each tile's scale and flash, the gap and radius, and the scene around. */
export const pixelState = (t: number, cells: PixelCell[], film?: Partial<FilmCtx>, o: Params<typeof PIXEL> = {}) => {
  const P = { ...PIXEL, ...o };
  const k = k60(film);
  const last = cells.length ? cells[cells.length - 1].onset : 0;
  const closeAt = last + P.land * k;
  const close = E.strongInOut(clamp((t - closeAt) / (P.close * k)));
  return {
    tiles: cells.map((c) => {
      const p = clamp((t - c.onset) / (P.land * k));
      return { on: t >= c.onset, scale: mix(P.from, 1, E.snapOut(p)), flash: 1 - E.softOut(clamp((t - c.onset - 3 * k) / (P.flash * k))) };
    }),
    close,
    whole: t >= closeAt + P.close * k,
    around: E.softOut(clamp((t - closeAt) / (P.around * k))),
    end: closeAt + P.close * k,
  };
};

/** The device: the scene assembled tile by tile over its focus box, from `start` (+ 2 f). */
export const PixelAssemble: React.FC<PictureProps & { params?: Params<typeof PIXEL> }> = ({ f, start = 0, pal, seed = 1, scene, focus, uid = 'px', params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...PIXEL, ...params };
  const box = padBox(focus ?? { x: W * 0.22, y: H * 0.16, w: W * 0.56, h: H * 0.68 }, P.pad);
  const origin = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const cells = pixelCells(box, origin, seed, film, P);
  const t = f - start - 2 * k60(film);
  const st = pixelState(t, cells, film, P);
  const node = scene(f);
  const id = `pixel-${uid}`;
  const gap = (P.gap * u * (1 - st.close)) / 2;
  const rad = P.radius * u * (1 - st.close);
  const tone = (i: number) => (hash01(seed + 7, i) < 0.68 ? pal.accent : mixColor(pal.accent, pal.dark ? '#ffffff' : pal.type, 0.22));
  if (st.whole) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {cells.map((c, i) => {
              const s = st.tiles[i];
              if (!s.on) return null;
              const cx = c.x + c.s / 2;
              const cy = c.y + c.s / 2;
              const half = (c.s / 2 - gap) * s.scale + (st.close > 0 ? 0.6 : 0);
              return <rect key={i} x={cx - half} y={cy - half} width={half * 2} height={half * 2} rx={rad * s.scale} />;
            })}
          </clipPath>
        </defs>
      </svg>
      {/* the scene's surroundings (shadows, the ground's objects) come in under the tiles as they close (a copy the
          layout audit leaves out); the tiles stay opaque on top, so nothing dips through a cross-fade */}
      {st.around > 0 && (
        <div data-audit-copy="" style={{ position: 'absolute', inset: 0, opacity: st.around }}>
          {node}
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, clipPath: `url(#${id})` }}>{node}</div>
      {cells.map((c, i) => {
        const s = st.tiles[i];
        if (!s.on || s.flash <= 0.002) return null;
        const half = (c.s / 2 - gap) * s.scale;
        return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: half * 2, height: half * 2, borderRadius: rad * s.scale, background: tone(i), opacity: s.flash, transform: `translate3d(${(c.x + c.s / 2 - half).toFixed(2)}px, ${(c.y + c.s / 2 - half).toFixed(2)}px, 0)` }} />;
      })}
    </div>
  );
};

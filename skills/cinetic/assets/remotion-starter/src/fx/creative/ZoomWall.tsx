// zoom-wall: one tile becomes the whole wall. The product fills the frame; the camera pulls back on one long move (a
// log-scale zoom on a strong in-out) and the picture turns out to be one tile in a wall of them, each the product at
// another moment (another state, another person's use), all facing the camera; it lands on the wall and holds. Many,
// shown at once: the scale of the product told without a word.
import React from 'react';
import { clamp, E } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { face, frameOf, hash01, k60, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080): where the pull-back ends (scale), its share of the beat, the grid, gap and corner. */
export const WALL = { to: 0.27, span: 0.58, min: 40, cols: 5, rows: 5, gap: 20, radius: 22, spread: 1.6 } as const;

export const RECIPE: Recipe = {
  id: 'zoom-wall',
  recipe:
    'One tile becomes the whole wall: the product fills the frame, then the camera pulls back on one log-scale strongInOut (58 % of the beat, at least 40 f) to x0.27, and the picture turns out to be the centre tile of a 5 x 5 wall, every tile the product at another moment (seeded offsets), 20 px gaps, 22 px corners, all facing the camera; it lands and holds.',
  params: { ...WALL },
};

/** The camera's scale at frame t (1 to WALL.to on a log scale) and the share of the move. */
export const wallState = (t: number, dur: number, film?: Partial<FilmCtx>, o: Params<typeof WALL> = {}) => {
  const P = { ...WALL, ...o };
  const k = k60(film);
  const span = Math.max(P.min * k, dur * P.span);
  const e = E.strongInOut(clamp((t - 4 * k) / span));
  return { e, scale: Math.exp(Math.log(P.to) * e), landed: e >= 1 };
};

export const ZoomWall: React.FC<PictureProps & { params?: Params<typeof WALL> }> = ({ f, dur, start = 0, pal, seed = 1, scene, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...WALL, ...params };
  const st = wallState(f - start, dur - start, film, P);
  const S = st.scale;
  // on screen: the gap and the corner grow in with the move (the first frame is the product alone, edge to edge)
  const gap = (P.gap * u * st.e) / S;
  const r = (P.radius * u * st.e) / S;
  const tiles: React.ReactNode[] = [];
  const c0 = Math.floor(P.cols / 2);
  const r0 = Math.floor(P.rows / 2);
  for (let row = 0; row < P.rows; row++)
    for (let col = 0; col < P.cols; col++) {
      const dx = (col - c0) * (W + gap);
      const dy = (row - r0) * (H + gap);
      // cull the tiles the frame never shows at this scale
      const sx = W / 2 + (dx - W / 2) * S;
      const sy = H / 2 + (dy - H / 2) * S;
      if (sx > W || sy > H || sx + W * S < 0 || sy + H * S < 0) continue;
      const centre = col === c0 && row === r0;
      const off = centre ? 0 : Math.round((hash01(seed, row * 31 + col) - 0.3) * dur * P.spread);
      tiles.push(
        <div key={`${row}-${col}`} data-audit-copy={centre ? undefined : ''} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, borderRadius: r, overflow: 'hidden', background: mixColor(pal.ground, pal.dark ? pal.surface : '#ffffff', 0.55 * st.e), ...(st.e > 0 ? { boxShadow: face(pal.surface, pal, u / S).boxShadow } : {}), transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)` }}>
          {scene(f + off)}
        </div>,
      );
    }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${S.toFixed(5)})` }}>{tiles}</div>
    </div>
  );
};

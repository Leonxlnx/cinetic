// TileFlood (turn, join): isometric diamond tiles spawn from the frame's edges (one corner first, the opposite one a
// few frames later), multiply into a ragged checker and thicken until the next scene is the frame; objects on a
// `front` layer stay on top throughout.
// Numbers: tiles 1/12 of the width, 0.58 as tall; 30 f; each tile pops on its frame (no tween); a third of the
// threshold is random, so lone tiles land well ahead of the front.
// Caution: keep the subject on `front` (the tiles flood the world behind it); a flood with nothing carried reads as a wipe.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix, rand } from '../../motion';
import { type Scenes, sp } from './_shared';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const cornerXY = (c: Corner, W: number, H: number) => [c.endsWith('left') ? 0 : W, c.startsWith('top') ? 0 : H] as const;

/**
 * TileFlood: an isometric checker flood. The tiles are the rhombi of an isometric lattice (they tile the plane with no
 * gap); each gets a threshold from its distance to the nearest spawning corner (each corner may start later: `delays`,
 * a share of the move) mixed with a seeded random share (`rag`), and pops to the next scene once the clock passes it. The
 * clock eases in (slow spawn, then the checker thickens fast); the last frame covers every tile. `front` stays above.
 * Measured: first tiles at the bottom-left, the top-right 5 f later, ragged checker by f20, solid by f38.
 */
export const TileFlood: React.FC<
  Scenes & {
    /** Layer kept sharp above the flood (the objects that stay). */
    front?: React.ReactNode;
    dur?: number;
    /** Tiles across the width, and their height over width (0.58: true isometric). */
    tiles?: number;
    aspect?: number;
    /** The corners the flood spawns from, and when each starts (a share of the move). */
    corners?: Corner[];
    delays?: number[];
    rag?: number;
    seed?: number;
  }
> = ({ from, to, front, at: start, speed = 1, dur = 30, tiles = 12, aspect = 0.58, corners = ['bottom-left', 'top-right'], delays = [0, 0.15], rag = 0.38, seed = 7 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}{front}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}{front}</AbsoluteFill>;
  const tw = W / tiles;
  const th = tw * aspect;
  const diag = Math.hypot(W, H);
  const t = (frame - start + 1) / D;
  const clock = mix(Math.pow(t, 1.6), 0, 1.0001);
  // every tile's distance to its nearest spawning corner (with that corner's delay), normalised by the largest, so the
  // flood spends the whole move filling the frame and lands on its last frame
  const rows = Math.ceil(H / (th / 2)) + 2;
  const cellsList: Array<[number, number, number, number]> = [];
  let farthest = 0;
  for (let j = -1; j < rows; j++) {
    const cy = (j * th) / 2;
    const shift = j % 2 ? tw / 2 : 0;
    for (let i = -1; i <= tiles + 1; i++) {
      const cx = i * tw + shift;
      if (cx < -tw / 2 || cx > W + tw / 2) continue;
      let near = Infinity;
      corners.forEach((c, n) => {
        const [x, y] = cornerXY(c, W, H);
        const dl = delays[n] ?? 0;
        near = Math.min(near, dl + (1 - dl) * (Math.hypot(cx - x, cy - y) / diag));
      });
      farthest = Math.max(farthest, near);
      cellsList.push([cx, cy, near, rand(i * 13.7 + j * 5.3 + seed)]);
    }
  }
  let d = '';
  for (const [cx, cy, near, r] of cellsList) {
    const thr = (near / Math.max(1e-6, farthest)) * (1 - rag) + rag * r;
    if (thr >= clock) continue;
    d += `M${cx.toFixed(1)} ${(cy - th / 2 - 0.4).toFixed(1)}L${(cx + tw / 2 + 0.4).toFixed(1)} ${cy.toFixed(1)}L${cx.toFixed(1)} ${(cy + th / 2 + 0.4).toFixed(1)}L${(cx - tw / 2 - 0.4).toFixed(1)} ${cy.toFixed(1)}Z`;
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: d ? `path('${d}')` : 'inset(100%)' }}>{to}</AbsoluteFill>
      {front}
    </AbsoluteFill>
  );
};

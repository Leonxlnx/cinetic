// HairlineGrid (ground, build / idle): a white canvas ruled by 1 px hairlines that grow out of the centre crossing,
// tiny marks at the crossings, and a few accent blocks that hop from cell to cell by cuts.
// Numbers: lines #E5E5E5 at 1 px, cells 13 % of the height (a layout grid) or 3 % (graph paper); the centre lines
// first, each next line 2 f later, 16 f each; blocks fill one cell and hop to a neighbour every 6 f.
// Caution: the structure must stay quiet (about 10 % contrast); one accent, used as a mark, never as decoration.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { gridLines, hair, HairlineSvg, lineReveal, unit } from './_shared';

/** Where block b sits after k hops: a seeded walk over neighbouring cells that keeps out of the clear box. */
const walk = (b: number, k: number, seed: number, nx: number, ny: number, clear: { cx: number; cy: number }) => {
  const free = (x: number, y: number) => Math.abs(x) <= nx && Math.abs(y) <= ny && !(Math.abs(x + 0.5) < clear.cx + 0.5 && Math.abs(y + 0.5) < clear.cy + 0.5);
  let x = Math.round((rand(seed + b * 13) * 2 - 1) * nx);
  let y = Math.round((rand(seed + b * 29) * 2 - 1) * ny);
  for (let t = 0; !free(x, y) && t < 40; t++) {
    x = Math.round((rand(seed + b * 13 + t * 7) * 2 - 1) * nx);
    y = Math.round((rand(seed + b * 29 + t * 11) * 2 - 1) * ny);
  }
  for (let i = 0; i < k; i++) {
    const order = Math.floor(rand(seed * 3 + b * 101 + i * 17) * 4);
    for (let o = 0; o < 4; o++) {
      const dir = (order + o) % 4;
      const nxp = x + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
      const nyp = y + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
      if (free(nxp, nyp)) {
        x = nxp;
        y = nyp;
        break;
      }
    }
  }
  return { x, y };
};

/**
 * HairlineGrid: a ruled canvas. The grid is centred on the frame (a crossing at the centre) and drawn from there; it
 * can drift like a canvas under a camera. `blocks` accent squares fill single cells and hop by cuts, keeping out of a
 * `clear` box round the centre (in cells) where the type or the card sits.
 */
export const HairlineGrid: React.FC<{
  at?: number;
  /** Frames each line takes to grow (16). */
  dur?: number;
  ground?: string;
  /** The hairline colour. */
  color?: string;
  /** Cell size as a share of the frame height (0.13 a layout grid; 0.028 graph paper). */
  cell?: number;
  /** Dash length in px at 1080 (0: solid lines). */
  dash?: number;
  marks?: 'none' | 'diamond' | 'dot' | 'cross';
  markColor?: string;
  /** Drift in cells a second, [x, y]. */
  drift?: [number, number];
  /** Accent blocks that hop from cell to cell (0: none). */
  blocks?: number;
  accent?: string;
  /** Frames between hops (6). */
  step?: number;
  /** Half-size in cells of the box round the centre the blocks keep out of. */
  clear?: [number, number];
  seed?: number;
}> = ({ at = 0, dur = 16, ground = '#FFFFFF', color = '#E5E5E5', cell = 0.13, dash = 0, marks = 'diamond', markColor, drift = [0, 0], blocks = 0, accent = '#2A4BF2', step = 6, clear = [2, 1], seed = 1 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const u = unit(Math.min(W, H));
  const c = cell * H;
  const ox = (drift[0] * c * f) / fps;
  const oy = (drift[1] * c * f) / fps;
  const lines = gridLines(W, H, c, ox, oy);
  const lw = hair(u);
  const mc = markColor || color;
  const vs = lines.filter((l) => l.kind === 'v');
  const hs = lines.filter((l) => l.kind === 'h');
  const ms = 4 * u;
  const blockStart = at + dur + 4;
  const nx = Math.ceil(W / c / 2);
  const ny = Math.ceil(H / c / 2);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <HairlineSvg w={W} h={H} lines={lines} color={color} width={lw} dash={dash * u} reveal={(l) => lineReveal(f, at, l.index, dur)} />
      {marks !== 'none' && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {vs.flatMap((v) =>
            hs.map((h) => {
              const p = Math.min(lineReveal(f, at, v.index, dur), lineReveal(f, at, h.index, dur));
              if (p < 0.98) return null;
              const k = `${v.index}:${h.index}`;
              if (marks === 'dot') return <circle key={k} cx={v.pos} cy={h.pos} r={ms * 0.55} fill={mc} />;
              if (marks === 'cross') return <path key={k} d={`M${v.pos - ms * 1.6} ${h.pos}H${v.pos + ms * 1.6}M${v.pos} ${h.pos - ms * 1.6}V${h.pos + ms * 1.6}`} stroke={mc} strokeWidth={lw * 1.5} />;
              return <path key={k} d={`M${v.pos} ${h.pos - ms}L${v.pos + ms} ${h.pos}L${v.pos} ${h.pos + ms}L${v.pos - ms} ${h.pos}Z`} fill={mc} />;
            }),
          )}
        </svg>
      )}
      {blocks > 0 && f >= blockStart && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: blocks }, (_, b) => {
            // each block hops on its own beat, so the hops never all land together
            const k = Math.floor((f - blockStart + Math.floor(rand(seed + b * 7) * step)) / step);
            const p = walk(b, k, seed, nx, ny, { cx: clear[0], cy: clear[1] });
            const x = W / 2 + (((ox % c) + c) % c) + p.x * c;
            const y = H / 2 + (((oy % c) + c) % c) + p.y * c;
            return <rect key={b} x={x} y={y} width={c} height={c} fill={accent} shapeRendering="crispEdges" />;
          })}
        </svg>
      )}
    </AbsoluteFill>
  );
};

// BlockBurst (turn, join): square cells burst out of an object in a diamond until the next scene fills the frame;
// from an edge, a staircase.
// Numbers: 60 px cells; the front reaches the farthest corner in 14 f, the last cells 5 f later; outlines hold 2 f;
// scouts 1-2 f ahead.
// Caution: the outline colour should be one the film already uses, never a new one.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { across, frontDist, type Origin, type Scenes, sp } from './_shared';

/**
 * BlockBurst: square cells burst out of an object (or eat in from an edge in a staircase) until the next scene fills the
 * frame. Cells arrive half size and step to full two frames later (no ramp: digital), scattered single cells run a frame
 * or two ahead of the front, and some cells arrive as an outline first.
 * Measured: 58-60 px cells; the diamond front moves ~0.8 cells a frame and covers 1080p in ~12 f, the corners fill by
 * ~16 f; outlines hold 2-3 f.
 */
export const BlockBurst: React.FC<
  Scenes & {
    /** A point (the object's centre) for a burst, or an edge for a staircase eat. */
    origin?: Origin;
    cell?: number;
    /** Frames for the front to reach the farthest corner. */
    reach?: number;
    /** Colour of the outline cells. */
    edge?: string;
    /** The common name for `edge`. */
    color?: string;
    outlines?: number;
    seed?: number;
  }
> = ({ from, to, at: start, speed = 1, origin: originIn, cell = 60, reach = 14, edge: edgeIn, color, outlines = 0.07, seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  // a burst from the frame's centre by default, in a composition of any size
  const origin = originIn ?? { x: W / 2, y: H / 2 };
  const edge = edgeIn ?? color ?? '#0B0B0C';
  const RE = sp(reach, speed);
  const end = start + RE + 5;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill>{to}</AbsoluteFill>;
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  let d = '';
  const marks: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * cell;
      const cy = (j + 0.5) * cell;
      const h = rand(i * 13.1 + j * 71.3 + seed);
      const h2 = rand(i * 3.7 + j * 17.9 + seed * 2.3);
      const stair = typeof origin === 'string' ? Math.abs(across(origin, cx, cy, W, H) - 0.5) * 0.45 : 0;
      const dist = frontDist(origin, cx, cy, W, H, 'diamond') + stair;
      const a = start + Math.round(RE * (dist / (1 + (typeof origin === 'string' ? 0.225 : 0))) + h * 2);
      const age = frame - a;
      let s = 0;
      if (age >= 2) s = cell + 1;
      else if (age >= 0) s = cell * 0.62;
      else if (age >= -2 && h2 < 0.3) s = cell * 0.4; // a scout ahead of the front
      if (s <= 0) continue;
      d += `M${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h${(-s).toFixed(1)}Z`;
      if (h2 > 1 - outlines && age >= 0 && age < 2)
        marks.push(<div key={`${i}-${j}`} style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s, boxSizing: 'border-box', border: `${Math.max(3, cell * 0.07)}px solid ${edge}` }} />);
    }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: d ? `path('${d}')` : 'inset(100%)' }}>{to}</AbsoluteFill>
      {marks.length > 0 && <AbsoluteFill>{marks}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

export const blockBurstEnd = (at: number, o: { reach?: number; speed?: number } = {}) => at + sp(o.reach ?? 14, o.speed) + 5;

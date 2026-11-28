// CornerHunt (fx, idle): a viewfinder hunting round a phrase: tiny solid squares at the corners of an invisible box, 1-4
// of them on each frame, the box jumping between three sizes, never tweened, like a selection that cannot settle.
// Numbers: squares 2.2 % of the frame's short side (about half the phrase's type size); a new state
// every 2 f (on twos); three boxes round a phrase 18 % of the frame wide: tight (1.4x
// its width, 3.8x its height), wide (4.1x by 5.1x) and middle (2.6x by 5.1x); 1-4 corners lit, seeded.
// Caution: a technical, nervous texture for one phrase while it holds; it stops (or settles on all four) when the phrase
// is done, never around running text.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { onTwos, rand } from '../../motion';

/**
 * CornerHunt: corners of a box round (`x`, `y`) sized `w` x `h` (the phrase's box), hunting from `at` until `until`,
 * then settled on all four corners of the first (tight) box (or gone with `settle={false}`).
 */
export const CornerHunt: React.FC<{
  at: number;
  until?: number;
  w: number;
  h: number;
  x?: number;
  y?: number;
  /** The boxes it jumps between, as [width, height] multipliers of the phrase's box. */
  boxes?: Array<[number, number]>;
  size?: number;
  color?: string;
  /** Frames a state is held. */
  n?: number;
  settle?: boolean;
  seed?: number;
}> = ({ at, until, w, h, x, y, boxes = [[1.4, 3.8], [4.1, 5.1], [2.6, 5.1]], size, color = '#111215', n = 2, settle = true, seed = 4 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (frame < at) return null;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const s = size ?? Math.max(6, Math.round(Math.min(W, H) * 0.022));
  const done = until !== undefined && frame >= until;
  if (done && !settle) return null;
  const k = onTwos(frame - at, Math.max(1, n));
  const box = done ? boxes[0] : boxes[Math.floor(rand(seed * 17 + k * 3) * boxes.length)];
  const count = done ? 4 : 1 + Math.floor(rand(seed * 29 + k * 5) * 4);
  // which corners: a seeded shuffle of the four, the first `count` lit
  const order = [0, 1, 2, 3].sort((a, b) => rand(seed * 41 + k * 7 + a) - rand(seed * 41 + k * 7 + b));
  const lit = done ? [0, 1, 2, 3] : order.slice(0, count);
  const bw = w * box[0];
  const bh = h * box[1];
  const corners = [
    [cx - bw / 2, cy - bh / 2],
    [cx + bw / 2, cy - bh / 2],
    [cx + bw / 2, cy + bh / 2],
    [cx - bw / 2, cy + bh / 2],
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {lit.map((i) => (
        <div key={i} style={{ position: 'absolute', left: Math.round(corners[i][0] - s / 2), top: Math.round(corners[i][1] - s / 2), width: s, height: s, background: color }} />
      ))}
    </AbsoluteFill>
  );
};

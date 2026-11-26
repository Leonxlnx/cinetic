// DealtStack (object, build / emphasis): a rounded photo card sits in the gap of a line; every few frames a new photo is
// dealt on top of it, breaking through in square blocks, each card stepping up and to the right with a small turn, so a
// fanned stack grows between the words and pushes them apart.
// Numbers: deals at 8, 12, 16, 19, 23 f after the first card (compressing); each deal a 2 f block dissolve (blocks 2.2 %
// of the card's width, seeded order); each card 1.3 % W right, 1.1 % H up and 2.5 degrees on from the last; the stack
// scales 1 to 1.22 linearly over 24 f; card 23 % W x 45 % H, radius 6 % of its width.
// Caution: the cards are pictures, not text; keep the words beside the stack short (one word each side).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, mix } from '../../motion';
import { fonts } from '../../fonts';
import { softShadow } from '../../world';
import { PicTile, rnd } from './_shared';

/** The blocks of a w x h card that are on at progress p (0..1), as one clip-path. */
const blockClip = (w: number, h: number, cell: number, p: number, seed: number) => {
  if (p >= 1) return undefined;
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  let d = '';
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (rnd(seed, i * 131 + j, 2) >= p) continue;
      const x = i * cell;
      const y = j * cell;
      d += `M${x} ${y}h${cell + 0.5}v${cell + 0.5}h${-cell - 0.5}z`;
    }
  return d ? `path('${d}')` : 'inset(50%)';
};

export const DealtStack: React.FC<{
  pics: string[];
  at?: number;
  /** Frames after `at` at which each card after the first is dealt. */
  deals?: number[];
  /** Words left and right of the stack (empty: none). */
  before?: string;
  after?: string;
  ink?: string;
  /** Text size in px (default 3.2 % of the frame's height). */
  size?: number;
  /** Card size as shares of the frame (width of W, height of H). */
  card?: { w: number; h: number };
  ground?: string;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ pics, at = 0, deals = [8, 12, 16, 19, 23], before = '', after = '', ink = '#141519', size, card = { w: 0.23, h: 0.45 }, ground = '#FFFFFF', seed = 5, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const t = f - at;
  const cw = W * card.w;
  const chh = H * card.h;
  const grow = 1 + 0.22 * clamp(t / 24);
  const times = [0, ...deals];
  const n = times.filter((d) => t >= d).length;
  const step = { x: W * 0.013, y: -H * 0.011, r: 2.5 };
  // the stack's footprint: the cards' spread plus the turn, for the words to hug
  const spread = (n - 1) * step.x;
  const halfW = ((cw + spread) / 2) * grow + cw * 0.06;
  const ts = size ?? H * 0.032;
  const word: React.CSSProperties = { position: 'absolute', top: cy, transform: 'translateY(-50%)', fontFamily: fonts.inter, fontSize: ts, fontWeight: 450, color: ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' };
  const cards: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const age = t - times[k];
    const p = k === 0 ? 1 : clamp((age + 1) / 2);
    const clip = blockClip(cw, chh, cw * 0.022, p, seed + k);
    const ox = (k - (n - 1) / 2) * step.x;
    const oy = (k - (n - 1) / 2) * step.y;
    const rot = (k - (n - 1) / 2) * step.r + (rnd(seed, k, 3) - 0.5) * 1.5;
    cards.push(
      <div key={k} style={{ position: 'absolute', left: -cw / 2, top: -chh / 2, width: cw, height: chh, transform: `translate(${ox}px, ${oy}px) rotate(${rot}deg)`, zIndex: k }}>
        <div style={{ position: 'absolute', inset: 0, clipPath: clip, borderRadius: cw * 0.06, boxShadow: softShadow(2, ground) }}>
          <PicTile src={pics[k % pics.length]} w={cw} h={chh} r={cw * 0.06} pos={`${30 + rnd(seed, k, 4) * 40}% 40%`} />
        </div>
      </div>,
    );
  }
  return (
    <AbsoluteFill>
      {before && <div style={{ ...word, right: W - cx + halfW + ts * 1.2 }}>{before}</div>}
      {after && <div style={{ ...word, left: cx + halfW + ts * 1.2 }}>{after}</div>}
      <div style={{ position: 'absolute', left: cx, top: cy, transform: `scale(${mix(1, grow, 1)})` }}>{cards}</div>
    </AbsoluteFill>
  );
};

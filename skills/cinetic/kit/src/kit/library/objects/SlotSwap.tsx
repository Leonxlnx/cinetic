// SlotSwap (object, emphasis): between two words a picture card cuts to the next picture every few frames, faster and
// faster, each a different size and shape, and the words hug every new card on the same frame, so the line breathes
// round the pictures; the last picture holds.
// Numbers: cuts 7, 6, 6, 5, 5, 4, 4, 4 f apart (accelerating), no slide and no fade; each card 18-30 % of H tall and
// 0.7-1.5 times as wide, radius 4 % of its height, a soft shadow; the words 3 % of H, 0.6 em from the card.
// Caution: the pictures are the proof of the line (the work, the products, the people); one word each side.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { softShadow } from '../../world';
import { PicTile, cropOf, rnd } from './_shared';

export const SlotSwap: React.FC<{
  pics: string[];
  at?: number;
  before?: string;
  after?: string;
  /** Frames between cuts (accelerating by default); the last picture holds. */
  gaps?: number[];
  ink?: string;
  ground?: string;
  size?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ pics, at = 0, before = '', after = '', gaps = [7, 6, 6, 5, 5, 4, 4, 4], ink = '#16181D', ground = '#F4F4F2', size, seed = 9, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  let k = 0;
  let acc = 0;
  while (k < gaps.length && t >= acc + gaps[k]) {
    acc += gaps[k];
    k++;
  }
  const h = H * (0.18 + rnd(seed, k, 1) * 0.12);
  const w = h * (0.7 + rnd(seed, k, 2) * 0.8);
  const ts = size ?? H * 0.03;
  const word: React.CSSProperties = { position: 'absolute', top: cy, transform: 'translateY(-50%)', fontFamily: fonts.inter, fontSize: ts, fontWeight: 480, color: ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' };
  const crop = cropOf(k, seed);
  return (
    <AbsoluteFill>
      {before && <div style={{ ...word, right: W - cx + w / 2 + ts * 0.6 }}>{before}</div>}
      <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: h * 0.04, boxShadow: softShadow(2, ground) }}>
        <PicTile src={pics[k % pics.length]} w={w} h={h} r={h * 0.04} pos={crop.pos} zoom={crop.zoom} />
      </div>
      {after && <div style={{ ...word, left: cx + w / 2 + ts * 0.6 }}>{after}</div>}
    </AbsoluteFill>
  );
};

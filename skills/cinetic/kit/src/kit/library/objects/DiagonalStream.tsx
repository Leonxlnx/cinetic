// DiagonalStream (object, idle / emphasis): two bands of rounded picture cards run along one diagonal, one above-left
// and one below-right of a centred word, at a steady speed (in opposite directions, or both one way), the cards near
// the frame's edge softened by a little blur, each card turned a few degrees.
// Numbers: the diagonal 35 degrees; bands 26 % of the short side either side of the centre; cards 21 % of the short side square, radius 12 %,
// overlapping 30 %; speed 0.5 % of W a frame (measured 0.3-1.5 %); cards within 15 % of the frame's edge blur up to
// 4 px; turns of +-4 degrees; `develop`: each card runs its first 18 % in the two-tone map, then turns true colour;
// `toCentre`: cards fade as they near the centre (streams flowing into a hub).
// Caution: keep the word between the bands short and on a plate of calm; the cards are texture, not things to read.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from '../../motion';
import { useUid } from '../_shared';
import { DuotoneFilter, PicTile, cropOf, rnd } from './_shared';

export const DiagonalStream: React.FC<{
  pics: string[];
  at?: number;
  /** The diagonal in degrees (positive rises to the right). */
  angle?: number;
  /** 'opposite': the bands run against each other; 'same': both run up the diagonal. */
  flow?: 'opposite' | 'same';
  /** Card side as a share of the short side. */
  card?: number;
  /** Distance of each band from the centre as a share of the short side. */
  offset?: number;
  /** Speed as a share of W a frame. */
  speed?: number;
  develop?: boolean;
  toCentre?: boolean;
  dark?: string;
  light?: string;
  seed?: number;
}> = ({ pics, at = 0, angle = 35, flow = 'opposite', card = 0.21, offset = 0.26, speed = 0.005, develop = false, toCentre = false, dark = '#6F6A9E', light = '#F7DCCF', seed = 8 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('diagstream');
  if (f < at) return null;
  const t = f - at;
  const a = (-angle * Math.PI) / 180;
  const u = { x: Math.cos(a), y: Math.sin(a) };
  const nrm = { x: -u.y, y: u.x };
  const s = card * Math.min(W, H);
  const pitch = s * 0.7;
  const L = Math.hypot(W, H) + s * 2;
  const n = Math.ceil(L / pitch);
  const len = n * pitch;
  const cards: React.ReactNode[] = [];
  [-1, 1].forEach((b, bi) => {
    const dir = flow === 'same' ? 1 : b;
    const ox = W / 2 + nrm.x * b * offset * Math.min(W, H);
    const oy = H / 2 + nrm.y * b * offset * Math.min(W, H);
    for (let j = 0; j < n; j++) {
      const travel = speed * W * t * dir;
      const sPos = (((j * pitch + travel + bi * pitch * 0.5) % len) + len) % len - len / 2;
      const k = j + bi * 100;
      const px = ox + u.x * sPos;
      const py = oy + u.y * sPos;
      // which lap of the stream this card is on (for the develop: a card that wraps is a new card)
      const lap = Math.floor((j * pitch + travel + bi * pitch * 0.5) / len);
      const edge = Math.min(px, W - px, py, H - py);
      const blur = clamp(1 - (edge + s * 0.3) / (Math.min(W, H) * 0.15)) * 4;
      const dc = Math.hypot(px - W / 2, py - H / 2);
      const op = toCentre ? clamp((dc - H * 0.18) / (H * 0.22)) : 1;
      if (op <= 0 || px < -s || px > W + s || py < -s || py > H + s) continue;
      // develop: two-tone while the card is in the first part of its run across
      const run = (sPos * dir + len / 2) / (len * 0.18);
      const tone = develop ? clamp(1 - run) : 0;
      const crop = cropOf(Math.abs(k + lap * 7), seed);
      cards.push(
        <PicTile key={k} src={pics[(((k + lap) % pics.length) + pics.length) % pics.length]} w={s} h={s} r={s * 0.12} tone={tone} filterId={id} pos={crop.pos} zoom={crop.zoom}
          style={{ left: 0, top: 0, transform: `translate(${px - s / 2}px, ${py - s / 2}px) rotate(${(rnd(seed, k, 9) - 0.5) * 8}deg)`, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined, opacity: op, zIndex: bi * 1000 + j }} />,
      );
    }
  });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {develop && <DuotoneFilter id={id} dark={dark} light={light} />}
      {cards}
    </AbsoluteFill>
  );
};

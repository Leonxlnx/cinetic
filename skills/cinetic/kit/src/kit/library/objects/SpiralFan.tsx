// SpiralFan (object, build): a square shrinks and tips; the cards hidden under it fan out like a deck, first in a tight
// turning cluster, then along a spiral arm, the whole cloud spinning clockwise and growing until the cards ride a wide
// spiral round the centre, where a line can sit.
// Numbers: the square shrinks 100 to 55 % and turns 12 degrees on 0-3 f; the cards fan on 3-9 f (a tight cluster), the
// spiral opens on 8-19 f (radius to 46 % of H, expo out) and keeps growing 0.3 % a frame; the cloud turns 130 degrees
// by 19 f, then 0.6 degrees a frame; 1.6 turns of the arm; cards 7.5 % of H, from 80 % at the centre to 110 % outside,
// each along the arm with a seeded tilt.
// Caution: give it 24-40 cards of one family (tiles, covers, icons); the centre stays empty for one short line.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { rnd } from './_shared';

export const SpiralFan: React.FC<{
  /** The cards (drawn centred in a square `card` box); repeated to `count`. */
  cards: React.ReactNode[];
  at?: number;
  count?: number;
  /** The square the cards come from. */
  color?: string;
  /** Card side as a share of H. */
  card?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ cards, at = 0, count = 32, color = '#EE5A2A', card = 0.075, seed = 7, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const c = card * H;
  if (t < 3) {
    const p = ease.out(clamp(t / 3));
    const s = c * 1.8 * mix(p, 1, 0.55);
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s, background: color, transform: `rotate(${mix(p, 0, 12)}deg)` }} />
      </AbsoluteFill>
    );
  }
  const fan = ease.out(clamp((t - 3) / 6));
  const open = ease.out(clamp((t - 8) / 11));
  const R = (mix(open, 0.07, 0.56) + Math.max(0, t - 19) * 0.003) * H;
  const spin = (ease.out(clamp((t - 3) / 16)) * 130 + Math.max(0, t - 19) * 0.6) * (Math.PI / 180);
  const turns = mix(open, 0.35, 1.6);
  const items: React.ReactNode[] = [];
  for (let k = count - 1; k >= 0; k--) {
    const s0 = (k + 1) / count;
    const s = s0 * mix(fan, 0.2, 1);
    const a = spin + s * turns * Math.PI * 2;
    // the arm starts half way out once it opens, so the centre stays clear for a line
    const r = R * (mix(open, 0, 0.5) + mix(open, 1, 0.5) * s);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    const rot = (a * 180) / Math.PI + 90 + (rnd(seed, k, 1) - 0.5) * 30;
    const sz = c * mix(s0, 0.8, 1.1);
    items.push(
      <div key={k} style={{ position: 'absolute', left: px - sz / 2, top: py - sz / 2, width: sz, height: sz, transform: `rotate(${rot.toFixed(2)}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: count - k }}>
        <div style={{ width: c, height: c, transform: `scale(${sz / c})`, flexShrink: 0 }}>{cards[k % cards.length]}</div>
      </div>,
    );
  }
  return <AbsoluteFill>{items}</AbsoluteFill>;
};

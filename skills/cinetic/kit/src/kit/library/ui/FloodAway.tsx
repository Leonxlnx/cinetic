// FloodAway (ui, exit): the cards scattered round a line flood one by one with a saturated colour and go out of
// focus, then blow away outward, the outer ones first, turning edge-on as they go.
// Numbers: each card floods in 3 f (colour 0 to 0.94, blur 0 to 16 px), 1-3 f apart in `order`; the blow-away starts at
// `blowAt` (16 f), outer cards first, 1 f apart: 12 f ease-in, 0.28 of the frame width outward, turning 80 degrees
// about its vertical axis, a smear growing with its speed.
// Caution: it clears a frame of many cards to leave one line; the cards must already be there (built before), and the
// line beside them stays sharp.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, ease, mix } from '../../motion';
import { useUiFrame } from './_shared';

export type FloodCard = { node: React.ReactNode; x: number; y: number; w: number; h: number; rot?: number };

export const FloodAway: React.FC<{
  cards: FloodCard[];
  at: number;
  /** The flood colour. */
  color: string;
  /** The order the cards flood in (indices); default as given. */
  order?: number[];
  gaps?: number[];
  blowAt?: number;
  /** The point they blow away from, as shares of the frame (default the centre). */
  cx?: number;
  cy?: number;
  /** The cards' corner radius as a share of their height (the flood takes the same corners). */
  radius?: number;
}> = ({ cards, at: start, color, order, gaps = [2, 1, 1, 3, 1, 1, 1, 3], blowAt = 16, cx = 0.5, cy = 0.5, radius = 0.22 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useUiFrame();
  const ord = order ?? cards.map((_, i) => i);
  const T: number[] = new Array(cards.length).fill(start);
  let t = start;
  ord.forEach((idx, k) => {
    T[idx] = t;
    t += gaps[Math.min(k, gaps.length - 1)];
  });
  // outer cards leave first
  const dist = cards.map((c) => Math.hypot((c.x - cx) * W, (c.y - cy) * H));
  const byDist = cards.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);
  const leave: number[] = new Array(cards.length);
  byDist.forEach((idx, k) => (leave[idx] = start + blowAt + k));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, perspective: 1400 }}>
      {cards.map((c, i) => {
        const fl = at(frame, T[i], 3, ease.out);
        const go = at(frame, leave[i], 12, ease.in);
        if (go >= 1) return null;
        const goPrev = at(frame - 1, leave[i], 12, ease.in);
        const dx = (c.x - cx) * W;
        const dy = (c.y - cy) * H;
        const len = Math.hypot(dx, dy) || 1;
        const travel = W * 0.28;
        const ox = (dx / len) * travel * go;
        const oy = (dy / len) * travel * go;
        const v = (go - goPrev) * travel;
        const blur = mix(fl, 0, 16) + v * 0.12;
        const w = c.w * W;
        const h = c.h * H;
        return (
          <div key={i} style={{ position: 'absolute', left: c.x * W - w / 2 + ox, top: c.y * H - h / 2 + oy, width: w, height: h, transform: `rotate(${c.rot ?? 0}deg) rotateY(${(dx >= 0 ? 1 : -1) * go * 80}deg)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
            {c.node}
            <div style={{ position: 'absolute', inset: 0, borderRadius: h * radius, background: `linear-gradient(170deg, ${color}, ${color} 55%, rgba(0,0,0,0.12))`, opacity: fl * 0.94 }} />
          </div>
        );
      })}
    </div>
  );
};

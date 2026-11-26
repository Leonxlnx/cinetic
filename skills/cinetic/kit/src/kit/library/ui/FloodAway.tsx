// FloodAway (ui, exit): the cards scattered round a line flood one by one with a saturated colour, keeping their
// shape and corners, sink back a little, then blow away outward, the outer ones first, turning edge-on as they go.
// Numbers: each card floods in 3 f (colour 0 to 0.94, a lit top edge, the card's own corners; no defocus), 1-3 f apart
// in `order`, sinking to 0.96 of its size; the blow-away starts at `blowAt` (6 f; never before a card has flooded),
// outer cards first, 1 f apart: 12 f quadratic ease-in (moving from its first frame), 0.28 of the frame width
// outward, turning 80 degrees about its vertical axis, a motion blur of at most 4 px only while it moves fast. A card
// is flooded for 3-8 f before it moves.
// Caution: it clears a frame of many cards to leave one line; the cards must already be there (built before), and the
// line beside them stays sharp. Each card's node must fill its w x h box (give it width and height 100 %), and
// `radius` must match the card's own corner (share of its height), so the flood covers exactly the card.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { useUiFrame } from './_shared';

// a quadratic ease-in: the cards move from their first frame of leaving (an expo-in read as a hold)
const blowIn = (t: number) => t * t;

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
}> = ({ cards, at: start, color, order, gaps = [2, 1, 1, 3, 1, 1, 1, 3], blowAt = 6, cx = 0.5, cy = 0.5, radius = 0.22 }) => {
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
  byDist.forEach((idx, k) => (leave[idx] = Math.max(start + blowAt + k, T[idx] + 3)));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, perspective: 1400 }}>
      {cards.map((c, i) => {
        const fl = at(frame, T[i], 3, ease.out);
        const go = at(frame, leave[i], 12, blowIn);
        if (go >= 1) return null;
        const goPrev = at(frame - 1, leave[i], 12, blowIn);
        const dx = (c.x - cx) * W;
        const dy = (c.y - cy) * H;
        const len = Math.hypot(dx, dy) || 1;
        const travel = W * 0.28;
        const ox = (dx / len) * travel * go;
        const oy = (dy / len) * travel * go;
        const v = (go - goPrev) * travel;
        const blur = Math.min(4, Math.max(0, v - 12) * 0.08);
        const sink = mix(fl, 1, 0.96);
        const w = c.w * W;
        const h = c.h * H;
        return (
          <div key={i} style={{ position: 'absolute', left: c.x * W - w / 2 + ox, top: c.y * H - h / 2 + oy, width: w, height: h, transform: `rotate(${c.rot ?? 0}deg) rotateY(${(dx >= 0 ? 1 : -1) * go * 80}deg) scale(${sink})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
            <div style={{ position: 'absolute', inset: 0 }}>{c.node}</div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: h * radius, overflow: 'hidden', background: `linear-gradient(172deg, ${mixColor(color, '#FFFFFF', 0.12)}, ${color} 48%, ${mixColor(color, '#000000', 0.14)})`, boxShadow: `inset 0 1px 0 ${mixColor(color, '#FFFFFF', 0.45)}`, opacity: fl * 0.94 }} />
          </div>
        );
      })}
    </div>
  );
};

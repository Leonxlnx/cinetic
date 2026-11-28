// CollapsePill (turn, join): the chosen row loses its content into a soft slab, which collapses (height far faster
// than width) into a small pill at its next place; the pill sharpens and its label arrives while the scene behind
// changes under the blur.
// Numbers: 9 f; content blurs out in 3 f; the slab drops 10 % and then collapses in 3 f (height on expo out, width
// on quad out), blur 10 px peaking in the collapse, colour blending to the pill's; label from f7.
// Caution: the pill must be what the row became (its job running, its result); its colour one the film already uses.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix } from '../../motion';
import { mixLab } from '../../world';
import { t01 } from '../_shared';
import { type Scenes, sp, type TurnBox } from './_shared';

/**
 * CollapsePill: a row (a comment, a list item, a search result) becomes a pill (a status, a progress, a button). `from`
 * and `to` are the two scenes WITHOUT the row and the pill: the piece draws them. The row (`row`, laid out at `a`'s size)
 * blurs away into its own surface in 3 f, the slab sinks a little, then collapses on two clocks (height fast, width slower)
 * to `b`, travelling there and turning `b.color` under a soft blur that peaks in the collapse (no frame shows a hard
 * colour change); the pill sharpens and `pill` (its label, laid out at `b`'s size) arrives. Behind it `from` blurs and
 * dims away over the first 5 f and `to` comes up under the blur; after the turn the piece keeps drawing the pill on `to`.
 * Measured: row 0.24 x 0.06 of the frame into a pill 0.09 x 0.025 lower down in about 9 f; sharp on f7.
 */
export const CollapsePill: React.FC<
  Scenes & {
    a: TurnBox & { color: string };
    b: TurnBox & { color: string };
    row: React.ReactNode;
    pill: React.ReactNode;
    dur?: number;
    /** Most blur on the slab, px at a 1080 frame. */
    blur?: number;
    shadow?: string;
  }
> = ({ from, to, at: start, speed = 1, a, b, row, pill, dur = 9, blur = 10, shadow }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const D = sp(dur, speed);
  const k = frame - start;
  const drawPill = (bx: TurnBox & { color: string }, content: React.ReactNode, labelOp: number, bl: number, col: string) => (
    <div style={{ position: 'absolute', left: bx.x - bx.w / 2, top: bx.y - bx.h / 2, width: bx.w, height: bx.h, borderRadius: bx.r ?? bx.h / 2, background: col, boxShadow: shadow, filter: bl > 0.3 ? `blur(${bl}px)` : undefined, overflow: 'hidden' }}>
      {content && <div style={{ position: 'absolute', inset: 0, opacity: labelOp }}>{content}</div>}
    </div>
  );
  if (frame < start) return <AbsoluteFill>{from}{drawPill(a, row, 1, 0, a.color)}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}{drawPill(b, pill, 1, 0, b.color)}</AbsoluteFill>;
  const f3 = sp(3, speed);
  // phase 1 (3 f): the row's content blurs into its surface
  const c = t01(frame, start, f3);
  // phase 2: sink 10 % of the row's height, then collapse to b over the next 3 f
  const s = t01(frame, start + f3, sp(1, speed));
  const q = t01(frame, start + f3 + sp(1, speed), f3);
  const hP = ease.out(q);
  const wP = 1 - (1 - q) * (1 - q);
  const box = { x: mix(q, a.x, b.x), y: mix(q, a.y + a.h * 0.1 * s, b.y), w: mix(wP, a.w, b.w), h: mix(hP, a.h, b.h), r: mix(hP, a.r ?? 0, b.r ?? b.h / 2), color: '' };
  // the colour turns over five frames, from the sink to the end of the collapse, under the blur (never in one frame)
  const col = mixLab(a.color, b.color, t01(frame, start + f3 - sp(1, speed), sp(5, speed)));
  // blur: up through phase 1, peaking in the collapse, clear by the end
  const sharp = t01(frame, start + 2 * f3 + sp(1, speed), Math.max(1, D - 2 * f3 - sp(1, speed)));
  const bl = blur * u * Math.min(1, c * 0.6 + q) * (1 - sharp);
  const back = ease.inOut(t01(frame, start, sp(5, speed)));
  return (
    <AbsoluteFill>
      <AbsoluteFill>{to}</AbsoluteFill>
      {back < 1 && <AbsoluteFill style={{ opacity: 1 - back, filter: `blur(${14 * u * back}px)` }}>{from}</AbsoluteFill>}
      {q < 1
        ? drawPill(box, <div style={{ width: a.w, height: a.h, filter: `blur(${12 * u * c}px)`, opacity: 1 - c }}>{row}</div>, 1, bl, col)
        : drawPill(b, pill, ease.out(sharp), bl, b.color)}
    </AbsoluteFill>
  );
};

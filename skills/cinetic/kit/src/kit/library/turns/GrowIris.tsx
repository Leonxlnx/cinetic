// GrowIris (turn, join): a circle, rounded box or ellipse grows out of an object until it is the next scene, which
// settles from smaller inside.
// Numbers: 6 f from the object to the corners (34, 49, 59, 79, 100 %); the scene inside goes 0.58 to 1 on expo out; a
// 6 px soft edge.
// Caution: start it where the object really is; content far from the opening point leaves an almost empty plate.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';
import { type Scenes, sp } from './_shared';

/** Smallest radius at which a shape centred at (x, y) covers the whole W x H frame. */
const coverRadius = (x: number, y: number, W: number, H: number, aspect = 1) => {
  const dx = Math.max(x, W - x);
  const dy = Math.max(y, H - y);
  return Math.sqrt(dx * dx + (dy / aspect) * (dy / aspect));
};

/**
 * GrowIris: a shape grows out of an object on screen until it IS the next scene, and it covers every corner on its last
 * frame (the radius is solved for the farthest corner, not guessed). Inside it, the next scene settles from smaller, so the
 * opening reads as a camera pushing through. Shapes: circle, ellipse (a letter's counter), rounded (a card or a button).
 * Measured: from the object's size to the corners in 6 f; radius 0.34, 0.49, 0.59, 0.79, 1 of the way on f1-5; the scene
 * inside from 0.58 to 1 (expo out); a 6 px soft edge.
 */
export const GrowIris: React.FC<
  Scenes & {
    x: number;
    y: number;
    /** The object's size: a radius for circle and ellipse, a box for rounded. */
    r0?: number;
    box?: { w: number; h: number; r: number };
    shape?: 'circle' | 'ellipse' | 'rounded';
    /** Height over width of an ellipse. */
    aspect?: number;
    dur?: number;
    soft?: number;
    /** Scale of the next scene inside the shape at the start. */
    inner?: number;
    /** A rim on the opening edge (the object's own outline colour), fading as it grows. */
    rim?: string;
    /** The common name for `rim`. */
    color?: string;
  }
> = ({ from, to, at: start, speed = 1, x, y, r0 = 120, box, shape = 'circle', aspect = 1.25, dur = 6, soft = 6, inner = 0.58, rim: rimIn, color }) => {
  const rim = rimIn ?? color;
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const t = t01(frame, start, D);
  const p = 1 - Math.pow(1 - t, 1.35);
  const s = mix(ease.out(t), inner, 1);
  const scene = <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${s})` }}>{to}</AbsoluteFill>;
  let win: React.ReactNode;
  if (shape === 'rounded') {
    const b = box ?? { w: r0 * 2, h: r0 * 2, r: r0 * 0.3 };
    const R = b.r;
    // grow each edge to the frame edge plus the corner radius, so the rounded corners sit outside the frame at the end
    const l = mix(p, x - b.w / 2, -R - soft);
    const rr = mix(p, x + b.w / 2, W + R + soft);
    const tp = mix(p, y - b.h / 2, -R - soft);
    const bt = mix(p, y + b.h / 2, H + R + soft);
    win = (
      <div style={{ position: 'absolute', left: l, top: tp, width: rr - l, height: bt - tp, borderRadius: R, overflow: 'hidden', boxShadow: rim ? `inset 0 0 0 ${mix(p, 4, 1)}px ${rim}` : undefined }}>
        <div style={{ position: 'absolute', left: -l, top: -tp, width: W, height: H }}>{scene}</div>
      </div>
    );
  } else {
    const asp = shape === 'ellipse' ? aspect : 1;
    const R = coverRadius(x, y, W, H, asp) + soft + 2;
    const r = mix(p, r0, R);
    const mask = `radial-gradient(ellipse ${r}px ${r * asp}px at ${x}px ${y}px, #000 ${Math.max(0, 100 - (soft / r) * 100)}%, transparent 100%)`;
    win = (
      <>
        <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{scene}</AbsoluteFill>
        {rim && (
          <div style={{ position: 'absolute', left: x - r, top: y - r * asp, width: r * 2, height: r * 2 * asp, borderRadius: '50%', boxShadow: `0 0 0 ${mix(p, 5, 1)}px ${rim}`, opacity: 1 - p }} />
        )}
      </>
    );
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      {win}
    </AbsoluteFill>
  );
};

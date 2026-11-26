// CrossFall (turn, join): the old line dims, shrinks a little and softens in place while the next title falls in on top
// of it, huge and blurred, and settles sharp; both are on screen for about five frames.
// Numbers: the new title from 1.5x, 22 px blur and 30 % light to rest in 12 f (1 - (1 - t)^2.2), drifting in from 6 %
// to the side; the old line to 0.94x and 12 % over 3 f, gone on f5 (while the title is still soft).
// Caution: on a dark, flat ground with one line each; never let the old line rise or drift as it dims.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';
import { type Scenes, sp } from './_shared';

/**
 * CrossFall: a cross-over fall-in between two lines on one ground. `from` and `to` are the two lines' layers (no ground;
 * give `ground`). On `at` the next title arrives over the old one, large, blurred and dark, and settles to size, focus and
 * full light, coming in from `side` (a share of the width; negative: from the left); the old line stays in
 * place and recedes (smaller, dimmer, softer) and is gone on frame `hold`, so the two overlap only while the new one is
 * still soft. Measured: overlap 6-9 f; new title 12 f; old line 0.94x and about a third of its light.
 */
export const CrossFall: React.FC<
  Scenes & {
    ground?: string;
    dur?: number;
    /** Frames the old line stays under the new one. */
    hold?: number;
    /** The new title's first scale and blur (px at a 1080 frame). */
    scale?: number;
    blur?: number;
    /** Where the new title drifts in from, a share of the width (negative: from the left). */
    side?: number;
    /** The new title's centre (the point it grows from); default the frame's centre. */
    x?: number;
    y?: number;
  }
> = ({ from, to, at: start, speed = 1, ground, dur = 12, hold = 5, scale = 1.5, blur = 22, side = -0.06, x: xIn, y: yIn }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  const Hd = sp(hold, speed);
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  if (frame < start) return <AbsoluteFill style={{ background: ground }}>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill style={{ background: ground }}>{to}</AbsoluteFill>;
  // the title sharpens over most of the move (1 - (1 - t)^2.2: a third on its second frame), not in two frames
  const p = 1 - Math.pow(1 - t01(frame, start, D), 2.2);
  const o = ease.out(t01(frame, start, Math.max(1, Hd - 2)));
  const u = H / 1080;
  const b = blur * u * (1 - p);
  return (
    <AbsoluteFill style={{ background: ground }}>
      {frame < start + Hd && (
        <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${mix(o, 1, 0.94)})`, opacity: mix(o, 1, 0.12), filter: o > 0.05 ? `blur(${2.5 * u * o}px)` : undefined }}>{from}</AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          transformOrigin: `${x}px ${y}px`,
          transform: `translateX(${side * W * (1 - p)}px) scale(${mix(p, scale, 1)})`,
          filter: `${b > 0.3 ? `blur(${b}px) ` : ''}brightness(${mix(p, 0.3, 1)})`,
          opacity: Math.min(1, 0.4 + p),
        }}
      >
        {to}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

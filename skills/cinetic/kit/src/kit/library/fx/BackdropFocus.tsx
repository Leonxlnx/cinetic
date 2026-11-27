// BackdropFocus (fx, emphasis): when a toast, a dialog or a result arrives, the scene behind it grows a little, softens and
// dims, so the arrival sits sharp on top; at `outAt` the scene comes back into focus as the arrival leaves.
// Numbers: the scene goes 1x to 1.03x, blur to 8 px, dim to 30 % on a critically damped curve from rest (half-way at 0.3
// of `dur`, a long tail), then keeps a slow push (0.6 % a second, `push`) so the held frame never goes dead; the arrival from 0.94x and nothing to
// full over 8 f, starting 2 f after the scene; the way back 8 f.
// Caution: one arrival at a time, centred or near the centre; the scene must stay recognisable through the blur (it is the
// context of the message).
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix, settle } from '../../motion';

/**
 * BackdropFocus: `children` (the scene) soften behind `front` (the arrival, laid out full frame) from `at` over `dur`
 * frames, from rest, and keeps pushing in slowly while it waits (`push`, a share a second; 0 holds it still); from
 * `outAt` the arrival goes and the scene sharpens again.
 */
export const BackdropFocus: React.FC<{
  at: number;
  dur?: number;
  outAt?: number;
  blur?: number;
  dim?: number;
  grow?: number;
  /** The colour the scene dims toward. */
  ground?: string;
  /** The scene's slow push while the arrival is up, in log space a second (default 0.006; 0: a still hold). */
  push?: number;
  front: React.ReactNode;
  children: React.ReactNode;
}> = ({ at, dur = 10, outAt, blur = 8, dim = 0.3, grow = 0.03, ground = '#000000', push = 0.006, front, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const back = outAt === undefined ? 0 : ease.inOut(clamp((frame - outAt) / 8));
  const p = clamp(settle(frame, at, dur * 0.3)) * (1 - back);
  // the slow push while it waits: it grows with p, so it starts at rest and goes back with the scene
  const drift = 1 + (Math.exp((push * Math.max(0, frame - at)) / fps) - 1) * p;
  const q = ease.out(clamp((frame - at - 2) / 8)) * (1 - back);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${(1 + grow * p) * drift})`, filter: p > 0.02 ? `blur(${(blur * p).toFixed(2)}px)` : undefined }}>{children}</AbsoluteFill>
      {p > 0.01 && <AbsoluteFill style={{ background: ground, opacity: dim * p }} />}
      {q > 0.01 && <AbsoluteFill style={{ opacity: q, transform: `scale(${mix(q, 0.94, 1)})` }}>{front}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

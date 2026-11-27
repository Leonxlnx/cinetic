// DotIris (turn, join): a dot appears at one point of the old frame (the gap between two words, a button, a sparkle)
// and opens exponentially into the next scene, which is already playing inside it at its own scale.
// Numbers: 9 f from a 23 px dot (at 1080) to the corners, the radius x1.6 a frame (23, 46, 75, 115, 190, 294, 473,
// 808, cover); a 1.5 px edge; the old scene keeps moving under the edge.
// Caution: give it a real point (the gap, the button's centre); the first three frames read as a dot, not a turn.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { logScale, mix } from '../../motion';
import { type Scenes, sp } from './_shared';

/** Smallest radius at which a circle centred at (x, y) covers the whole W x H frame. */
const cover = (x: number, y: number, W: number, H: number) => Math.hypot(Math.max(x, W - x), Math.max(y, H - y));

/**
 * DotIris: the next scene opens out of a dot. The radius grows by a constant factor every frame (equal visual speed at
 * every size), so the opening reads first as a dot, then as a disc, then as the frame; it covers every corner on its
 * last frame. The next scene inside is drawn at its own scale (a window, not a zoom); `inner` below 1 adds a settle.
 * Measured: 9 f from 23 px (at a 1080 frame) to the corners; radius 23, 46, 75, 115, 190, 294, 473, 808 px, then cover.
 */
export const DotIris: React.FC<
  Scenes & {
    /** The opening point; default the frame's centre. */
    x?: number;
    y?: number;
    /** Frames from the dot to the corners (the last one covers). */
    dur?: number;
    /** The dot's first radius in px at a 1080 frame (scaled with the frame). */
    r0?: number;
    /** Scale of the next scene inside the disc at the start (1: a window onto it). */
    inner?: number;
    /** A thin ring on the disc's edge (a colour the film uses), fading as it opens. */
    color?: string;
    /** Softness of the edge in px. */
    soft?: number;
  }
> = ({ from, to, at: start, speed = 1, x: xIn, y: yIn, dur = 9, r0 = 23, inner = 1, color, soft = 1.5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const R = cover(x, y, W, H) + soft + 2;
  const a = Math.max(1, (r0 * Math.min(W, H)) / 1080);
  const k = frame - start;
  // constant ratio a frame: a on the first frame, R on the last
  const p = D > 1 ? k / (D - 1) : 1;
  const r = logScale(a, R, p);
  const s = mix(p, inner, 1);
  const stop = Math.max(0, 100 - (soft / r) * 100);
  const mask = `radial-gradient(circle ${r}px at ${x}px ${y}px, #000 ${stop}%, transparent 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, transform: s !== 1 ? `scale(${s})` : undefined }}>{to}</AbsoluteFill>
      </AbsoluteFill>
      {color && r < R * 0.7 && (
        <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', boxShadow: `0 0 0 ${Math.max(1, (2 * Math.min(W, H)) / 1080)}px ${color}`, opacity: 1 - p }} />
      )}
    </AbsoluteFill>
  );
};

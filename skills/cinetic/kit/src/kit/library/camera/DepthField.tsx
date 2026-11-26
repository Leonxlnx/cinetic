// DepthField (camera, enter, exit, idle): a field of things at different depths (chips, labels, cards, dots) that the
// camera moves through: they arrive from outside the frame large and close and shrink into place at their own speeds
// (a pull back through layers), drift apart slowly while held, and fly out past the frame edges when the camera pushes
// forward through them, the centre staying put.
// Numbers: arrival 20 f on an expo-out from 0.85 of the way to the camera; hold drift 1-2 px a frame scaled by depth;
// push 12-14 f on an ease-in through the farthest layer; things nearer than the focal plane blur (up to 10 px).
// Caution: 5-12 things, at three or more depths, never on a grid; the one thing that matters sits at the centre at depth 1
// and stays sharp.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease } from '../../motion';

export type DepthItem = {
  /** Place at rest, as a share of the frame (0..1 across, 0..1 down). */
  x: number;
  y: number;
  /** Distance from the camera at rest: 1 the focal plane, 2 twice as far (half size), 0.7 nearer. */
  depth: number;
  node: React.ReactNode;
  /** Kept at the centre and out of the camera move (the subject). */
  fixed?: boolean;
};

/**
 * DepthField: `items` in depth; the camera arrives (`at`, `dur`) from `near` of the way toward them, holds with a parallax
 * `drift` (px a frame at depth 1, across), and pushes through them from `pushAt` over `pushDur`.
 */
export const DepthField: React.FC<{
  items: DepthItem[];
  at: number;
  dur?: number;
  /** How far toward the field the camera starts (0..1 of the way to depth 1). */
  near?: number;
  drift?: number;
  pushAt?: number;
  pushDur?: number;
  /** Blur in px for a thing at twice the focal size. */
  blur?: number;
  style?: React.CSSProperties;
}> = ({ items, at, dur = 20, near = 0.85, drift = 1.2, pushAt, pushDur = 13, blur = 8, style }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const arrive = near * (1 - ease.out(clamp((frame - at) / dur)));
  // the push goes through the whole field: past the farthest thing
  const through = Math.max(...items.filter((it) => !it.fixed).map((it) => it.depth), 1) + 0.1;
  const push = pushAt === undefined ? 0 : through * ease.in(clamp((frame - pushAt) / pushDur));
  const cam = arrive + push;
  const held = Math.max(0, frame - at);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      {[...items]
        .map((it, i) => ({ it, i }))
        .sort((a, b) => b.it.depth - a.it.depth)
        .map(({ it, i }) => {
          if (it.fixed) {
            return (
              <div key={i} style={{ position: 'absolute', left: it.x * W, top: it.y * H, transform: 'translate(-50%, -50%)' }}>
                {it.node}
              </div>
            );
          }
          const dist = it.depth - cam;
          if (dist <= 0.06) return null;
          const s = 1 / dist;
          const dx = (it.x - 0.5) * W + (drift * held) / it.depth;
          const dy = (it.y - 0.5) * H;
          const b = Math.max(0, (s - 1.15) * blur * 0.8);
          return (
            <div key={i} style={{ position: 'absolute', left: W / 2 + dx * s, top: H / 2 + dy * s, transform: `translate(-50%, -50%) scale(${s})`, filter: b > 0.4 ? `blur(${Math.min(blur * 1.4, b).toFixed(2)}px)` : undefined, zIndex: Math.round(1000 / dist) }}>
              {it.node}
            </div>
          );
        })}
    </AbsoluteFill>
  );
};

// The anchor camera: one transform on one world container. A shot says "world point (ax, ay)
// sits at screen point (sx, sy) at scale k", which is how a director thinks about framing, and
// shots chain without drift: lc(lc(A, B, t1), C, t2). Anchors lerp linearly, k in log space.
import type React from 'react';
import { lmix, mix } from './anim';

export type Shot = {
  ax: number; // world point that is framed ...
  ay: number;
  sx: number; // ... at this screen point
  sy: number;
  k: number; // scale (world px -> screen px)
  yaw?: number; // deg, rotateY: each act gets its own axis
  pitch?: number; // deg, rotateX (tilt)
  roll?: number; // deg, rotateZ: rigid in screen space, keep <= 11
};

/** Blend two shots. Scale in log space so a zoom has constant perceived speed. */
export const lc = (A: Shot, B: Shot, t: number): Shot => ({
  ax: mix(A.ax, B.ax, t),
  ay: mix(A.ay, B.ay, t),
  sx: mix(A.sx, B.sx, t),
  sy: mix(A.sy, B.sy, t),
  k: lmix(A.k, B.k, t),
  yaw: mix(A.yaw ?? 0, B.yaw ?? 0, t),
  pitch: mix(A.pitch ?? 0, B.pitch ?? 0, t),
  roll: mix(A.roll ?? 0, B.roll ?? 0, t),
});

/**
 * Style for the world container (lay the world out at left:0, top:0 in world px). All translation
 * lives inside this one matrix: fractional left/top next to a transform snaps to whole pixels and
 * slow drifts stair-step. Roll sits outside the tilt so type is never sheared into faux italics.
 */
export const camera = (s: Shot, perspective = 2400): React.CSSProperties => {
  const rot =
    s.yaw || s.pitch || s.roll
      ? ` perspective(${perspective}px) rotateZ(${s.roll ?? 0}deg) rotateX(${s.pitch ?? 0}deg) rotateY(${s.yaw ?? 0}deg)`
      : '';
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: '0 0',
    transform: `translate(${s.sx}px, ${s.sy}px)${rot} scale(${Math.max(1e-4, s.k)}) translate(${-s.ax}px, ${-s.ay}px)`,
  };
};

/**
 * Screen position of a world point under a flat shot (no yaw/pitch/roll): where to draw an overlay
 * that tracks the product (a cursor, the story device, a caption pinned to a row), every frame.
 */
export const toScreen = (s: Shot, p: { x: number; y: number }) => ({
  x: s.sx + (p.x - s.ax) * s.k,
  y: s.sy + (p.y - s.ay) * s.k,
});

/** Push-in "breath" inside a hold: multiply k by it (amount 0.025 = +2.5%). Released by the next move. */
export const breath = (t: number, amount = 0.025) => 1 + amount * t;

/** Zoom-out hop during a whip (t = the whip's 0..1 progress): multiply k by it. */
export const dip = (t: number, depth = 0.18) => 1 - depth * Math.sin(Math.PI * t) ** 2;

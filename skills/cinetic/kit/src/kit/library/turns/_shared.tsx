// Shared by the turns: the scene props every turn takes (`from`, `to`, `at`, `speed`), a box, frame counts scaled
// by speed, and the origin of a front (an edge or a point) and its distance.
import React from 'react';

export type Scenes = { from: React.ReactNode; to: React.ReactNode; at: number; speed?: number };

export type TurnBox = { x: number; y: number; w: number; h: number; r?: number };

export const sp = (n: number, speed = 1) => Math.max(1, Math.round(n / speed));

export type Origin = 'top' | 'bottom' | 'left' | 'right' | { x: number; y: number };

/** 0..1 distance of a point from an origin (an edge or a point), normalised to the farthest point of the frame. */
export const frontDist = (o: Origin, x: number, y: number, W: number, H: number, metric: 'round' | 'diamond' = 'round') => {
  if (o === 'top') return y / H;
  if (o === 'bottom') return 1 - y / H;
  if (o === 'left') return x / W;
  if (o === 'right') return 1 - x / W;
  const fx = Math.max(o.x, W - o.x);
  const fy = Math.max(o.y, H - o.y);
  if (metric === 'diamond') return (Math.abs(x - o.x) + Math.abs(y - o.y)) / (fx + fy);
  return Math.hypot(x - o.x, y - o.y) / Math.hypot(fx, fy);
};

export const across = (o: Origin, x: number, y: number, W: number, H: number) => (o === 'top' || o === 'bottom' ? x / W : o === 'left' || o === 'right' ? y / H : Math.atan2(y - o.y, x - o.x) / Math.PI);

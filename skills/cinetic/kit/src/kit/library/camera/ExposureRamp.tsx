// ExposureRamp (camera, join): without a cut the whole world brightens together, from graphite to soft white, so the dark
// set becomes the light one while the camera keeps moving; the lit things (screens, icons, photographs) keep their own
// colour and the surfaces round them change.
// Numbers: 30-34 f on an in-out; the void, the slabs and the shadows all move on the same curve; the shadows soften from
// 50 % to 18 % as the light rises.
// Caution: it replaces a cut between a dark and a light part of the same world; the surfaces change, never the subject;
// it has to ride a camera move, a still frame brightening reads as a fade.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { clamp, ease, type Ease } from '../../motion';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** A colour between two #rrggbb colours at p (0: a, 1: b). */
export const mixHex = (p: number, a: string, b: string) => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(p))).join(', ')})`;
};

/** The exposure state the scene draws its surfaces with: `p` 0..1, `ground` the void, `surface` a slab, `shadow` alpha. */
export type Exposure = { p: number; ground: string; surface: string; line: string; shadow: number };

/**
 * ExposureRamp: `children(e)` draws the scene with the exposure `e` (its void in `e.ground`, its slabs in `e.surface`,
 * hairlines in `e.line`, shadow alpha `e.shadow`); the ramp runs from `at` over `dur` frames. Pairs of colours: `dark`
 * and `light` for the void, `darkSurface` and `lightSurface` for the slabs.
 */
export const ExposureRamp: React.FC<{
  at: number;
  dur?: number;
  curve?: Ease;
  dark?: string;
  light?: string;
  darkSurface?: string;
  lightSurface?: string;
  children: (e: Exposure) => React.ReactNode;
}> = ({ at, dur = 32, curve = ease.inOut, dark = '#141518', light = '#E7E8EA', darkSurface = '#2A2C31', lightSurface = '#F6F6F7', children }) => {
  const frame = useCurrentFrame();
  const p = curve(clamp((frame - at) / dur));
  const e: Exposure = {
    p,
    ground: mixHex(p, dark, light),
    surface: mixHex(p, darkSurface, lightSurface),
    line: `rgba(${p > 0.5 ? '20,22,26' : '255,255,255'}, ${0.08 + 0.06 * Math.abs(p - 0.5) * 2})`,
    shadow: 0.5 - 0.32 * p,
  };
  return <AbsoluteFill style={{ background: e.ground }}>{children(e)}</AbsoluteFill>;
};

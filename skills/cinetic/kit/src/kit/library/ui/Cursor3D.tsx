// Cursor3D (ui, emphasis): a chunky extruded arrowhead cursor (a satin top face, a darker side wall, a soft contact
// shadow) that glides onto its target, decelerating, presses (it sinks into its wall and its shadow closes) and rests
// with a slow tilt; the target flips state on the press.
// Numbers: approach on the pointer's arc (expo-out, 5-8 f); press 3 f in, 6 f back: scale 0.9, the wall to 0.55 of
// its depth, the shadow's offset halved, tighter and darker (blur to 0.6, opacity 16 to 24 %); the wall swept in 22
// soft steps, 13 % of the size deep; shadow offset (+0.11, +0.2) of the size; idle tilt 4 degrees on a 40 f cycle;
// size 5-6 % of the frame height.
// Caution: one per film, for a product whose look is soft and three-dimensional; the target must change state on the
// press (use `pressOf` / the clicks' frames).
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { useUid } from '../_shared';
import { useUiFrame } from './_shared';
import { pointerAt, type PointerKey, pressOf } from './Pointer';

// an arrowhead with a notched base, tip at (0, 0), in a 100 x 100 box
const HEAD = 'M0 0 L86 34 Q92 37 86 41 L50 52 Q46 53.5 44.5 57.5 L33 90 Q30.5 96 27.5 90 Z';

export const Cursor3D: React.FC<{
  keys: PointerKey[];
  clicks?: number[];
  /** Its size in px (default 5.5 % of the frame height). */
  size?: number;
  /** The top face and the side wall. */
  color?: string;
  side?: string;
  at?: number;
  exitAt?: number;
  ground?: string;
}> = ({ keys, clicks = [], size: sizeIn, color = '#9AA2F5', side, at: atIn, exitAt, ground = '#3A3F8F' }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useUiFrame();
  const id = useUid('c3d');
  const start = atIn ?? keys[0].f;
  if (frame < start) return null;
  if (exitAt !== undefined && frame > exitAt + 12) return null;
  const size = sizeIn ?? Math.min(W, H) * 0.055;
  const wall = side ?? mixColor(color, '#1E2280', 0.45);
  const k = pointerAt(frame, keys);
  const v = Math.hypot(k.vx, k.vy);
  const rest = clamp(1 - v / 4);
  const press = pressOf(frame, clicks);
  const appear = at(frame, start, 5, ease.out);
  const out = exitAt !== undefined ? at(frame, exitAt, 12, ease.in) : 0;
  const tilt = Math.sin((frame - start) / 6.4) * 4 * rest + clamp(k.vx / 40, -1, 1) * 6;
  const depth = size * 0.13 * mix(press, 1, 0.55);
  const steps = 22;
  const sc = mix(appear, 0.7, 1) * mix(press, 1, 0.9);
  const shX = size * 0.11 * mix(press, 1, 0.5) * (1 + (1 - rest) * 0.6);
  const shY = size * 0.2 * mix(press, 1, 0.5) * (1 + (1 - rest) * 0.6);
  return (
    <div style={{ position: 'absolute', left: k.x + out * size * 6, top: k.y + out * size * 5, width: 0, height: 0, opacity: appear * (1 - out), zIndex: 220, pointerEvents: 'none' }}>
      <svg width={size * 2} height={size * 2} viewBox="-20 -20 200 200" style={{ position: 'absolute', left: -size * 0.2, top: -size * 0.2, overflow: 'visible', transform: `rotate(${tilt}deg) scale(${sc})`, transformOrigin: `${size * 0.2}px ${size * 0.2}px` }}>
        <defs>
          <linearGradient id={`${id}t`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor={mixColor(color, '#FFFFFF', 0.55)} />
            <stop offset="0.45" stopColor={mixColor(color, '#FFFFFF', 0.12)} />
            <stop offset="1" stopColor={color} />
          </linearGradient>
          <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={18 * mix(press, 1, 0.6)} />
          </filter>
          <filter id={`${id}w`} x="-10%" y="-10%" width="130%" height="130%">
            <feGaussianBlur stdDeviation={0.6} />
          </filter>
          <filter id={`${id}c`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={4} />
          </filter>
        </defs>
        {/* contact shadow, tinted to the ground */}
        <path d={HEAD} fill={ground} opacity={mix(press, 0.16, 0.24) * (1 - out)} transform={`translate(${(shX / size) * 100} ${(shY / size) * 100})`} filter={`url(#${id}b)`} />
        {/* the side wall: the head swept down and to the right in fine steps, lit at the top edge and darkening with depth,
            softened by a fraction of a pixel so it reads as a rounded extrusion, not stacked plates */}
        <g filter={`url(#${id}w)`}>
          {Array.from({ length: steps }, (_, i) => {
            const k = (steps - i) / steps; // 1 = the deepest layer
            const d = k * (depth / size) * 100;
            return <path key={i} d={HEAD} fill={mixColor(mixColor(wall, '#FFFFFF', 0.12 * (1 - k)), '#000000', k * 0.18)} transform={`translate(${d * 0.55} ${d})`} />;
          })}
        </g>
        {/* a contact shade where the wall meets the ground: closes in as the cursor presses */}
        <path d={HEAD} fill={mixColor(wall, '#000000', 0.45)} opacity={0.35} transform={`translate(${(depth / size) * 100 * 0.62} ${(depth / size) * 100 * 1.12})`} filter={`url(#${id}c)`} />
        {/* the top face, with a lit rim */}
        <path d={HEAD} fill={`url(#${id}t)`} stroke={mixColor(color, '#FFFFFF', 0.7)} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M6 9 L70 35" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
};

// LightSweep (fx, emphasis): a band of light crosses a surface once, a soft glow with a thin hot line at its leading
// edge, clipped to the box.
// Numbers: 10-14 f on expo in-out, the band 35 % of the surface, tilted 18 deg, blended screen.
// Caution: once per surface; a sweep on everything is wallpaper.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';

/**
 * LightSweep: a band of light crosses a surface once, a broad soft glow with a thin hot line at its leading edge, clipped
 * to the surface's own rounded box. Put it on a card, a button, a glass panel, a word set large.
 * Measured: 8-12 f, travel on ease in-out, the band ~35 % of the surface wide, tilted ~18 deg.
 */
export const LightSweep: React.FC<{
  at: number;
  dur?: number;
  w: number;
  h: number;
  radius?: number;
  angle?: number;
  color?: string;
  strength?: number;
  /** Band width as a share of the surface. */
  width?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at: start, dur = 12, w, h, radius = 0, angle = 18, color = '#FFFFFF', strength = 0.75, width = 0.35, blend = 'screen', children, style }) => {
  const frame = useCurrentFrame();
  const t = t01(frame, start, dur);
  const on = frame >= start && frame <= start + dur;
  const span = w + h * Math.tan((angle * Math.PI) / 180);
  const bw = span * width;
  const x = mix(ease.inOut(t), -bw - h * Math.tan((angle * Math.PI) / 180), w + bw * 0.2);
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', ...style }}>
      {children}
      {on && (
        <div style={{ position: 'absolute', top: -h * 0.5, left: x, width: bw, height: h * 2, transform: `skewX(${-angle}deg)`, mixBlendMode: blend, pointerEvents: 'none', opacity: strength }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${color}00 0%, ${color}33 30%, ${color}AA 78%, ${color} 90%, ${color}00 100%)` }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '90%', width: Math.max(2, bw * 0.02), background: color, filter: 'blur(1px)' }} />
        </div>
      )}
    </div>
  );
};

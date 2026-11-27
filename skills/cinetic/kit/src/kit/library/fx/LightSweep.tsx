// LightSweep (fx, emphasis): a sheen of light crosses a surface once, a soft bell of light with no hard edge (a thin
// hot line at its leading edge only with `edge`), clipped to the box.
// Numbers: 10-14 f on expo in-out, the band 50 % of the surface (a broad gaussian profile), tilted 18 deg, blended screen.
// Caution: once per surface; a sweep on everything is wallpaper.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';

/** The sheen's profile: a broad gaussian across the band, sampled every 5 %, near zero at both ends. */
const bell = (color: string) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  const hex = m ? (m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]) : 'ffffff';
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const stops: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const a = Math.exp(-Math.pow((u - 0.5) / 0.26, 2));
    stops.push(`rgba(${r},${g},${b},${(i === 0 || i === 20 ? 0 : a).toFixed(3)}) ${(u * 100).toFixed(0)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
};

/**
 * LightSweep: a sheen crosses a surface once, a broad soft glow whose light falls off as a bell on both sides (finely
 * sampled, so no stripe and no hard rim), clipped to the surface's own rounded box. `edge` adds the old thin hot line at
 * its leading edge (a metallic glint). Put it on a card, a button, a glass panel, a word set large.
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
  /** A thin hot line at the band's leading edge (a hard glint); off by default, the sheen is soft. */
  edge?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at: start, dur = 12, w, h, radius = 0, angle = 18, color = '#FFFFFF', strength = 0.75, width = 0.5, blend = 'screen', edge = false, children, style }) => {
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
        <div style={{ position: 'absolute', top: -h * 0.5, left: 0, width: bw, height: h * 2, transform: `translateX(${x}px) skewX(${-angle}deg)`, mixBlendMode: blend, pointerEvents: 'none', opacity: strength }}>
          <div style={{ position: 'absolute', inset: 0, background: bell(color) }} />
          {edge && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '90%', width: Math.max(2, bw * 0.02), background: color, filter: 'blur(1px)' }} />}
        </div>
      )}
    </div>
  );
};

// A scene drawn on a fixed 1920 x 1080 stage, scaled to the frame: the scenes that rebuild a measured move keep its numbers
// in 1080p px (ring radii, key pitch, vertex tables) and let the stage fit them to any frame size. Plus the few pure
// helpers those scenes share (a CSS cubic-bezier, a seeded hash, hex mixing, a picture by public path or URL).
// Pure: no clock of its own, nothing random.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

export const STAGE = { W: 1920, H: 1080 } as const;

/** The 1920 x 1080 drawing scaled to the frame (contained and centred), over a ground that fills the whole frame. */
export const Stage1080: React.FC<{ W: number; H: number; ground: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ W, H, ground, children, style }) => {
  const k = Math.min(W / STAGE.W, H / STAGE.H);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: (W - STAGE.W * k) / 2,
          top: (H - STAGE.H * k) / 2,
          width: STAGE.W,
          height: STAGE.H,
          transform: `scale(${k})`,
          transformOrigin: '0 0',
          overflow: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** A picture by public path (staticFile) or URL, covering its box. */
export const srcOf = (s: string) => (/^(https?:|data:|blob:)/.test(s) || s.startsWith('/') ? s : staticFile(s));
export const Picture: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={srcOf(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
);

/** A CSS cubic-bezier as an easing of 0..1. */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 10; i++) {
      const d = sx(u) - x;
      const dx = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(d) < 1e-7 || Math.abs(dx) < 1e-7) break;
      u -= d / dx;
    }
    return sy(Math.min(1, Math.max(0, u)));
  };
};

/** Exponential approach 0 -> 1 over p 0..1 (rate k), normalised to land exactly at p = 1. */
export const expo = (p: number, k = 10) => (p <= 0 ? 0 : p >= 1 ? 1 : (1 - Math.pow(2, -k * p)) / (1 - Math.pow(2, -k)));

/** A deterministic hash in [0, 1) of a seed and an index. */
export const hash = (seed: number, i: number) => {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** rgba() of a colour: '#rgb', '#rrggbb' or the 'rgb(r, g, b)' strings lib/color's mixes return. */
export const rgba = (hex: string, a: number) => {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(hex);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  const s = hex.replace('#', '');
  const f = s.length === 3 ? s.split('').map((x) => x + x).join('') : s.slice(0, 6);
  return `rgba(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(f.slice(4, 6), 16)},${a})`;
};

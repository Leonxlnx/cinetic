// CubeSplit (object / logo, build): one isometric cube holds, wobbles and splits into four that fly apart into a 2 x 2;
// the four swing round the centre and lock into a ring of eight blocks; the ring tips over on its horizontal axis with
// motion blur and lands flat and front-on as a pixel mark, faint construction lines streaking out from it.
// Numbers: hold 7 f, wobble 3 f, split at 10 f (2 x 2 by 14 f, expo out, square to the frame, centres 1.5 sides out), hold to 26 f, swing
// 26-31 f (a quarter turn, the pairs fanning to their ring slots), hold to 44 f, flip 45-50 f (the view from 55 degrees
// down to straight down while it spins a full turn, blur from the angular speed), land at 51 f at 106 % and settle to
// 100 % by 58 f; a cube's side 5.2 % of the frame's width.
// Caution: the mark is drawn in square cells (`cells`, on a grid); a mark that is not made of cells needs another piece.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { shade } from '../../world';

/** A CSS cube of side s, its faces lit from above (top lightest). */
const Cube: React.FC<{ s: number; color: string; flat?: boolean }> = ({ s, color }) => {
  const face = (bg: string, tf: string) => (
    <div style={{ position: 'absolute', left: -s / 2, top: -s / 2, width: s, height: s, background: bg, transform: tf, backfaceVisibility: 'hidden', boxShadow: `inset 0 0 0 ${Math.max(0.6, s * 0.006)}px rgba(255,255,255,0.10)` }} />
  );
  return (
    <div style={{ position: 'absolute', transformStyle: 'preserve-3d' }}>
      {face(shade(color, 0.16), `translateZ(${s / 2}px)`)}
      {face(shade(color, -0.42), `translateZ(${-s / 2}px) rotateY(180deg)`)}
      {face(shade(color, -0.08), `translateY(${s / 2}px) rotateX(-90deg)`)}
      {face(shade(color, -0.3), `translateY(${-s / 2}px) rotateX(90deg)`)}
      {face(shade(color, -0.22), `translateX(${s / 2}px) rotateY(90deg)`)}
      {face(shade(color, -0.36), `translateX(${-s / 2}px) rotateY(-90deg)`)}
    </div>
  );
};

/** The default mark: a pinwheel of eight cells on a 4 x 4 grid. */
const PINWHEEL: Array<[number, number]> = [
  [0, 0], [1, 0], [3, 0], [3, 1], [3, 3], [2, 3], [0, 3], [0, 2],
];
// the eight slots of the ring (a 3 x 3 without its centre), in order round it
const RING: Array<[number, number]> = [
  [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0],
];

export const CubeSplit: React.FC<{
  at?: number;
  color?: string;
  /** The mark it lands as: cells [column, row] on a grid (eight cells: one a block). */
  cells?: Array<[number, number]>;
  /** Faint construction lines from the mark's cell edges as it lands. */
  guides?: string | false;
  /** A cube's side as a share of the frame's width. */
  side?: number;
  speed?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, color = '#1B2A4A', cells = PINWHEEL, guides = 'rgba(20,24,34,0.16)', side = 0.052, speed = 1, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = (f - at) * speed;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const s = W * side;
  const n = 8;
  // the mark's cells, centred
  const cols = Math.max(...cells.map((c) => c[0])) + 1;
  const rows = Math.max(...cells.map((c) => c[1])) + 1;
  const markPos = (i: number) => {
    const c = cells[i % cells.length];
    return [(c[0] - (cols - 1) / 2) * s, (c[1] - (rows - 1) / 2) * s];
  };
  // view: isometric (55 degrees down, 45 round) until the flip, then straight down and square to the frame
  const flip = ease.inOut(clamp((t - 45) / 6));
  const ax = mix(flip, 55, 360);
  const az = mix(flip, 45, 0);
  const prevFlip = ease.inOut(clamp((t - 1 - 45) / 6));
  const angSpeed = Math.abs(flip - prevFlip) * 305;
  const land = t >= 51 ? mix(ease.out(clamp((t - 51) / 7)), 1.06, 1) : 1;
  const wob = t >= 7 && t < 10 ? Math.sin((t - 7) * 2.4) * 7 : 0;
  const split = ease.out(clamp((t - 10) / 5));
  const swing = ease.inOut(clamp((t - 26) / 6));
  const swingPrev = ease.inOut(clamp((t - 27) / 6));
  const morph = ease.inOut(clamp((t - 46) / 5));
  const blur = Math.min(16, angSpeed * 0.16 + Math.abs(swing - swingPrev) * 14 + (t >= 10 && t < 12 ? 5 : 0));
  const cubes: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    // 2 x 2: cubes i and i + 4 share a quarter
    const q = i % 4;
    // the 2 x 2 sits square to the frame: on the world's axes, which the isometric view turns 45 degrees
    const qa = (q * Math.PI) / 2;
    const r2 = 1.5 * s * split;
    let px = Math.cos(qa) * r2;
    let py = Math.sin(qa) * r2;
    if (t < 10) {
      px = 0;
      py = 0;
    }
    if (t >= 26) {
      // swing: from the quarter to a ring slot a quarter turn on, the pair fanning apart in polar
      const slot = RING[(q * 2 + (i < 4 ? 2 : 3)) % 8];
      const a1raw = Math.atan2(slot[1], slot[0]);
      let a1 = a1raw;
      while (a1 < qa) a1 += Math.PI * 2;
      const r1 = Math.hypot(slot[0], slot[1]) * s;
      const a = mix(swing, qa, a1);
      const r = mix(swing, r2, r1);
      px = Math.cos(a) * r;
      py = Math.sin(a) * r;
    }
    if (t >= 46) {
      const [mx, my] = markPos(i);
      px = mix(morph, px, mx);
      py = mix(morph, py, my);
    }
    // before the split only one cube shows; the second of each pair leaves its twin when the swing starts
    if ((t < 10 && i > 0) || (t < 26 && i >= 4)) continue;
    cubes.push(
      <div key={i} style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: `translate3d(${px}px, ${py}px, ${s / 2}px) rotateZ(${t < 10 ? wob : 0}deg)` }}>
        <Cube s={s} color={color} />
      </div>,
    );
  }
  // construction lines: from the landed mark's cell edges out to the frame, drawn on 47-60 f, fading by 75 f
  const lines: React.ReactNode[] = [];
  if (guides && t >= 47 && t < 78) {
    const grow = ease.out(clamp((t - 47) / 10));
    const fade = 1 - clamp((t - 64) / 14);
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let c = 0; c <= cols; c++) xs.add((c - cols / 2) * s);
    for (let r = 0; r <= rows; r++) ys.add((r - rows / 2) * s);
    let k = 0;
    xs.forEach((vx) => lines.push(<div key={`x${k++}`} style={{ position: 'absolute', left: cx + vx * land, top: cy - (H / 2) * grow, width: 1, height: H * grow, background: guides, opacity: fade }} />));
    ys.forEach((vy) => lines.push(<div key={`y${k++}`} style={{ position: 'absolute', top: cy + vy * land, left: cx - (W / 2) * grow, height: 1, width: W * grow, background: guides, opacity: fade }} />));
  }
  return (
    <AbsoluteFill style={{ filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
      {lines}
      <div style={{ position: 'absolute', left: cx, top: cy, perspective: s * 40, transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: `scale(${land}) rotateX(${ax}deg) rotateZ(${az}deg)` }}>{cubes}</div>
      </div>
    </AbsoluteFill>
  );
};

// PixelStair (turn, join): the next scene advances over the old one as a ragged front of large square cells: a
// skyline of blocks on twos with hot tinted cells along its edge, or a scatter whose loose cells run ahead of it.
// Numbers: skyline 26 f, cells 1/42 of the width, on twos, slow start, half the frame in 3 steps, a long tail; scatter
// 26 f, cells 1/64 of the width, on ones, accelerating (t^3.5), a third of the frame scattered ahead of the front.
// Caution: the tints must be colours of the old picture (its warm or cool lights); never a new accent.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix, rand } from '../../motion';
import { type Scenes, sp } from './_shared';

/** Smooth seeded noise along one axis (0..1). */
const wave = (u: number, seed: number) => 0.5 + 0.5 * (0.55 * Math.sin(u * 4.1 + seed * 1.7) + 0.3 * Math.sin(u * 9.7 + seed * 3.1) + 0.15 * Math.sin(u * 21.3 + seed * 0.7));

/** The measured skyline progress: a slow corner, a fast middle, a long tail. */
const SKY: Array<[number, number]> = [[0, 0], [0.25, 0.12], [0.35, 0.42], [0.5, 0.68], [0.7, 0.88], [1, 1]];
const keysAt = (k: Array<[number, number]>, t: number) => {
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return mix((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]), k[i - 1][1], k[i][1]);
  return 1;
};

/**
 * PixelStair: a stepped pixel wipe. Every cell of a square grid gets a threshold along the travel direction (`angle`,
 * 0 = left to right, 90 = top to bottom, 35 = from the top-left corner) plus a ragged offset; a cell shows the next
 * scene once the front passes its threshold. `front="skyline"`: the offset is a smooth noise across the front (a
 * skyline of blocks), the clock steps on twos, and the cells just ahead of the front glow in `tints`. `front="scatter"`:
 * the offset is per cell (loose cells run ahead), the clock runs on ones and accelerates. The last frame covers every
 * cell. Measured: skyline f0 corner, f8 a sixth, f10 half, f13 70 %, f26 done; scatter a quarter at f17, done at f26.
 */
export const PixelStair: React.FC<
  Scenes & {
    front?: 'skyline' | 'scatter';
    dur?: number;
    /** Cells across the width. */
    cells?: number;
    /** Travel direction in degrees (0 left to right, 90 top to bottom). */
    angle?: number;
    /** How ragged the front is, a share of the travel. */
    rag?: number;
    /** Hot cells along a skyline front (colours of the old picture); empty for none. */
    tints?: string[];
    seed?: number;
  }
> = ({ from, to, at: start, speed = 1, front = 'skyline', dur = 26, cells: cellsIn, angle: angleIn, rag: ragIn, tints = [], seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const sky = front === 'skyline';
  const cells = cellsIn ?? (sky ? 42 : 64);
  const angle = angleIn ?? (sky ? 35 : 14);
  const rag = ragIn ?? (sky ? 0.22 : 0.32);
  const c = W / cells;
  const cols = cells;
  const rows = Math.ceil(H / c);
  const a = (angle * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const proj = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => x * ca + y * sa);
  const p0 = Math.min(...proj), p1 = Math.max(...proj);
  const perp = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => -x * sa + y * ca);
  const q0 = Math.min(...perp), q1 = Math.max(...perp);
  // the clock: on twos for the skyline (the last frame always lands), on ones for the scatter
  const k = frame - start;
  const ks = sky && k < D - 1 ? Math.floor(k / 2) * 2 : k;
  const t = (ks + 1) / D;
  const P = sky ? mix(keysAt(SKY, t), -rag / 2 - 0.06, 1 + rag / 2 + 0.06) : mix(Math.pow(t, 3.5), 0, 1.0001);
  const band = (1.15 * c) / (p1 - p0);
  let d = '';
  const hot: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) {
    let run = -1;
    for (let i = 0; i <= cols; i++) {
      let on = false;
      let thr = 0;
      if (i < cols) {
        const x = (i + 0.5) * c, y = (j + 0.5) * c;
        const u = (x * ca + y * sa - p0) / (p1 - p0);
        if (sky) {
          const v = (-x * sa + y * ca - q0) / (q1 - q0);
          thr = u + rag * (wave(Math.round(v * cells) / cells * 3, seed) - 0.5) + 0.03 * (rand(i * 7.31 + j * 19.7 + seed) - 0.5);
        } else thr = u * (1 - rag) + rag * rand(i * 7.31 + j * 19.7 + seed);
        on = thr < P;
        if (sky && !on && tints.length && thr < P + band && k < D - 1) {
          hot.push(<rect key={`${i}-${j}`} x={i * c} y={j * c} width={c + 0.5} height={c + 0.5} fill={tints[Math.floor(rand(i * 3.7 + j * 11.1 + seed) * tints.length) % tints.length]} />);
        }
      }
      if (on && run < 0) run = i;
      if (!on && run >= 0) {
        d += `M${(run * c).toFixed(1)} ${(j * c).toFixed(1)}H${(i * c + 0.5).toFixed(1)}V${((j + 1) * c + 0.5).toFixed(1)}H${(run * c).toFixed(1)}Z`;
        run = -1;
      }
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: d ? `path('${d}')` : 'inset(100%)' }}>{to}</AbsoluteFill>
      {hot.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} shapeRendering="crispEdges">
          {hot}
        </svg>
      )}
    </AbsoluteFill>
  );
};

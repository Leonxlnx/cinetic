// HalftoneField (ground, idle / emphasis): a light field of round halftone dots whose colours run across the frame
// from one ink to the next, broken by clusters of black dots; on each swap (a cut) the dots take the next palette and
// the clusters change shape.
// Numbers: ground #E6E6E6, pitch 2.5 % of the height (27 px at 1080), dots 0.55-0.92 of the pitch by tone, black
// clusters on 15-40 % of the field; a swap is one frame, the swaps may accelerate (12, 9, 7, 5 f).
// Caution: one palette a swap, two or three inks in it; the type sits on a plain backing box, never on the dots.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { mixLab } from '../../world';
import { FrameCanvas } from './_shared';

/**
 * HalftoneField: `palettes` (each two or three inks, top-left to bottom-right) swap on the frames in `swaps`; the
 * cluster ink `cluster` covers a seeded set of blobs that changes with each swap and drifts a little between them.
 */
export const HalftoneField: React.FC<{
  ground?: string;
  palettes?: string[][];
  swaps?: number[];
  cluster?: string;
  /** Share of the field under clusters (0.15-0.4). */
  coverage?: number;
  pitch?: number;
  seed?: number;
}> = ({ ground = '#E6E6E6', palettes = [['#F07A5A', '#E85A7A'], ['#F2B33D', '#E8573A'], ['#5E86F0', '#9CC8FF'], ['#2A2A2A', '#8A8A8A']], swaps = [], cluster = '#141414', coverage = 0.25, pitch = 0.025, seed = 4 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const k = swaps.filter((s) => f >= s).length;
  const pal = palettes[k % palettes.length];
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = ground;
    g.fillRect(0, 0, W, H);
    const p = pitch * H;
    const s = seed + k * 17;
    const drift = (f - (swaps.filter((x) => f >= x).pop() ?? 0)) * 0.6;
    const blobs = Array.from({ length: 5 }, (_, i) => ({
      x: W * rand(s + i * 3) + drift,
      y: H * rand(s + i * 5),
      r: H * (0.1 + 0.12 * rand(s + i * 7)),
    }));
    const cols = Math.ceil(W / p) + 1;
    const rows = Math.ceil(H / p) + 1;
    // the threshold is the field's own quantile, so `coverage` of the dots fall in clusters
    const sample: number[] = [];
    for (let j = 0; j < rows; j += 2) for (let i = 0; i < cols; i += 2) {
      let v = 0;
      for (const b of blobs) v += (b.r * b.r) / ((i * p - b.x) ** 2 + (j * p - b.y) ** 2 + 1);
      sample.push(v);
    }
    sample.sort((a, b) => a - b);
    const thr = sample[Math.min(sample.length - 1, Math.floor(sample.length * (1 - coverage)))];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = (i + 0.5) * p - p / 2 + ((W % p) / 2);
        const y = (j + 0.5) * p - p / 2 + ((H % p) / 2);
        let field = 0;
        for (const b of blobs) field += (b.r * b.r) / ((x - b.x) ** 2 + (y - b.y) ** 2 + 1);
        const inCluster = field > thr;
        const tone = 0.55 + 0.37 * (0.5 + 0.5 * Math.sin(x * 0.004 + y * 0.006 + s));
        const d = (x / W + y / H) / 2;
        const ink = pal.length === 1 ? pal[0] : d < 0.5 || pal.length === 2 ? mixLab(pal[0], pal[1], Math.min(1, d * (pal.length === 2 ? 1 : 2))) : mixLab(pal[1], pal[2], (d - 0.5) * 2);
        g.fillStyle = inCluster ? cluster : ink;
        g.beginPath();
        g.arc(x, y, (p * (inCluster ? 0.86 : tone)) / 2, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  return <FrameCanvas width={W} height={H} draw={draw} deps={[f, k, ground, JSON.stringify(palettes), cluster, coverage, pitch, seed]} />;
};

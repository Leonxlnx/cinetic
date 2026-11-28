// HalftoneField (ground, idle / emphasis): a light field of round halftone dots whose colours run across the frame
// from one ink to the next, broken by clusters of black dots; on each swap (a cut) the dots take the next palette and
// the clusters change shape.
// Numbers: ground #E6E6E6, pitch 2.5 % of the short side (27 px at 1080), dots 0.55-0.92 of the pitch by tone, black
// clusters on 15-40 % of the field; each palette holds 12 f or more; on a swap the clusters change on the frame and the ink
// eases to the next one over `blend` frames (6), so the field never strobes and never jumps in brightness.
// Caution: one flat ink a palette by default, the inks of one lightness; the type sits on a plain backing box, never on
// the dots.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../../motion';
import { mixLab } from '../../world';
import { FrameCanvas } from './_shared';

/**
 * HalftoneField: `palettes` (each one flat ink, or two or three running top-left to bottom-right) swap on the frames in
 * `swaps` (keep them 12 f or more apart), the ink easing over `blend` frames; the cluster ink `cluster` covers a seeded
 * set of blobs that changes with each swap and drifts a little between them.
 */
export const HalftoneField: React.FC<{
  ground?: string;
  palettes?: string[][];
  swaps?: number[];
  cluster?: string;
  /** Share of the field under clusters (0.15-0.4). */
  coverage?: number;
  pitch?: number;
  /** Frames the ink eases over on a swap (0: a cut). */
  blend?: number;
  seed?: number;
}> = ({ ground = '#E6E6E6', palettes = [['#E8684A'], ['#E9823A'], ['#DC5A6E'], ['#D2553A']], swaps = [], cluster = '#141414', coverage = 0.25, pitch = 0.025, blend = 6, seed = 4 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const k = swaps.filter((s) => f >= s).length;
  const pal = palettes[k % palettes.length];
  const prev = palettes[(k - 1 + palettes.length) % palettes.length];
  const last = k > 0 ? swaps.filter((x) => f >= x).pop() ?? 0 : -Infinity;
  const bp = blend > 0 ? Math.min(1, (f - last) / blend) : 1;
  const inkOf = (pl: string[], d: number) =>
    pl.length === 1 ? pl[0] : d < 0.5 || pl.length === 2 ? mixLab(pl[0], pl[1], Math.min(1, d * (pl.length === 2 ? 1 : 2))) : mixLab(pl[1], pl[2], (d - 0.5) * 2);
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = ground;
    g.fillRect(0, 0, W, H);
    const p = pitch * Math.min(W, H);
    const s = seed + k * 17;
    const drift = (f - (swaps.filter((x) => f >= x).pop() ?? 0)) * 0.6;
    const blobs = Array.from({ length: 5 }, (_, i) => ({
      x: W * rand(s + i * 3) + drift,
      y: H * rand(s + i * 5),
      r: Math.min(W, H) * (0.1 + 0.12 * rand(s + i * 7)),
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
        const ink = bp >= 1 ? inkOf(pal, d) : mixLab(inkOf(prev, d), inkOf(pal, d), bp * bp * (3 - 2 * bp));
        g.fillStyle = inCluster ? cluster : ink;
        g.beginPath();
        g.arc(x, y, (p * (inCluster ? 0.86 : tone)) / 2, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  return <FrameCanvas width={W} height={H} draw={draw} deps={[f, k, ground, JSON.stringify(palettes), cluster, coverage, pitch, blend, seed]} />;
};

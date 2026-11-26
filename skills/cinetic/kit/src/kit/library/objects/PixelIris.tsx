// PixelIris (object, join): a ring of small square pixels in two or three deep tones opens from a point and races out
// past the corners; inside it the next scene (a wordmark on its ground) is already there and settles from soft and large
// to sharp; outside it the old scene stays until the ring has passed.
// Numbers: 8 f in all; the ring's outer radius 6, 25, 55, 75, 95, 112, 130, 150 % of H, its inner edge 0, 8, 33, 55, 75, 92,
// 110, 130 % (so it is thick early and thins); pixels 2.8 % of H, 85 % opaque, seeded tones; the ring soft (6 px blur) on
// its first 3 f; the scene inside from 120 % and 8 px of blur to 100 % and sharp by 5 f.
// Caution: the pixel tones should be the next scene's own (its ground, its accent, a near black), never new colours.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix, keys } from '../../motion';
import { rnd } from './_shared';

const OUT: Array<[number, number]> = [[0, 0.06], [1, 0.25], [2, 0.55], [3, 0.75], [4, 0.95], [5, 1.12], [6, 1.3], [7, 1.5]];
const IN: Array<[number, number]> = [[0, 0], [1, 0.08], [2, 0.33], [3, 0.55], [4, 0.75], [5, 0.92], [6, 1.1], [7, 1.3]];

export const PixelIris: React.FC<{
  from: React.ReactNode;
  to: React.ReactNode;
  at: number;
  /** The pixel tones. */
  colors?: string[];
  /** Pixel side as a share of H. */
  pixel?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ from, to, at, colors = ['#8C1D2E', '#D8344A', '#2A0C12', '#F06A6A'], pixel = 0.028, seed = 3, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = f - at;
  if (t < 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  // the keys are for a centred opening of a 16:9 frame; scale them to this opening's farthest corner
  const k = far / (Math.hypot(W / 2, H / 2) || 1);
  const ro = keys(t, OUT, ease.linear) * H * k;
  const ri = keys(t, IN, ease.linear) * H * k;
  if (ri >= far + pixel * H * 2) return <AbsoluteFill>{to}</AbsoluteFill>;
  const p = ease.out(clamp(t / 5));
  const c = pixel * H;
  const rects: React.ReactNode[] = [];
  const i0 = Math.floor((cx - ro) / c);
  const i1 = Math.ceil((cx + ro) / c);
  const j0 = Math.floor((cy - ro) / c);
  const j1 = Math.ceil((cy + ro) / c);
  for (let j = Math.max(j0, -1); j <= Math.min(j1, Math.ceil(H / c) + 1); j++)
    for (let i = Math.max(i0, -1); i <= Math.min(i1, Math.ceil(W / c) + 1); i++) {
      const px = i * c + c / 2;
      const py = j * c + c / 2;
      const d = Math.hypot(px - cx, py - cy);
      // a ragged edge: each pixel's own threshold inside the band
      const jit = (rnd(seed, i * 977 + j, 1) - 0.5) * c * 1.6;
      if (d + jit < ri || d + jit > ro) continue;
      rects.push(<rect key={`${i}-${j}`} x={i * c} y={j * c} width={c + 0.5} height={c + 0.5} fill={colors[Math.floor(rnd(seed, i * 131 + j * 7, 2) * colors.length)]} fillOpacity={0.85} />);
    }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `path(evenodd, 'M0 0H${W}V${H}H0Z M${cx - ri - 0.01} ${cy}a${ri + 0.01} ${ri + 0.01} 0 1 0 ${ri * 2 + 0.02} 0a${ri + 0.01} ${ri + 0.01} 0 1 0 ${-ri * 2 - 0.02} 0Z')` }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${ri + c}px at ${cx}px ${cy}px)` }}>
        <AbsoluteFill style={{ transform: `scale(${mix(p, 1.2, 1)})`, transformOrigin: `${cx}px ${cy}px`, filter: p < 0.98 ? `blur(${mix(p, 8, 0).toFixed(1)}px)` : undefined }}>{to}</AbsoluteFill>
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, filter: t < 3 ? `blur(${(6 * (1 - t / 3)).toFixed(1)}px)` : undefined }}>
        {rects}
      </svg>
    </AbsoluteFill>
  );
};

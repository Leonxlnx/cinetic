// PlanetRim (ground, enter / exit): on black, a dark planet rises from the frame's foot: a thin peach rim, a burnt
// orange band inside it, a warm haze above the rim that fades out about 0.2 of the height up; it sinks again on an ease-in.
// Numbers: radius 1.1 of the height; the rim top crosses the foot and reaches 60 % of its travel in 4 f, 75 % at 12 f,
// 85 % at 18 f, rest at 30 f (to 0.80 of the height for a statement, 0.62 for an end card); the light builds from 4 f
// over 20 f (a radial falloff: 85 % at the rim, 48 % 0.05 of the height up, 17 % at 0.12, gone at 0.24); the band peaks 0.11 of the height under the rim; the sink takes 11 f.
// Caution: the light belongs to the rim (never a glow on its own); one planet a film, under the name or the claim.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease, keys } from '../../motion';
import { useUid } from '../_shared';

/**
 * PlanetRim: `top` is where the rim's top settles (share of the height), `x` the planet's centre (share of the
 * width); `fromX` lets it rise from a corner (it travels to `x` as it rises). `sinkAt` sends it back below the foot.
 */
export const PlanetRim: React.FC<{
  at?: number;
  sinkAt?: number;
  top?: number;
  x?: number;
  fromX?: number;
  /** Radius as a share of the height. */
  radius?: number;
  ground?: string;
  body?: string;
  rim?: string;
  band?: string;
  light?: string;
}> = ({ at = 0, sinkAt, top = 0.8, x = 0.5, fromX, radius = 1.1, ground = '#000000', body = '#080302', rim = '#F4C6A2', band = '#B4451A', light = '#8E4120' }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('planet');
  const R = radius * H;
  const rise = keys(f - at, [[0, 0], [4, 0.6], [12, 0.75], [18, 0.85], [30, 1]], ease.linear);
  const sink = sinkAt === undefined ? 0 : prog(f, sinkAt, 11, ease.in);
  const yTop = H * 1.02 + (top * H - H * 1.02) * rise + (H * 1.25 - top * H) * sink;
  const cx = W * ((fromX ?? x) + (x - (fromX ?? x)) * rise);
  const cy = yTop + R;
  const glow = prog(f, at + 4, 20, ease.out) * (1 - sink);
  if (f < at) return <AbsoluteFill style={{ background: ground }} />;
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R + 0.24 * H}>
            {[[0, 0], [R / (R + 0.24 * H) - 0.002, 0], [R / (R + 0.24 * H), 0.85], [(R + 0.05 * H) / (R + 0.24 * H), 0.48], [(R + 0.12 * H) / (R + 0.24 * H), 0.17], [1, 0]].map(([o, a], i) => (
              <stop key={i} offset={o} stopColor={light} stopOpacity={a * glow} />
            ))}
          </radialGradient>
          <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={0.03 * H} /></filter>
          <filter id={`${id}r`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={0.004 * H} /></filter>
          <clipPath id={`${id}c`}><circle cx={cx} cy={cy} r={R} /></clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={R + 0.24 * H} fill={`url(#${id}g)`} />
        <circle cx={cx} cy={cy} r={R} fill={body} />
        <g clipPath={`url(#${id}c)`}>
          <circle cx={cx} cy={cy} r={R - 0.11 * H} fill="none" stroke={band} strokeWidth={0.075 * H} filter={`url(#${id}b)`} />
        </g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={rim} strokeWidth={0.008 * H} opacity={0.55} filter={`url(#${id}r)`} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={rim} strokeWidth={Math.max(1.5, 0.0024 * H)} />
      </svg>
    </AbsoluteFill>
  );
};

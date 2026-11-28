// CuttingMat (ground, idle): a tabletop seen from above: a slate cutting mat with its printed grid, a strip of warm
// desk at one edge, soft window-blind shadows lying across both, the whole surface tracking slowly as if the camera
// slid over the table.
// Numbers: minor grid 3.7 % of the height (white 14 %), every fifth line major (white 30 %), one 45-degree guide; the
// mat turned 3 degrees; blind shadows 8 % of the height wide, a band every 20 %, black 32 %, edges soft 1.2 %; the
// track 0.6 % of the height a second.
// Caution: things laid on the mat (cards, tiles, stickers) take a short hard-ish contact shadow from the same window;
// keep words off the shadow bands.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useUid } from '../_shared';

/** CuttingMat: `mat` and `desk` colours, the blind shadows' angle and strength, the track as [x, y] shares a second. */
export const CuttingMat: React.FC<{
  mat?: string;
  desk?: string;
  line?: string;
  /** Blind shadow strength (0: none). */
  blinds?: number;
  angle?: number;
  track?: [number, number];
  seed?: number;
}> = ({ mat = '#3F5668', desk = '#EAE3D6', line = '#FFFFFF', blinds = 0.32, angle = 28, track = [-0.006, -0.003] }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const id = useUid('mat');
  const g = 0.037 * H;
  const tx = (track[0] * H * f) / fps;
  const ty = (track[1] * H * f) / fps;
  const matW = W * 1.6;
  const matH = H * 1.6;
  const n = Math.ceil(matW / g);
  const m = Math.ceil(matH / g);
  const sw = Math.max(1, H / 1080);
  const period = 0.2 * H;
  const shift = ((f * 0.0008 * H) % period + period) % period;
  return (
    <AbsoluteFill style={{ background: desk, overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={0.012 * H} /></filter>
        </defs>
        <g transform={`translate(${W * 0.47 + tx} ${H * 0.52 + ty}) rotate(-3)`}>
          <rect x={-matW / 2 - W * 0.12} y={-matH / 2} width={matW} height={matH} rx={0.02 * H} fill={mat} />
          <g transform={`translate(${-matW / 2 - W * 0.12} ${-matH / 2})`}>
            {Array.from({ length: n + 1 }, (_, i) => (
              <line key={`v${i}`} x1={i * g} x2={i * g} y1={0} y2={matH} stroke={line} strokeOpacity={i % 5 === 0 ? 0.3 : 0.14} strokeWidth={sw} />
            ))}
            {Array.from({ length: m + 1 }, (_, j) => (
              <line key={`h${j}`} y1={j * g} y2={j * g} x1={0} x2={matW} stroke={line} strokeOpacity={j % 5 === 0 ? 0.3 : 0.14} strokeWidth={sw} />
            ))}
            <line x1={0} y1={matH} x2={matH} y2={0} stroke={line} strokeOpacity={0.2} strokeWidth={sw} />
          </g>
        </g>
        {blinds > 0 && (
          <g filter={`url(#${id}s)`} transform={`rotate(${angle} ${W / 2} ${H / 2})`}>
            {Array.from({ length: Math.ceil((W * 2) / period) + 2 }, (_, k) => (
              <rect key={k} x={-W} y={-H + k * period + shift - period} width={W * 3} height={0.08 * H} fill="#000" opacity={blinds} />
            ))}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// SliceShift (fx, emphasis, exit): 1 px white hairlines slide in from the top and the bottom in mirrored pairs and cut a
// picture into horizontal bands; each band then slips down by its own amount, so the subject is sliced and sinks.
// Numbers: 3 pairs of lines, each sliding in over 8 f, 4 f apart; bands slip 2-9 % of the frame height over 30 f on an
// in-out, the middle bands most; lines 1 px at 1080, white at 85 %.
// Caution: on a photograph or footage with one clear subject; on UI or type it reads as a rendering fault.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, rand } from '../../motion';

/**
 * SliceShift: `children` (the picture, full frame) cut by `pairs` mirrored pairs of hairlines arriving from `at`, the bands
 * between them slipping down by up to `sink` (share of the height) over `dur` frames from `at + 10`.
 */
export const SliceShift: React.FC<{
  at: number;
  pairs?: number;
  dur?: number;
  sink?: number;
  line?: string;
  seed?: number;
  children: React.ReactNode;
}> = ({ at, pairs = 3, dur = 30, sink = 0.09, line = 'rgba(255,255,255,0.85)', seed = 3, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  // the resting places of the top lines (the bottom ones mirror them), spread over the upper half
  const rest = Array.from({ length: pairs }, (_, i) => H * (0.12 + (0.36 * (i + 0.5)) / pairs + (rand(seed * 13 + i) - 0.5) * 0.06));
  const ys: number[] = [];
  rest.forEach((y, i) => {
    const p = ease.out(clamp((frame - at - i * 4) / 8));
    if (p <= 0) return;
    ys.push(y * p, H - y * p);
  });
  const cuts = [0, ...ys.sort((a, b) => a - b), H];
  const slip = ease.inOut(clamp((frame - at - 10) / dur));
  const lw = Math.max(1, H / 1080);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {cuts.slice(0, -1).map((y0, i) => {
        const y1 = cuts[i + 1];
        const mid = (y0 + y1) / 2 / H;
        // the middle bands slip most, each by its own seeded share
        const amt = i === 0 ? 0 : sink * H * slip * (1 - Math.abs(mid - 0.5) * 1.2) * (0.4 + 0.6 * rand(seed * 29 + i));
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: y0, width: W, height: Math.max(0, y1 - y0), overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: -y0 + amt, width: W, height: H }}>{children}</div>
          </div>
        );
      })}
      {ys.map((y, i) => (
        <div key={`l${i}`} style={{ position: 'absolute', left: 0, top: y - lw / 2, width: W, height: lw, background: line }} />
      ))}
    </AbsoluteFill>
  );
};

// OrbitLines (ground, enter / idle): on a warm flat ground, two hairline circles larger than the frame start as one,
// part, then turn as a pair and keep turning slowly under the type, so an empty ground never stands still.
// Numbers: 1 px #D9D7D2 on #F3F2EE; radius 0.32 of the width; one circle fades in over 2 f, the two part vertically
// to 0.7 of the height apart in 7 f (expo out), the pair turns 60 degrees over 11 f (expo out), then drifts 0.15
// degree a frame.
// Caution: the circles must stay faint (about 8 % contrast) and mostly off-frame; the line of type, not the circles,
// is the subject.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease } from '../../motion';
import { hair, unit } from './_shared';

/** OrbitLines: two (or `count`) hairline circles round the frame's centre that part, turn and drift. */
export const OrbitLines: React.FC<{
  at?: number;
  ground?: string;
  color?: string;
  /** Radius as a share of the width. */
  r?: number;
  /** Distance between the centres once parted, as a share of the height. */
  sep?: number;
  /** Degrees the pair turns after parting. */
  turn?: number;
  /** Degrees a frame it keeps turning. */
  drift?: number;
  count?: number;
}> = ({ at = 0, ground = '#F3F2EE', color = '#D9D7D2', r = 0.32, sep = 0.7, turn = 60, drift = 0.15, count = 2 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const u = unit(H);
  const fade = prog(f, at, 2, ease.linear);
  const part = prog(f, at + 1, 7, ease.out);
  const t = prog(f, at + 9, 11, ease.out);
  const after = Math.max(0, f - (at + 20));
  const angle = 90 + turn * t + drift * after;
  const show = f >= at;
  const d = sep * H * part;
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      {show && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: fade }}>
          {Array.from({ length: count }, (_, i) => {
            const a = ((angle + (360 / count) * i) * Math.PI) / 180;
            const cx = W / 2 + (Math.cos(a) * d) / 2;
            const cy = H / 2 + (Math.sin(a) * d) / 2;
            return <circle key={i} cx={cx} cy={cy} r={r * W} fill="none" stroke={color} strokeWidth={hair(u)} />;
          })}
        </svg>
      )}
    </AbsoluteFill>
  );
};

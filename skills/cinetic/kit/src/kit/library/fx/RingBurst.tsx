// RingBurst (fx, emphasis): on a press, a ring of halftone dots grows out of the button and thins as it goes: the dots are
// largest on the ring's crest and shrink to nothing either side of it; optionally the scene behind dims a little for the
// moment of the press and lifts again. No flash, no white frame.
// Numbers: 16 f on an expo-out from the button's radius to 30-40 % of the frame height; the band 18 % of the height wide at
// the start, 6 % at the end; dots on a 1.5 % pitch, up to 0.42 of the pitch on the crest; the dim 0-35 % over 6 f, back
// over 10 f.
// Caution: once, on the press that matters; the button itself answers too (it dips), the ring only spreads it.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease } from '../../motion';

/**
 * RingBurst: a halftone ring of `color` grows from radius `from` (px) at (`x`, `y`) to `to` (px) over `dur` frames from `at`;
 * `dim` darkens what is under it for the press. Put it over the scene, under the button if the button should stay on top.
 */
export const RingBurst: React.FC<{
  at: number;
  dur?: number;
  x?: number;
  y?: number;
  from?: number;
  to?: number;
  color?: string;
  /** Dot pitch in px (default 1.5 % of the frame height). */
  pitch?: number;
  dim?: number;
}> = ({ at, dur = 16, x, y, from = 40, to, color = '#F07A2E', pitch, dim = 0 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const R1 = to ?? H * 0.36;
  const pz = pitch ?? Math.max(6, Math.round(H * 0.015));
  const t = clamp((frame - at) / dur);
  const live = frame >= at && t < 1;
  const p = ease.out(t);
  const r = from + (R1 - from) * p;
  const band = H * (0.18 - 0.12 * p);
  const fade = 1 - ease.in(t);
  const dimA = dim * (frame < at ? 0 : frame < at + 6 ? (frame - at + 1) / 6 : 1 - clamp((frame - at - 6) / 10));
  const dots: React.ReactNode[] = [];
  if (live) {
    const reach = r + band;
    const n = Math.ceil(reach / pz);
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const dx = i * pz;
        const dy = j * pz;
        const d = Math.hypot(dx, dy);
        const k = 1 - Math.abs(d - r) / (band / 2);
        if (k <= 0 || d < from * 0.8) continue;
        const rr = pz * 0.42 * Math.pow(k, 0.8) * fade;
        if (rr < 0.4) continue;
        dots.push(<circle key={`${i}_${j}`} cx={cx + dx} cy={cy + dy} r={rr} fill={color} />);
      }
    }
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {dimA > 0.005 && <AbsoluteFill style={{ background: `rgba(20,20,22,${dimA.toFixed(3)})` }} />}
      {dots.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {dots}
        </svg>
      )}
    </AbsoluteFill>
  );
};

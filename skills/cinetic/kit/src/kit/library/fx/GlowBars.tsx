// GlowBars (fx, enter, idle): light seen through reeded glass on a dark ground: a strong coloured glow rises from one
// corner and spreads across, broken into narrow soft columns (the reeds), which lean slowly from upright to diagonal while
// the glow drifts; a dialog, a field or a wordmark holds in front of it.
// Numbers: reeds 4.5 % of the frame width apart (22 across), each a column bright at its foot, its top a step lower than
// its neighbour's toward the far side; the rise 30-40 f on an expo-out from the corner to most of the lower half; the
// lean from 0 to 28 deg over 3-4 s; the glow two hues (a hot core, a deeper rim) at full strength.
// Caution: it is a ground for one held thing, strong and saturated; never faint (a pale gradient behind a frame is slop),
// never behind busy UI.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix } from '../../motion';

/**
 * GlowBars: the glow (`color` core, `rim` edge) rises from `corner` from `at` over `dur` frames, through reeds `pitch` px
 * apart that lean from `lean[0]` to `lean[1]` deg over `leanDur` frames; `children` hold in front.
 */
export const GlowBars: React.FC<{
  at?: number;
  dur?: number;
  color?: string;
  rim?: string;
  ground?: string;
  /** Reed spacing in px (default 4.5 % of the frame width: 22 reeds across). */
  pitch?: number;
  lean?: [number, number];
  leanDur?: number;
  corner?: 'left' | 'right' | 'center';
  children?: React.ReactNode;
}> = ({ at = 0, dur = 34, color = '#FF8A3D', rim = '#C2264B', ground = '#0A0A0C', pitch, lean = [0, 28], leanDur = 110, corner = 'left', children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const pz = pitch ?? Math.round(W * 0.045);
  const rise = ease.out(clamp((frame - at) / dur));
  const ang = mix(ease.inOut(clamp((frame - at) / leanDur)), lean[0], lean[1]);
  const cx = corner === 'left' ? mix(rise, 0.1, 0.36) : corner === 'right' ? mix(rise, 0.9, 0.64) : 0.5;
  const breathe = Math.sin((frame - at) / 38) * 0.04;
  const ry = mix(rise, 0.1, 0.62 + breathe);
  const rx = mix(rise, 0.18, 0.9);
  // each reed shows the glow behind it stretched down its whole height: a column whose top is the glow's edge at its centre
  const n = Math.ceil((W * 1.6) / pz) + 2;
  const x0 = -W * 0.3;
  const cols = Array.from({ length: n }, (_, i) => {
    const x = x0 + i * pz + pz / 2;
    const u = (x - cx * W) / (rx * W);
    const h = Math.max(0, ry * H * 1.25 * Math.sqrt(Math.max(0, 1 - u * u)));
    return { x: x0 + i * pz, h };
  });
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `rotate(${ang}deg)`, transformOrigin: '30% 100%', opacity: rise > 0 ? 1 : 0 }}>
        {cols.map((c, i) =>
          c.h > 1 ? (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: c.x,
                width: pz + 1,
                bottom: -H * 0.2,
                height: c.h + H * 0.2,
                background: `linear-gradient(0deg, ${color} 0%, ${color} 14%, ${rim} 52%, ${ground}00 100%)`,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 22%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.42) 100%)' }} />
            </div>
          ) : null,
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ground} 0%, ${ground} 12%, ${ground}00 55%)` }} />
      {children && <AbsoluteFill>{children}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

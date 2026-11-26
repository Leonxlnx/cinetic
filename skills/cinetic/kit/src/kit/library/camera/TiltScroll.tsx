// TiltScroll (camera, idle, exit): a long page, turned a little in 3D on a dark ground, scrolls up steadily like a poster
// passing the lens; from `rushAt` it accelerates into the cut with a vertical smear that grows with its speed.
// Numbers: the page 70 % of the frame wide; turned 6-10 deg back and 4-8 deg round; scroll 6-9 px a frame at 1080 (rising
// evenly over 12 f); a rush doubles the speed every 4-5 f, smearing up to 18 px, cut on its fastest frame.
// Caution: the page must be worth reading in passing (a real layout, pictures, headings); a page of grey bars scrolling is
// filler. Cut on the rush's fastest frame, never let it stop.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useUid } from '../_shared';

/** How far the page has scrolled at frame `f` (px): eased in over `ramp`, steady at `speed`, then a doubling rush. */
export const scrollAt = (f: number, at: number, speed: number, ramp = 12, rushAt?: number, doubling = 4.5): number => {
  const t = f - at;
  if (t <= 0) return 0;
  // the speed rises evenly over the ramp (so the ramp covers half its length at full speed), then holds
  const steady = t < ramp ? (speed * t * t) / (2 * ramp) : speed * (t - ramp / 2);
  if (rushAt === undefined || f <= rushAt) return steady;
  const r = f - rushAt;
  // speed doubles every `doubling` frames: the integral of speed * 2^(r/d)
  const k = Math.LN2 / doubling;
  return scrollAt(rushAt, at, speed, ramp) + (speed * (Math.exp(k * r) - 1)) / k;
};

/**
 * TiltScroll: `children` (a page `w` px wide, laid out top-down as long as it needs) scrolling from `at` at `speed` px a
 * frame, turned by `tilt` (deg back), `turn` (deg round) and `roll`; `rushAt` accelerates it into the cut.
 */
export const TiltScroll: React.FC<{
  at: number;
  speed?: number;
  ramp?: number;
  rushAt?: number;
  w?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  /** Where the page's top sits at the start, px from the frame's top. */
  top?: number;
  ground?: string;
  children: React.ReactNode;
}> = ({ at, speed = 7, ramp = 12, rushAt, w, tilt = 8, turn = -6, roll = -1.5, top, ground = '#0B0F18', children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('tscroll');
  const pw = w ?? W * 0.7;
  const k = H / 1080;
  const y = scrollAt(frame, at, speed * k, ramp, rushAt);
  const v = y - scrollAt(frame - 1, at, speed * k, ramp, rushAt);
  const smear = Math.min(18 * k, Math.max(0, v - 12 * k) * 0.35);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden', perspective: W * 1.4 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id} x="0" y="-5%" width="100%" height="110%">
          <feGaussianBlur stdDeviation={`0 ${smear.toFixed(2)}`} edgeMode="duplicate" />
        </filter>
      </svg>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `rotateX(${tilt}deg) rotateY(${turn}deg) rotateZ(${roll}deg)`, transformOrigin: '50% 40%' }}>
        <div style={{ position: 'absolute', left: (W - pw) / 2, top: (top ?? H * 0.08) - y, width: pw, filter: smear > 0.4 ? `url(#${id})` : undefined, boxShadow: '0 40px 120px rgba(0,0,0,0.5)' }}>{children}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

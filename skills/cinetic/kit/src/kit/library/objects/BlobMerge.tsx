// BlobMerge (object / logo, build): two round blobs drift toward each other, touch with a liquid neck, merge into one,
// split into two smaller ones, merge again into a pill and shrink to a single dot, on whose frame the mark snaps in.
// Numbers (at 1920 wide, scaled to the frame): radius 144 px each, 600 px apart; they touch at 18 f (a neck), are one
// blob at 20-21 f, two of 85-90 px at 23 f, 52-58 px at 26 f, a pill at 28-29 f, a 22 px dot at 30 f; the mark at 31 f,
// from 112 % to 100 % in 3 f. The neck is a metaball (blur and threshold), never two circles overlapping.
// Caution: it is a logo opener; one in a film, on a flat ground, with the mark's own colour.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { useUid } from '../_shared';

// frame, half the distance between the centres, left radius, right radius (px at 1920 wide)
const KEYS: Array<[number, number, number, number]> = [
  [0, 300, 144, 144],
  [12, 268, 136, 120],
  [15, 190, 130, 110],
  [18, 96, 124, 100],
  [20, 26, 122, 104],
  [21, 0, 118, 118],
  [22, 34, 100, 96],
  [23, 92, 90, 86],
  [25, 102, 76, 74],
  [26, 116, 58, 52],
  [27, 112, 52, 50],
  [28, 56, 40, 38],
  [29, 30, 29, 27],
  [30, 0, 22, 22],
];

const sample = (t: number) => {
  if (t <= KEYS[0][0]) return KEYS[0];
  for (let i = 1; i < KEYS.length; i++) {
    const [f1] = KEYS[i];
    if (t <= f1) {
      const a = KEYS[i - 1];
      const b = KEYS[i];
      // the slow approach eases in; the dense keys after it are taken linearly
      const p = i <= 3 ? ease.inOut((t - a[0]) / (b[0] - a[0])) : (t - a[0]) / (b[0] - a[0]);
      return [t, mix(p, a[1], b[1]), mix(p, a[2], b[2]), mix(p, a[3], b[3])] as [number, number, number, number];
    }
  }
  return KEYS[KEYS.length - 1];
};

export const BlobMerge: React.FC<{
  at?: number;
  /** The blobs' colour (the mark's). */
  color?: string;
  /** The mark that snaps in on the last dot (drawn centred at x, y). */
  mark?: React.ReactNode;
  /** 1 the measured timing. */
  speed?: number;
  /** Size multiplier on the measured radii. */
  scale?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, color = '#16233A', mark, speed = 1, scale = 1, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('blobmerge');
  if (f < at) return null;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const u = (W / 1920) * scale;
  const t = (f - at) * speed;
  const markAt = 31;
  if (t >= markAt && mark) {
    const p = ease.out(clamp((t - markAt + 1) / 3));
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${mix(p, 1.12, 1)})` }}>{mark}</div>
      </AbsoluteFill>
    );
  }
  const [, half, r1, r2] = sample(Math.min(t, 30));
  const rAvg = ((r1 + r2) / 2) * u;
  const blur = Math.max(2.5, rAvg * 0.2);
  // a little squash along the line between them while they rush together (8 % wide at 16 f)
  const sq = 1 + 0.08 * Math.max(0, 1 - Math.abs(t - 16) / 5);
  const pad = 2 * (half * u + Math.max(r1, r2) * u) + blur * 6;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={id} x={cx - pad / 2} y={cy - pad / 2} width={pad} height={pad} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 24 -11" result="m" />
            <feFlood floodColor={color} />
            <feComposite in2="m" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${id})`}>
          <ellipse cx={cx - half * u} cy={cy} rx={r1 * u * sq} ry={(r1 * u) / sq} fill="#000" />
          <ellipse cx={cx + half * u} cy={cy} rx={r2 * u * sq} ry={(r2 * u) / sq} fill="#000" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

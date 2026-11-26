// DotWave (object, build / loop): a glowing dot opens sideways into a row of fine vertical bars that widens
// symmetrically from the centre and lives like a level meter (a few bars spike and fall every frame), while dim rows of
// the same bars fade in above and below; `calmAt` narrows it back to one quiet dotted line.
// Numbers: the dot holds 2 f, the row opens to 60 % of W over 14 f (expo out), bars on a pitch of 0.55 % of W, 0.18 %
// wide; spikes on twos up to 11 % of H, the edges tapering; four dim rows at +-8 and +-16 % of H at 22 % strength from
// 0-6 f; a soft glow round the centre; `calmAt` narrows to 30 % over 12 f and the dim rows leave.
// Caution: it is a voice or a signal; let it sit under or beside one line, never with a second moving thing.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { useUid } from '../_shared';
import { rnd } from './_shared';

export const DotWave: React.FC<{
  at?: number;
  color?: string;
  /** Frame (from `at`) the meter calms to one quiet line; none: it keeps living. */
  calmAt?: number;
  /** Width of the open row as a share of W. */
  width?: number;
  rows?: boolean;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, color = '#FFFFFF', calmAt, width = 0.6, rows = true, seed = 5, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('dotwave');
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const calm = calmAt !== undefined ? ease.inOut(clamp((t - calmAt) / 12)) : 0;
  const open = ease.out(clamp((t - 2) / 14));
  const half = (W * mix(calm, width, 0.3) * open) / 2;
  const pitch = W * 0.0055;
  const bw = Math.max(1.5, W * 0.0018);
  const tick = Math.floor(t / 2);
  const bars = (yy: number, alpha: number, k: number, amp: number, hw = half) => {
    const n = Math.floor(hw / pitch);
    const out: React.ReactNode[] = [];
    for (let i = -n; i <= n; i++) {
      const xx = cx + i * pitch;
      const edge = 1 - Math.abs(i) / Math.max(1, n);
      const r = rnd(seed + k * 31, i + 400, tick);
      const spike = r > 0.88 ? (r - 0.88) * 8.3 : r > 0.66 ? (r - 0.66) * 1.4 : 0;
      const h = Math.max(bw * 1.6, (bw * 1.6 + spike * H * amp) * Math.pow(edge, 0.6) * (1 - calm * 0.9));
      out.push(<rect key={`${k}-${i}`} x={xx - bw / 2} y={yy - h / 2} width={bw} height={h} rx={bw / 2} fill={color} opacity={alpha} />);
    }
    return out;
  };
  const dot = t < 4 ? mix(clamp(t / 2), 0.012, 0.006) * H : 0;
  const dim = rows ? clamp(t / 6) * 0.22 * (1 - calm) : 0;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={id}>
            <stop offset="0" stopColor={color} stopOpacity={0.22} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={cy} rx={Math.max(H * 0.05, half * 0.9)} ry={H * 0.07} fill={`url(#${id})`} />
        {dim > 0 && [-0.16, -0.08, 0.08, 0.16].map((o, k) => bars(cy + o * H, dim, k + 1, 0.05, (W * mix(calm, width, 0.3)) / 2))}
        {bars(cy, 1, 0, 0.11)}
        {dot > 0 && <circle cx={cx} cy={cy} r={dot} fill={color} />}
      </svg>
    </AbsoluteFill>
  );
};

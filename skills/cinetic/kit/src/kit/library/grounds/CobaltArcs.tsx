// CobaltArcs (ground, idle): one saturated blue, flat, with quiet concentric hairline arcs round a point below the
// frame that widen slowly outward, so a brand-colour ground has structure and a pulse without a gradient.
// Numbers: ground #2140D9; arcs 2 px white at 22 % (fainter and they vanish short of full screen), 0.12 of the
// height apart, centred 0.25 of the height under the
// foot; they widen 0.0016 of the height a frame; on `at` they draw from the centre out over 20 f.
// Caution: keep the blue flat (no lighter centre, no glow); glass cards on it need a 1 px white rim at 25 %.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease } from '../../motion';

/** CobaltArcs: concentric arcs about (x, y) (shares of the frame; y > 1 sits under the foot). */
export const CobaltArcs: React.FC<{
  at?: number;
  ground?: string;
  color?: string;
  /** Opacity of an arc. */
  amount?: number;
  /** Spacing between arcs as a share of the height. */
  gap?: number;
  /** Widening in shares of the height a frame. */
  speed?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, ground = '#2140D9', color = '#FFFFFF', amount = 0.22, gap = 0.12, speed = 0.0016, x = 0.5, y = 1.25 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cx = x * W;
  const cy = y * H;
  const g = gap * H;
  const shift = ((f * speed * H) % g + g) % g;
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, Math.abs(cy))) + g;
  const n = Math.ceil(far / g) + 1;
  const sw = Math.max(1, 2 * (H / 1080));
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: n }, (_, i) => {
          const r = i * g + shift;
          if (r <= 0) return null;
          // drawn out from the centre on `at`; the smallest arcs fade in as they are born
          const reveal = at < 0 ? 1 : ease.out(clamp((f - at - (r / far) * 14) / 8));
          const born = clamp(r / (g * 1.5));
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} opacity={amount * reveal * born} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

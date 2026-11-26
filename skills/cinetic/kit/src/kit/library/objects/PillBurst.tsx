// PillBurst (object, enter / exit): tool pills burst out from behind a line and settle round it at tilted angles; on
// the next line they drop under gravity to the bottom of the frame and land in a loose heap, some turning as they land.
// Numbers: the burst settles in 10 f on expo out, each pill travelling the last quarter of its way out and 12 % of H up,
// from 85 % size, started 0-3 f apart (the first frame already a third of the way); the fall: gravity 1.4 % of H a frame
// squared, started 0-4 f apart, a 3 f landing (a 2.5 % rebound), up to 60 degrees of turn on landing, the heap 6 % of
// H above the bottom edge.
// Caution: pills are what the line says is too many or scattered (tools, tabs, apps); names short, generic icons or the
// real marks; the line itself is the film's (draw it above the pills).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { fonts } from '../../fonts';
import { softShadow } from '../../world';
import { Icon } from '../../icons';
import { rnd } from './_shared';

export type PillItem = { label: string; icon?: string; node?: React.ReactNode };

// places round a centred line (shares of W and H from the centre) and their turns, for up to 10 pills
const PLACES: Array<[number, number, number]> = [
  [-0.36, 0.06, -14], [-0.24, -0.1, 0], [-0.08, -0.13, 4], [0.1, -0.11, 7], [0.27, -0.08, -8],
  [0.36, 0.05, 10], [0.2, 0.12, 0], [-0.02, 0.13, -5], [-0.2, 0.12, 6], [0.04, 0.0, 0],
];

export const PillBurst: React.FC<{
  items: PillItem[];
  at?: number;
  /** Frame the pills fall (none: they stay). */
  fallAt?: number;
  surface?: string;
  ink?: string;
  ground?: string;
  /** Pill text size in px (default 3 % of H). */
  size?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ items, at = 0, fallAt, surface = '#FFFFFF', ink = '#1E2026', ground = '#F4F4F2', size, seed = 6, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const ts = size ?? H * 0.03;
  const ph = ts * 2.1;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {items.slice(0, PLACES.length).map((it, i) => {
        const [px, py, rot] = PLACES[i];
        const fx = cx + px * W;
        const fy = cy + py * H;
        const s0 = Math.floor(rnd(seed, i, 1) * 4);
        const p = ease.out(clamp((t - s0 + 3) / 10));
        if (t < s0) return null;
        let X = fx + (fx - cx) * 0.33 * (1 - p);
        let Y = fy + (fy - cy) * 0.33 * (1 - p) + H * 0.12 * (1 - p);
        let R = rot * mix(p, 1.6, 1);
        const sc = mix(p, 0.85, 1);
        if (fallAt !== undefined && f >= fallAt) {
          const q = f - fallAt - Math.floor(rnd(seed, i, 2) * 5);
          if (q > 0) {
            const g = 0.014 * H;
            const floor = H - H * 0.06 - ph / 2 - rnd(seed, i, 3) * ph * 0.5;
            const drop = 0.5 * g * q * q;
            const land = Math.sqrt((2 * Math.max(1, floor - fy)) / g);
            const turn = rnd(seed, i, 4) > 0.55 ? (rnd(seed, i, 5) > 0.5 ? 1 : -1) * (25 + rnd(seed, i, 6) * 35) : (rnd(seed, i, 7) - 0.5) * 16;
            if (q < land) {
              Y = fy + drop;
              R = rot + turn * 0.3 * (q / land);
            } else {
              const after = q - land;
              const bounce = after < 3 ? Math.sin((after / 3) * Math.PI) * H * 0.025 : 0;
              Y = floor - bounce;
              R = mix(ease.out(clamp(after / 4)), rot + turn * 0.3, rot + turn);
            }
            X = fx + (fx - cx) * 0.12 * clamp(q / Math.max(1, land));
          }
        }
        return (
          <div key={i} style={{ position: 'absolute', left: X, top: Y, transform: `translate(-50%, -50%) rotate(${R}deg) scale(${sc})`, height: ph, padding: `0 ${ts * 0.85}px 0 ${ts * 0.65}px`, borderRadius: ph / 2, background: surface, boxShadow: softShadow(2, ground), display: 'flex', alignItems: 'center', gap: ts * 0.45, fontFamily: fonts.inter, fontSize: ts, fontWeight: 500, color: ink, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {it.node ?? (it.icon ? <Icon name={it.icon} size={ts * 1.15} color={ink} stroke={2} /> : null)}
            {it.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

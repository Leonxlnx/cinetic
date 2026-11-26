// BarStack (type, enter / exit): three big lines slide in staggered, a solid bar wipes behind one so it reads
// reversed, then they drift apart.
// Numbers: lines settle in 9 f (expo out), the bar's edge travels 16 f; drift 12, -10.5, -12 px a frame, slowing over
// a second; exit 10 f.
// Caution: one or two words a line; the bar bleeds off both edges, so nothing else may sit on its row.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { accel, ease, mix, at as prog } from '../../motion';
import { absCentre } from './_shared';

/**
 * BarStack: three big lines stacked tight and staggered to the right. The first slides in from the left, the others
 * from the right, and a solid bar wipes in from the right behind one line and runs on past the left edge, so that line
 * reads reversed out of the bar. Then the lines drift apart in a slow cross-parallax (the top one right, the others
 * left). `leaveAt` carries the whole block up and out of the frame at speed (the next shot arrives from below).
 */
export const BarStack: React.FC<{
  lines: string[];
  /** The line on the bar (default 1, the middle). */
  bar?: number;
  at?: number;
  size?: number;
  color?: string;
  barColor?: string;
  /** The text on the bar. */
  barInk?: string;
  /** Horizontal offset of each line's centre from the block's centre, in em (the stagger). */
  offsets?: number[];
  /** Drift of each line, px per frame at the start (it slows over about a second). */
  drift?: number[];
  /** Frames to settle (default 9). */
  dur?: number;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ lines, bar = 1, at = 0, size = 230, color = '#0E0E0E', barColor = '#0E0E0E', barInk = '#FFFFFF', offsets, drift, dur = 9, leaveAt, x, y, font = fonts.inter, weight = 700 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const n = lines.length;
  const lead = 0.98; // line pitch in em: the lines nearly touch
  const offs = offsets ?? lines.map((_, i) => (i === 0 ? -1.0 : i === bar ? 0.75 : 1.15 + (i - 2) * 0.4));
  const drv = drift ?? lines.map((_, i) => (i === 0 ? 12 : -9 - i * 1.5));
  const t = frame - at;
  const outP = leaveAt === undefined ? 0 : accel(frame, leaveAt, 10, 1.42);
  const out = { x: -outP * width * 0.35, y: -outP * height * 1.25 };
  const lineX = (i: number, f: number) => {
    const fromLeft = i === 0;
    const delay = i === bar ? 0 : fromLeft ? 1 : 3;
    const p = prog(f, at + delay, dur, ease.out);
    const from = (fromLeft ? -1 : 1) * width * 0.75;
    const tt = Math.max(0, f - at - dur);
    const dr = drv[i] * 30 * (1 - Math.exp(-tt / 30));
    return mix(p, from, 0) + dr + offs[i] * size;
  };
  // the bar's left edge: in from the right with its line, then on past the left edge of the frame
  const barLeft = (f: number) => mix(prog(f, at, dur * 1.8, ease.out), width * 0.62, -cx - 60);
  const barH = size * 1.0;
  const blurOut = outP > 0 ? Math.min(14, (accel(frame, leaveAt!, 10, 1.42) - accel(frame - 1, leaveAt!, 10, 1.42)) * 120) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${out.x}px, ${out.y}px)`, filter: blurOut > 0.5 ? `blur(${blurOut}px)` : undefined }}>
        {lines.map((ln, i) => {
          const X = lineX(i, frame);
          const v = Math.abs(X - lineX(i, frame - 1));
          const Y = cy + (i - (n - 1) / 2) * lead * size;
          const onBar = i === bar;
          const bl = barLeft(frame);
          const bv = Math.abs(bl - barLeft(frame - 1));
          return (
            <React.Fragment key={i}>
              {onBar && <div style={{ position: 'absolute', left: cx + bl, top: Y - barH / 2 + size * 0.05, width: width * 2.5, height: barH, background: barColor, filter: bv > 30 ? `blur(${Math.min(8, bv * 0.04)}px)` : undefined }} />}
              <div
                style={{
                  ...absCentre(cx + X, Y),
                  fontFamily: font,
                  fontWeight: weight,
                  fontSize: size,
                  letterSpacing: '-0.035em',
                  lineHeight: 1,
                  color: onBar ? barInk : color,
                  whiteSpace: 'pre',
                  filter: v > 25 ? `blur(${Math.min(12, v * 0.05)}px)` : undefined,
                }}
              >
                {ln}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {t < 0 && null}
    </div>
  );
};

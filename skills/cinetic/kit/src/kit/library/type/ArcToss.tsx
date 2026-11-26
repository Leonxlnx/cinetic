// ArcToss (type, enter / exit): a word tossed in: letters drop on curves in a quick wave, a ribbon unrolling into
// place, then ease back.
// Numbers: 1.2 f between letters, 9 f each with a small overshoot; the exit flies up and right over 10 f.
// Caution: one word; on a long line the wave takes too long to read.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { accel, clamp, ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { spr } from './_shared';

/**
 * ArcToss: a word tossed in. Its letters arrive in a quick wave from left to right, each dropping from above on a
 * curve, turned and smaller, blurred by its speed, and landing with a small overshoot, so for a few frames the word
 * reads as a ribbon unrolling into place; then it holds and eases back a touch. A title over a product shot.
 */
export const ArcToss: React.FC<{
  text: string;
  at?: number;
  /** Frames between letters (default 1.2). */
  lag?: number;
  /** Frames each letter's flight takes (default 9). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  leaveAt?: number;
}> = ({ text, at = 0, lag = 1.2, dur = 9, size = 220, color = '#F2F2F0', x, y, font = fonts.inter, weight = 600, leaveAt }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const chars = Array.from(text);
  const lastLand = at + (chars.length - 1) * lag + dur;
  const settle = 1 - 0.07 * prog(frame, lastLand, 40, ease.soft);
  const out = leaveAt === undefined ? 0 : accel(frame, leaveAt, 10, 1.4);
  const pose = (i: number, f: number) => {
    const t = f - (at + i * lag);
    const p = spr(t, 0.62, 0.62 * (9 / dur));
    const q = clamp(t / dur);
    // a curve: from up and left of its place, over the top, down into place
    const dx = mix(p, -size * 0.55, 0) + Math.sin(q * Math.PI) * size * 0.12;
    const dy = mix(p, -size * 1.0, 0) - Math.sin(q * Math.PI) * size * 0.18;
    return { dx, dy, r: mix(p, 34, 0), s: mix(Math.min(1, p), 0.55, 1), t };
  };
  return (
    <div style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${settle})`, width: L.width, height: L.height }}>
      {chars.map((ch, i) => {
        if (!ch.trim()) return null;
        const a = pose(i, frame);
        if (a.t < 0) return null;
        const b = pose(i, frame - 1);
        const v = Math.hypot(a.dx - b.dx, a.dy - b.dy);
        const g = L.chars[i];
        const o = out * (1 + i * 0.08);
        return (
          <span
            key={i}
            style={{
              ...style,
              position: 'absolute',
              left: g.x,
              top: g.y,
              color,
              whiteSpace: 'pre',
              transformOrigin: '30% 80%',
              transform: `translate(${a.dx + o * width * 0.9}px, ${a.dy - o * height * 0.3}px) rotate(${a.r - o * 30}deg) scale(${a.s})`,
              filter: v > 6 ? `blur(${Math.min(9, v * 0.09)}px)` : undefined,
              opacity: clamp(a.t / 2 + 0.35),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

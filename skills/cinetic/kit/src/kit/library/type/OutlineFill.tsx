// OutlineFill (type, enter): a title writes itself as a thin double contour, glyph by glyph at an uneven hand pace;
// later each glyph fills from left to right, the fill blooming in blurred and sharpening while its contour fades.
// Numbers: each glyph's contour draws in 4 f (a wipe from its foot up), 3-12 f between glyphs (seeded, like a hand);
// the contour is two 0.02 em lines 0.03 em apart; the fill one glyph every 2 f, each over 5 f: opacity 0 to 1, blur
// 0.06 em to 0, the contour fading over the same frames.
// Caution: a title or a name, set big in a heavy face; one per film, and give it time (a ten-letter word takes 2-3 s
// to draw).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

/** The frame each glyph's contour starts drawing: an uneven hand pace (seeded gaps between `min` and `max` frames). */
export const drawTimes = (n: number, at: number, min: number, max: number, seed: number) => {
  const out: number[] = [];
  let t = at;
  for (let i = 0; i < n; i++) {
    out.push(Math.round(t));
    t += min + hash(i, seed) * (max - min);
  }
  return out;
};

/**
 * OutlineFill: from `at` the glyphs of `text` draw as a double contour in `line`, one after another (`gapMin` to
 * `gapMax` frames apart); from `fillAt` they fill with `color` left to right, one every `fillEvery` frames, each
 * blooming in from a blur while its contour fades.
 */
export const OutlineFill: React.FC<{
  text: string;
  at?: number;
  fillAt?: number;
  gapMin?: number;
  gapMax?: number;
  fillEvery?: number;
  size?: number;
  color?: string;
  /** The contour colour (default a clear blue at 75 %). */
  line?: string;
  /** The ground behind the title (the gap between the two contour lines is drawn in it; the ground must be flat). */
  ground?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, fillAt, gapMin = 3, gapMax = 9, fillEvery = 2, size = 220, color = '#E62E57', line = 'rgba(74,140,224,0.8)', ground = '#F2F1EE', leaveAt, x, y, font = fonts.inter, weight = 700, seed = 9 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1.1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const chars = Array.from(text);
  const T = drawTimes(chars.length, at, gapMin, gapMax, seed);
  const F0 = fillAt ?? T[T.length - 1] + 12;
  const left = (x ?? width / 2) - L.width / 2;
  const top = (y ?? height / 2) - L.height / 2;
  const outer = size * 0.07;
  const inner = size * 0.03;
  return (
    <div style={{ position: 'absolute', left, top, width: L.width, height: L.height }}>
      {chars.map((c, i) => {
        if (!c.trim()) return null;
        const g = L.chars[i];
        const draw = clamp((frame - T[i] + 1) / 4);
        if (draw <= 0) return null;
        const fp = clamp((frame - (F0 + i * fillEvery) + 1) / 5);
        // the contour drawn from the glyph's foot upward
        const clip = `inset(${(1 - draw) * 100}% -10% -10% -10%)`;
        const base: React.CSSProperties = { ...style, position: 'absolute', left: g.x, top: 0, whiteSpace: 'pre' };
        return (
          <React.Fragment key={i}>
            {fp < 1 && (
              <>
                <span style={{ ...base, color: 'transparent', WebkitTextStroke: `${outer}px ${line}`, clipPath: clip, opacity: 1 - fp }}>{c}</span>
                <span style={{ ...base, color: 'transparent', WebkitTextStroke: `${inner}px ${ground}`, clipPath: clip, opacity: 1 - fp }}>{c}</span>
              </>
            )}
            {fp > 0 && <span style={{ ...base, color, opacity: fp, filter: fp < 1 ? `blur(${(1 - fp) * size * 0.06}px)` : undefined }}>{c}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

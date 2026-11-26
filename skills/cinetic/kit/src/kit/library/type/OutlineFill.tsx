// OutlineFill (type, enter): a title writes itself as a thin double contour, glyph by glyph at an uneven hand pace;
// later each glyph fills from left to right, the fill blooming in blurred and sharpening while its contour fades.
// Numbers: each glyph's contour draws in 4 f (a wipe from its foot up), 3-12 f between glyphs (seeded, like a hand);
// the contour is two lines of about 0.018 em, 0.022 em apart, both drawn outside the glyph (strokes painted under
// a ground-coloured fill, so the overlapping inner contours of a variable font never show); the fill one glyph every 2 f, each over 5 f: opacity 0 to 1, blur
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
}> = ({ text, at = 0, fillAt, gapMin = 3, gapMax = 9, fillEvery = 2, size = 220, color = '#1E3F8C', line = 'rgba(74,140,224,0.8)', ground = '#F2F1EE', leaveAt, x, y, font = fonts.inter, weight = 700, seed = 9 }) => {
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
  // three strokes, each painted under a fill of the ground (paint-order: stroke first), so only their outer halves show:
  // a line from the glyph's edge out to c, the ground from c to b, a line from b to a. The fill hides every stroke laid
  // inside the letter, so the overlapping contours inside a variable font's glyphs (a box in a crossbar) never show.
  const a = size * 0.058;
  const b = size * 0.04;
  const c = size * 0.018;
  const ring = (w: number, ink: string): React.CSSProperties => ({ color: ground, WebkitTextStroke: `${w * 2}px ${ink}`, paintOrder: 'stroke fill' });
  // each glyph's state: how far its contour has drawn, how far it has filled
  const glyphs = chars.map((ch, i) => {
    const draw = ch.trim() ? clamp((frame - T[i] + 1) / 4) : 0;
    const fp = clamp((frame - (F0 + i * fillEvery) + 1) / 5);
    // the contour drawn from the glyph's foot upward
    const clip = `inset(${(1 - draw) * 100}% -25% -25% -25%)`;
    const base: React.CSSProperties = { ...style, position: 'absolute', left: L.chars[i].x, top: 0, whiteSpace: 'pre' };
    return { ch, draw, fp, clip, base };
  });
  // the rings in passes over the whole word (every glyph's outer line, then every gap, then every inner line, then every
  // body in the ground), so where
  // two glyphs' outlines meet they merge into one outline instead of one glyph's ground cutting into its neighbour's
  const pass = (w: number, ink: string, k: string) =>
    glyphs.map((g, i) =>
      g.draw > 0 && g.fp < 1 ? <span key={`${k}${i}`} style={{ ...g.base, ...ring(w, ink), clipPath: g.clip, opacity: 1 - g.fp }}>{g.ch}</span> : null,
    );
  return (
    <div style={{ position: 'absolute', left, top, width: L.width, height: L.height }}>
      {pass(a, line, 'a')}
      {pass(b, ground, 'b')}
      {pass(c, line, 'c')}
      {/* every glyph's body once more in the ground: an inner line that falls inside a neighbouring glyph is hidden, so
          touching glyphs share one outline */}
      {glyphs.map((g, i) => (g.draw > 0 && g.fp < 1 ? <span key={`d${i}`} style={{ ...g.base, color: ground, clipPath: g.clip, opacity: 1 - g.fp }}>{g.ch}</span> : null))}
      {glyphs.map((g, i) =>
        g.draw > 0 && g.fp > 0 ? <span key={`f${i}`} style={{ ...g.base, color, opacity: g.fp, filter: g.fp < 1 ? `blur(${(1 - g.fp) * size * 0.06}px)` : undefined }}>{g.ch}</span> : null,
      )}
    </div>
  );
};

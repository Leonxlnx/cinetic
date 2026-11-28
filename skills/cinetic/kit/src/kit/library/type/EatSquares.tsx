// EatSquares (type, exit / join): a name is eaten from the left, a glyph a frame, and in its place a row of solid
// squares grows, each from a speck to full size, until only the squares remain: the word becomes the product's mark or
// the start of a grid.
// Numbers: one glyph gone a frame; a square appears when the eaten front passes its place, growing 22, 50, 80, 100 %
// over 4 f (stepped); squares 0.62 em, 0.45 em apart, the row centred where the word was; four by default.
// Caution: the squares must lead somewhere (a mark made of squares, a grid of results); in the word's own colour.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';

const GROW = [0.22, 0.5, 0.8, 1];

/**
 * EatSquares: `text` held centred until `at`; then its glyphs go from the left, one every `per` frames, and `count`
 * squares grow in a centred row as the front passes them. The squares stay (until `leaveAt`).
 */
export const EatSquares: React.FC<{
  text: string;
  at?: number;
  per?: number;
  count?: number;
  size?: number;
  color?: string;
  /** The squares' colour (default the word's). */
  square?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, per = 1, count = 4, size = 96, color = '#E8522B', square, leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const left = cx - L.width / 2;
  const top = cy - L.height / 2;
  const chars = Array.from(text);
  const gone = frame < at ? 0 : Math.min(chars.length, 1 + Math.floor((frame - at) / per));
  // the eaten front, px from the line's left
  const front = gone > 0 ? L.chars[gone - 1].x + L.chars[gone - 1].width : 0;
  const s = size * 0.62;
  const gap = size * 0.45;
  const rowW = count * s + (count - 1) * gap;
  const midY = top + (L.chars[0]?.xMid ?? L.height / 2);
  return (
    <>
      {gone < chars.length && (
        <div style={{ ...style, position: 'absolute', left, top, whiteSpace: 'pre', color, clipPath: `inset(-20% -20% -20% ${front}px)` }}>{text}</div>
      )}
      {Array.from({ length: count }, (_, i) => {
        const sx = cx - rowW / 2 + i * (s + gap);
        // the square starts when the front passes its centre (the last one with the last glyph)
        const passAt = (() => {
          for (let k = 0; k < chars.length; k++) if (left + L.chars[k].x + L.chars[k].width >= sx + s / 2) return at + k * per;
          return at + (chars.length - 1) * per;
        })();
        const age = frame - passAt;
        if (frame < at || age < 0) return null;
        const k = GROW[Math.min(GROW.length - 1, age)] * s;
        return <div key={i} style={{ position: 'absolute', left: sx + (s - k) / 2, top: midY - k / 2, width: k, height: k, background: square ?? color }} />;
      })}
    </>
  );
};

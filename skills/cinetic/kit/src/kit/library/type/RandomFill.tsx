// RandomFill (type, enter): a short line appears letter by letter in a shuffled order across its whole length, the
// newest letters in a tint, the earlier ones settled, until it is complete.
// Numbers: 2-3 letters a frame (a 20-letter status in about 8 f); a letter holds the tint for 2 f, then the ink.
// Caution: labels and status lines of up to about 30 letters; longer lines read as noise before they read as words.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

/**
 * RandomFill: from `at` the letters of `text` appear in a seeded order, `rate` a frame; each new letter is `tint` for
 * `hold` frames, then `color`. The line is set whole from the start (no letter moves).
 */
export const RandomFill: React.FC<{
  text: string;
  at?: number;
  rate?: number;
  hold?: number;
  tint?: string;
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, rate = 2.5, hold = 2, tint = '#7FA3F0', size = 64, color = '#F4F3F0', leaveAt, x, y, font = fonts.inter, weight = 500, seed = 13 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const chars = Array.from(text);
  const order = chars.map((_, i) => i).filter((i) => chars[i].trim()).sort((a, b) => hash(a, seed) - hash(b, seed));
  const born = new Map<number, number>();
  order.forEach((ci, r) => born.set(ci, at + Math.floor(r / rate)));
  const left = (x ?? width / 2) - L.width / 2;
  const top = (y ?? height / 2) - L.height / 2;
  return (
    <div style={{ position: 'absolute', left, top }}>
      {chars.map((c, i) => {
        const b = born.get(i);
        if (b === undefined || frame < b) return null;
        return (
          <span key={i} style={{ ...style, position: 'absolute', left: L.chars[i].x, top: 0, whiteSpace: 'pre', color: frame - b < hold ? tint : color }}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

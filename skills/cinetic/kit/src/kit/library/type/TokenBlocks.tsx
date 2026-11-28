// TokenBlocks (type, enter): text (code or a sentence) grows as blocks becoming words: each token first appears as a
// tinted box its own width, then its text cuts on inside and the box clears.
// Numbers: one or two tokens a frame in reading order; a box holds 3-6 f before its text, then clears 2-4 f later; boxes
// at 35 % of the token's colour (by kind: keyword, name, string, number), cuts only.
// Caution: code, a query or a structured line; in prose the boxes read as redaction.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

export type Token = { text: string; color?: string };

/**
 * TokenBlocks: `lines` of tokens (each `{ text, color }`, spaces are their own tokens or part of one) set from the top
 * left at `x`, `y`; from `at` the tokens arrive in reading order, `rate` a frame, each as a box of its colour at 35 %,
 * its text cutting on inside after a seeded 3-6 f and the box clearing 2-4 f later.
 */
export const TokenBlocks: React.FC<{
  lines: Token[][];
  at?: number;
  rate?: number;
  size?: number;
  color?: string;
  lineHeight?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ lines, at = 0, rate = 1.5, size = 44, color = '#E8E6E1', lineHeight = 1.6, x, y, font = fonts.mono, weight = 400, seed = 21 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.2 } as const;
  const all = lines.map((l) => l.map((t) => t.text).join(''));
  const longest = all.reduce((a, b) => (b.length > a.length ? b : a), '');
  const L = useTextLayout(longest, style);
  if (!L.ready || frame < at) return null;
  // a monospace advance (the line is set in a fixed-width face)
  const adv = L.width / Math.max(1, Array.from(longest).length);
  const x0 = x ?? width * 0.12;
  const y0 = y ?? height / 2 - (lines.length * size * lineHeight) / 2;
  let k = 0;
  const out: React.ReactNode[] = [];
  lines.forEach((line, li) => {
    let col = 0;
    line.forEach((t, ti) => {
      const len = Array.from(t.text).length;
      const isSpace = !t.text.trim();
      const born = at + Math.floor(k / rate);
      if (!isSpace) k++;
      const textAt = born + 3 + Math.floor(hash(k, seed) * 4);
      const clearAt = textAt + 2 + Math.floor(hash(k, seed + 1) * 3);
      const X = x0 + col * adv;
      const Y = y0 + li * size * lineHeight;
      col += len;
      if (isSpace || frame < born) return;
      const c = t.color ?? color;
      if (frame < clearAt)
        out.push(<div key={`b${li}-${ti}`} style={{ position: 'absolute', left: X - adv * 0.1, top: Y + size * 0.05, width: len * adv + adv * 0.2, height: size * 1.1, background: c, opacity: 0.35, borderRadius: size * 0.08 }} />);
      if (frame >= textAt)
        out.push(
          <span key={`t${li}-${ti}`} style={{ ...style, position: 'absolute', left: X, top: Y, whiteSpace: 'pre', color: c }}>
            {t.text}
          </span>,
        );
    });
  });
  return <>{out}</>;
};

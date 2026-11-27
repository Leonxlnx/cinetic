// FaceCycle (type, enter / emphasis): a caption built word by word where each new word arrives in another face (a
// pixel face, then the sans in a bold italic, both in the accent) and lands in the line's sans and ink; one word can
// flip back to the italic (in the line's weight) later as the line's accent (`serif` swaps the italic for an italic serif).
// Numbers: a new word every 3-4 f; per word 2 f pixel, 4 f bold italic, then the sans (cuts, no tween); the pixel face
// is the sans in a heavier weight rasterised to cells of 0.085 em.
// Caution: a caption device: small to mid sizes (40-120 px) and short lines; the faces change by cut, never blend.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { PixelText } from './_shared';

/**
 * FaceCycle: the caption that tries on faces. Words join the line on `times` (or every `gap` frames); each arrives in
 * the pixel face in `accent`, cuts to the sans in a bold italic in `accent` (an italic serif with `serif`), then to the
 * sans in the ink. The line is left-anchored at `x` (a caption beside a picture) or centred (it re-centres by cut as it
 * grows). `flip` turns one word back to the italic on its frame, in the ink: the accent of the finished line.
 */
export const FaceCycle: React.FC<{
  text: string;
  at?: number;
  gap?: number;
  times?: number[];
  size?: number;
  color?: string;
  accent?: string;
  /** Frames in the pixel face, then in the italic (default [2, 4]). */
  holds?: [number, number];
  align?: 'left' | 'center';
  flip?: { index: number; at: number };
  /** The middle face as an italic serif instead of the sans in a bold italic (only for a brand whose voice is a serif). */
  serif?: boolean;
  leaveAt?: number;
  /** The left edge (align 'left') or the centre. */
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, gap = 4, times, size = 64, color = '#141414', accent = '#2F6BE0', holds = [2, 4], align = 'center', flip, serif = false, leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  const T = words.map((_, i) => times?.[i] ?? Math.round(at + i * gap));
  if (!L.ready || L.words.length < words.length || frame < T[0] || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const shown = T.filter((t) => frame >= t).length;
  const last = L.words[shown - 1];
  const w0 = L.words[0].x;
  const wNow = last.x + last.width - w0;
  const left = align === 'left' ? (x ?? width * 0.1) : (x ?? width / 2) - wNow / 2;
  const top = (y ?? height / 2) - L.height / 2;
  const cell = Math.max(2, Math.round(size * 0.085));
  return (
    <div style={{ position: 'absolute', left, top, height: L.height }}>
      {words.map((wd, i) => {
        if (i >= shown) return null;
        const g = L.words[i];
        const age = frame - T[i];
        const X = g.x - w0;
        const flipped = flip && flip.index === i && frame >= flip.at;
        // a flipped word that has landed keeps the line's weight (italic only), so it never crowds its neighbours
        const settled = !!flipped && age >= holds[0] + holds[1];
        if (age < holds[0])
          return (
            <div key={i} style={{ position: 'absolute', left: X, top: 0, height: L.height }}>
              <PixelText text={wd} size={size} font={font} weight={650} color={accent} cell={cell} baseline={g.baseline} height={L.height} />
            </div>
          );
        if (age < holds[0] + holds[1] || flipped)
          return (
            <span key={i} style={{ ...style, position: 'absolute', left: X, top: 0, whiteSpace: 'pre', ...(serif ? { fontFamily: fonts.serif, fontWeight: 400, letterSpacing: 0 } : { fontWeight: settled ? weight : 650 }), fontStyle: 'italic', color: settled ? color : accent }}>
              {wd}
            </span>
          );
        return (
          <span key={i} style={{ ...style, position: 'absolute', left: X, top: 0, whiteSpace: 'pre', color }}>
            {wd}
          </span>
        );
      })}
    </div>
  );
};

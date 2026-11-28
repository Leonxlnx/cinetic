// LetterRewrite (type, emphasis): a held word is rewritten into the next one in place: its letters go from the end one
// by one, then the new word's letters rise in from just under the baseline, the line re-centring on every letter.
// Numbers: a letter removed every 2 f; a new letter every 2-3 f, each rising 0.12 em over 4 f (ease-out); the line
// re-centres by cut as its width changes.
// Caution: short words (up to about 10 letters) where the change of word is the point; not for a whole sentence.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { useTextLayout } from '../../type';

/**
 * LetterRewrite: `from` is there until `at`; then its letters are removed from the end, one every `out` frames, and
 * `to` is written letter by letter, one every `per` frames, each letter rising in; `color` can change to `toColor`
 * for the new word. `keep` letters of `from`'s start may stay (a word rewritten from its common start).
 */
export const LetterRewrite: React.FC<{
  from: string;
  to: string;
  at?: number;
  out?: number;
  per?: number;
  keep?: number;
  size?: number;
  color?: string;
  toColor?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ from, to, at = 0, out = 2, per = 2.5, keep = 0, size = 120, color = '#141414', toColor, leaveAt, x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const LA = useTextLayout(from, style);
  const LB = useTextLayout(to, style);
  if (!LA.ready || !LB.ready || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const A = Array.from(from);
  const B = Array.from(to);
  const removed = frame < at ? 0 : Math.min(A.length - keep, 1 + Math.floor((frame - at) / out));
  // the first new letter lands on the frame the last old one goes (never an empty frame)
  const startB = at + Math.max(0, A.length - keep - 1) * out;
  const added = frame < startB ? 0 : Math.min(B.length - keep, 1 + Math.floor((frame - startB) / per));
  // what is on: the kept start, the rest of the old word or the new letters so far
  const writing = frame >= startB;
  const L = writing ? LB : LA;
  const n = writing ? keep + added : A.length - removed;
  const chars = writing ? B : A;
  const last = L.chars[Math.max(0, n - 1)];
  const w = n > 0 ? last.x + last.width : 0;
  const left = (x ?? width / 2) - w / 2;
  const top = (y ?? height / 2) - L.height / 2;
  return (
    <div style={{ position: 'absolute', left, top }}>
      {chars.slice(0, n).map((c, i) => {
        const bornAt = writing && i >= keep ? startB + Math.floor((i - keep) * per) : -Infinity;
        const q = clamp((frame - bornAt + 1) / 4);
        const rise = (1 - (1 - (1 - q) ** 3)) * size * 0.12;
        return (
          <span key={i} style={{ ...style, position: 'absolute', left: L.chars[i].x, top: rise, whiteSpace: 'pre', color: writing && toColor ? toColor : color }}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

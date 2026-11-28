// CutAway (type, exit): a held line leaves by losing whole words by cut, from its end (re-centring as it shrinks) or
// from its start (the rest staying in place), a step every frame or two.
// Numbers: from the end two words a frame, re-centred by cut on each step (3 steps for a 5-word line); from the start one
// word every 2-3 f, nothing moves.
// Caution: a cut exit is the default; this one is for a line that should be seen to be taken apart (a hand-over to the
// next phrase on the same spot). The next line cuts on alone after it.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';

/**
 * CutAway: the line is there whole until `at`; then every `per` frames `step` words are cut from its `from` end. From
 * the end the remaining words re-centre on every step (by cut, no glide); from the start they keep their places. The
 * line is gone when the last word is cut.
 */
export const CutAway: React.FC<{
  text: string;
  at?: number;
  /** Frames between steps (default 1). */
  per?: number;
  /** Words cut a step (default 2 from the end, 1 from the start). */
  step?: number;
  from?: 'end' | 'start';
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, per = 1, step, from = 'end', size = 96, color = '#141414', x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  const words = text.split(/\s+/).filter(Boolean);
  if (!L.ready || L.words.length < words.length) return null;
  const n = words.length;
  const k = step ?? (from === 'end' ? 2 : 1);
  const steps = frame < at ? 0 : 1 + Math.floor((frame - at) / Math.max(1, per));
  const gone = Math.min(n, steps * k);
  if (gone >= n) return null;
  const keep = from === 'end' ? words.map((_, i) => i < n - gone) : words.map((_, i) => i >= gone);
  const first = keep.indexOf(true);
  const last = keep.lastIndexOf(true);
  const full = L.words[n - 1].x + L.words[n - 1].width - L.words[0].x;
  const shownW = L.words[last].x + L.words[last].width - L.words[first].x;
  const cx = x ?? width / 2;
  // from the end the rest re-centres; from the start the rest stays where the whole line put it
  const left = from === 'end' ? cx - shownW / 2 - (L.words[first].x - L.words[0].x) : cx - full / 2;
  const top = (y ?? height / 2) - L.height / 2;
  return (
    <div style={{ position: 'absolute', left, top }}>
      {words.map((w, i) =>
        keep[i] ? (
          <span key={i} style={{ ...style, position: 'absolute', left: L.words[i].x - L.words[0].x, top: 0, whiteSpace: 'pre', color }}>
            {w}
          </span>
        ) : null,
      )}
    </div>
  );
};

// ScaleJump (type, enter / emphasis): one word giant and cropped, pushing in; hard cuts to a middle size, then to
// line size, the rest of the line joining.
// Numbers: the giant (3.9x) pushes 1 to 1.12 for 9 f, a 2 f cut at 1.7x, then line size; the first word is 0.26 of
// the giant.
// Caution: the giant word must be short (up to about 9 letters) or it reads as noise.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { growLeft } from './_shared';

/**
 * ScaleJump: one word, giant, filling the frame edge to edge (cropped by it), pushing in and rising for a few frames;
 * a hard cut to the same word at a middle size for two frames, a cut again to it at line size; then the rest of the
 * line joins it word by word, the line jumping to its new centre on each word. Size as meaning: the big word is the
 * idea, the small line is the sentence.
 */
export const ScaleJump: React.FC<{
  text: string;
  at?: number;
  /** The giant size as a multiple of `size` (default 3.9) and the middle step (default 1.7). */
  big?: number;
  mid?: number;
  /** Frames the giant word holds (default 9) and the middle step (default 2). */
  hold?: number;
  midFor?: number;
  /** Start frames of the following words (default every 12 frames after the line appears). */
  times?: number[];
  /** Frames of the line's re-centre per word (default 0: a jump, as a cut). */
  recentre?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, big = 3.9, mid = 1.7, hold = 9, midFor = 2, times, recentre = 0, size = 150, color = '#141414', x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const words = text.split(/\s+/).filter(Boolean);
  const lineAt = at + hold + midFor;
  if (frame < lineAt) {
    const giant = frame < at + hold;
    const p = prog(frame, at, hold, ease.out);
    const s = giant ? big * mix(p, 1, 1.12) : mid;
    // as measured: it starts low, cropped by the bottom edge, and rises as it grows
    const dy = giant ? mix(p, size * big * 0.38, size * big * 0.15) : 0;
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx}px, ${cy + dy}px) translate(-50%, -50%) scale(${s})`, ...style, color, whiteSpace: 'pre' }}>
        {words[0]}
      </div>
    );
  }
  const T = [lineAt, ...words.slice(1).map((_, i) => times?.[i] ?? lineAt + 12 * (i + 1))];
  const left = growLeft(L, cx, T, frame, recentre);
  const w0 = L.words[0].x;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((wd, i) =>
        frame >= T[i] ? (
          <span key={i} style={{ ...style, position: 'absolute', transform: `translate(${left + L.words[i].x - w0}px, ${cy - L.height / 2}px)`, left: 0, top: 0, color, whiteSpace: 'pre' }}>
            {wd}
          </span>
        ) : null,
      )}
    </div>
  );
};

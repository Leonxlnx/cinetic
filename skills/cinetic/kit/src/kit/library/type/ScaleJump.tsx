// ScaleJump (type, enter / emphasis): one word giant and cropped, pushing in; hard cuts to a middle size, then to
// line size, the rest of the line joining.
// Numbers: the giant (3.9x) pushes 1 to 1.12 for 9 f (an exponential push still moving into the cut), a 2 f cut at
// 1.7x, then line size; the first word is 0.26 of the giant; the line glides to each new centre (9 f, from rest) and the
// finished line keeps a slow idle.
// Caution: the giant word must be short (up to about 9 letters) or it reads as noise.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { mix } from '../../motion';
import { holdIdle } from '../_shared';
import { useTextLayout } from '../../type';
import { growLeft } from './_shared';

/**
 * ScaleJump: one word, giant, filling the frame edge to edge (cropped by it), pushing in and rising for a few frames;
 * a hard cut to the same word at a middle size for two frames, a cut again to it at line size; then the rest of the
 * line joins it word by word, the line gliding to its new centre on each word (`recentre={0}`: a jump, as a cut); the
 * finished line keeps a slow idle (`idle={false}` holds it still). Size as meaning: the big word is the
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
  /** Frames of the line's re-centre per word (default 9: a glide from rest; 0: a jump, as a cut). */
  recentre?: number;
  /** A slow drift and push on the finished line (default true). */
  idle?: boolean;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, big = 3.9, mid = 1.7, hold = 9, midFor = 2, times, recentre = 9, idle = true, size = 150, color = '#141414', x, y, font = fonts.inter, weight = 600 }) => {
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
    // an exponential push that is still moving on the cut (it hands its speed to the cut, never stops dead before it)
    const p = (1 - Math.pow(0.5, (frame - at + 1) / 4)) / (1 - Math.pow(0.5, hold / 4));
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
  const hold2 = idle ? holdIdle(frame, T[T.length - 1] + Math.max(recentre, 1), { drift: 4, push: 0.005, roll: 0, seed: 5 }) : null;
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: hold2 ? hold2.transform : undefined }}>
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

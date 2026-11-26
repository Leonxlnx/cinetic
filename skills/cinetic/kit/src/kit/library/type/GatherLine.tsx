// GatherLine (type, enter): the words (or letters) of a line sit scattered across the frame and drift slowly, then
// gather into one set line: on a single frame (a cut, the sizes and the face already exact) or by a short ease-in slide.
// Numbers: scattered over 50 % x 32 % of the frame round the line's place; drift 3-5 px a frame at 1080 p for 15-20 f;
// the gather a one-frame snap, or an ease-in slide over 4 f; scattered pieces may take a colour and change it every 3 f
// until they land.
// Caution: the scattered pieces must already be the line's size and face, or the snap reads as a jump in size.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp } from '../../motion';
import { useTextLayout } from '../../type';
import { hash } from './_shared';

/**
 * GatherLine: from `at` the pieces of `text` (`by` words or letters) sit at seeded places spread over `spread` of the
 * frame, drifting at `drift` px a frame (1080 p) in seeded directions; at `gatherAt` they take their places in the
 * centred line: `mode="snap"` on one frame, `mode="slide"` by an ease-in over `dur` frames. `colors` gives the
 * scattered pieces colours that shuffle every 3 frames; they land in `color`.
 */
export const GatherLine: React.FC<{
  text: string;
  at?: number;
  gatherAt: number;
  by?: 'word' | 'letter';
  mode?: 'snap' | 'slide';
  dur?: number;
  spread?: [number, number];
  drift?: number;
  colors?: string[];
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, gatherAt, by = 'word', mode = 'snap', dur = 4, spread = [0.5, 0.32], drift = 4, colors, size = 72, color = '#141414', leaveAt, x, y, font = fonts.inter, weight = 500, seed = 11 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const chars = Array.from(text);
  const pieces =
    by === 'word'
      ? text
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i) => ({ t: w, box: L.words[i] }))
      : chars.map((c, i) => ({ t: c, box: L.chars[i] })).filter((p) => p.t.trim());
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const left0 = cx - L.width / 2;
  const top0 = cy - L.height / 2;
  const u = height / 1080;
  const f = frame - at;
  const g = mode === 'snap' ? (frame >= gatherAt ? 1 : 0) : clamp((frame - gatherAt + 1) / dur) ** 2.2;
  return (
    <>
      {pieces.map((p, i) => {
        // scattered place: a seeded spot in the spread box, avoiding a pile in the middle, plus the drift so far
        const sx = (hash(i, seed) - 0.5) * spread[0] * width;
        const sy = (hash(i, seed + 3) - 0.5) * spread[1] * height;
        const ang = hash(i, seed + 7) * Math.PI * 2;
        const v = drift * u * (0.75 + hash(i, seed + 9) * 0.5);
        const fx = Math.min(f, gatherAt - at);
        const scX = cx + sx + Math.cos(ang) * v * fx - p.box.width / 2;
        const scY = cy + sy + Math.sin(ang) * v * fx - L.height / 2;
        const X = scX + (left0 + p.box.x - scX) * g;
        const Y = scY + (top0 - scY) * g;
        const c = g < 1 && colors?.length ? colors[Math.floor(hash(i + Math.floor(f / 3) * 5, seed) * colors.length)] : color;
        return (
          <span key={i} style={{ ...style, position: 'absolute', left: X, top: Y, whiteSpace: 'pre', color: c }}>
            {p.t}
          </span>
        );
      })}
    </>
  );
};

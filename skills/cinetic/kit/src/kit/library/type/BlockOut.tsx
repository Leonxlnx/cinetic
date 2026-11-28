// BlockOut (type, exit / join): the line is replaced by a solid block of its width, which grows to cover the frame or
// snaps shut to the right.
// Numbers: the block is the ink width plus 0.06 em a side, 0.86 em tall; the cover grows in log space over 12 f
// (collapse 7 f).
// Caution: the next shot must start on exactly the cover colour, or the turn reads as a colour jump.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, logScale, mix, at as prog } from '../../motion';
import { mixColor, useTextLayout } from '../../type';

/**
 * BlockOut: an exit that is also a turn. On `at` the line is replaced by a solid block of its own width (a cut, as if
 * the words were selected), and two frames later the block either grows to cover the whole frame (`mode="cover"`: the
 * next shot starts on its colour, a ground cut made from the words) or snaps shut to the right (`mode="collapse"`).
 */
export const BlockOut: React.FC<{
  text: string;
  /** Frame the line is there (a cut). */
  from?: number;
  at: number;
  mode?: 'cover' | 'collapse';
  /** The block's colour (default the line's) and the colour it covers the frame in (default the same). */
  block?: string;
  cover?: string;
  /** Frames of the cover or the collapse (default 12 and 7). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, from = 0, at, mode = 'cover', block, cover, dur, size = 120, color = '#141414', x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < from) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const left = cx - L.width / 2;
  const top = cy - L.height / 2;
  if (frame < at)
    return (
      <div style={{ ...style, position: 'absolute', left, top, color, whiteSpace: 'pre' }}>
        {text}
      </div>
    );
  const bc = block ?? color;
  const a = L.words[0].ink;
  const b = L.words[L.words.length - 1].ink;
  const box = { x: left + a.x - size * 0.06, y: top + L.baseline - size * 0.76, w: b.x + b.width - a.x + size * 0.12, h: size * 0.86 };
  const t = frame - at - 2;
  if (mode === 'collapse') {
    const q = t < 0 ? 0 : prog(frame, at + 2, dur ?? 7, ease.in);
    if (q >= 1) return null;
    return <div style={{ position: 'absolute', left: box.x + box.w * q, top: box.y, width: box.w * (1 - q), height: box.h, background: bc }} />;
  }
  const q = t < 0 ? 0 : prog(frame, at + 2, dur ?? 12, ease.inOut);
  // grow in log space so the block keeps an even visual speed from word size to frame size
  const W = logScale(box.w, width * 1.02, q);
  const Hh = logScale(box.h, height * 1.02, q);
  const X = mix(q, box.x + box.w / 2, width / 2) - W / 2;
  const Y = mix(q, box.y + box.h / 2, height / 2) - Hh / 2;
  return <div style={{ position: 'absolute', left: X, top: Y, width: W, height: Hh, background: cover ? mixColor(bc, cover, q) : bc }} />;
};

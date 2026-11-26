// SplitWord (type, enter / emphasis): a big word split in two around a picture: the halves cut on either side of it
// (the left half first), their inner letters tucked under its edges, while the picture smears vertically and swaps to
// the next one.
// Numbers: picture 1.3 em wide and 1 em tall, overlapping each half by 0.12 em; the right half 5 f after the left (or both
// slide out from behind it over 6 f, ease-out); the picture smears (vertical blur 0.1 em) for 5 f before its swap and 1 f after.
// Caution: one word of 6-10 letters, split where both halves read (Map / ping, not M / apping); the picture is the
// word's subject.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { useUid } from '../_shared';

/**
 * SplitWord: `text` split after letter `split`, set around a picture slot at the centre. From `at` the left half
 * is there, the right half `stagger` frames later (`slide`: each slides out from behind the picture); the picture shows `pictures[0]`, smears
 * from `swapAt - 5` and is `pictures[1]` from `swapAt` (and so on for more `swaps`).
 */
export const SplitWord: React.FC<{
  text: string;
  split: number;
  at?: number;
  stagger?: number;
  /** The halves slide out from behind the picture instead of cutting on in place (default false). */
  slide?: boolean;
  pictures: string[];
  swaps?: number[];
  /** Picture size in em (default 1.3 x 1). */
  w?: number;
  h?: number;
  size?: number;
  color?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, split, at = 0, stagger = 5, slide = false, pictures, swaps = [], w = 1.3, h = 1, size = 190, color = '#111111', leaveAt, x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useUid('splitword');
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1.1 } as const;
  const A = text.slice(0, split);
  const B = text.slice(split);
  const LA = useTextLayout(A, style);
  const LB = useTextLayout(B, style);
  if (!LA.ready || !LB.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const pw = w * size;
  const ph = h * size;
  const tuck = size * 0.12;
  const top = cy - LA.height / 2;
  // the halves cut on in place (or, with `slide`, slide out from behind the picture over 6 f)
  const pa = slide ? prog(frame, at, 6, ease.out) : 1;
  const pb = slide ? prog(frame, at + stagger, 6, ease.out) : 1;
  // each half rests flush against the picture (minus the tuck); it starts hidden behind it
  const aRest = cx - pw / 2 + tuck - LA.width;
  const bRest = cx + pw / 2 - tuck;
  const aX = mix(pa, aRest + pw * 0.7, aRest);
  const bX = mix(pb, bRest - pw * 0.7, bRest);
  const k = swaps.filter((s) => frame >= s).length;
  const next = swaps[k];
  const smear = (next !== undefined && frame >= next - 5) || (k > 0 && frame - swaps[k - 1] < 1);
  const pic = pictures[Math.min(k, pictures.length - 1)];
  // the picture sits on the type's x-height band
  const midY = top + (LA.words[0]?.xMid ?? LA.height / 2) - size * 0.08;
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id} x="0" y="-10%" width="100%" height="120%">
          <feGaussianBlur stdDeviation={`0 ${size * 0.1}`} edgeMode="duplicate" />
        </filter>
      </svg>
      {frame >= at + stagger && <span style={{ ...style, position: 'absolute', left: bX, top, whiteSpace: 'pre', color, clipPath: `inset(-20% -20% -20% ${Math.max(0, cx - bX)}px)` }}>{B}</span>}
      <span style={{ ...style, position: 'absolute', left: aX, top, whiteSpace: 'pre', color, clipPath: `inset(-20% ${Math.max(0, aX + LA.width - cx)}px -20% -20%)` }}>{A}</span>
      <div style={{ position: 'absolute', left: cx - pw / 2, top: midY - ph / 2, width: pw, height: ph, overflow: 'hidden', background: '#CFCCC6' }}>
        <Img src={staticFile(pic)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: smear ? `url(#${id})` : undefined, transform: smear ? 'scale(1.08)' : undefined }} />
      </div>
    </>
  );
};

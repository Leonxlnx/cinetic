// SlideOff (type, exit): a held line leaves sideways, accelerating into the cut and smearing more as it goes; two lines
// can shear apart (the first to the left, the second to the right).
// Numbers: a creep that accelerates (each frame's step 1.3 times the last) over 14 f, 45 % of the width in all; the
// smear 0.15 of the speed in px, from nothing to about 0.35 em on the last frames; the cut comes while it moves.
// Caution: an exit at speed belongs where the next shot starts moving too; on a hold it reads as a stumble.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { accel } from '../../motion';
import { useTextLayout } from '../../type';
import { useUid } from '../_shared';
import { WideSmear } from './_shared';

/**
 * SlideOff: `lines` (one or two) held centred until `at`, then they slide off over `dur` frames, accelerating:
 * `dir` 'left' or 'right' for all lines, or 'shear' (the first line to the left, the second to the right). The cut
 * (`leaveAt`, default `at + dur`) comes on the move.
 */
export const SlideOff: React.FC<{
  lines: string[];
  at?: number;
  dur?: number;
  dir?: 'left' | 'right' | 'shear';
  leaveAt?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ lines, at = 0, dur = 14, dir = 'left', leaveAt, size = 110, color = '#141414', x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useUid('slideoff');
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.08 } as const;
  const L0 = useTextLayout(lines[0] ?? '', style);
  const L1 = useTextLayout(lines[1] ?? '', style);
  if (!L0.ready || frame >= (leaveAt ?? at + dur)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const travel = width * 0.45;
  const q = accel(frame, at, dur, 1.3);
  const qPrev = accel(frame - 1, at, dur, 1.3);
  const speed = (q - qPrev) * travel;
  const smear = Math.min(size * 0.35, speed * 0.15);
  const lh = size * 1.08;
  const Ls = [L0, L1].slice(0, lines.length);
  return (
    <>
      <WideSmear id={id} x={smear} />
      {Ls.map((L, i) => {
        const sgn = dir === 'right' ? 1 : dir === 'left' ? -1 : i === 0 ? -1 : 1;
        const top = cy - (lh * Ls.length) / 2 + i * lh + (lh - L.height) / 2;
        return (
          <div key={i} style={{ ...style, position: 'absolute', left: cx - L.width / 2 + sgn * q * travel, top, whiteSpace: 'pre', color, filter: smear > 0.5 ? `url(#${id})` : undefined }}>
            {lines[i]}
          </div>
        );
      })}
    </>
  );
};

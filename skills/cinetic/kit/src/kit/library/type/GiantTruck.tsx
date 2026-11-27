// GiantTruck (type, enter / join): a cut to a giant line of type, cropped by the frame, already moving: the camera
// trucks along it right to left, fast at first and settling, smeared sideways while it is fast.
// Numbers: cap height 45 % of the frame; the line moves 10 % of the width a frame on the cut, each frame's step 0.86 of
// the last, settling at about 2.5 % a frame by 10 f; the sideways smear follows the speed (0.12 of it in px, up to
// 2 % of the width).
// Caution: three to six short words; the line is read as it passes, so keep it to one idea and hold on its last word.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { useUid } from '../_shared';
import { WideSmear } from './_shared';

/**
 * GiantTruck: from `at` the giant `text` passes right to left: its left edge starts at `start` of the width and the
 * camera's speed falls from `v0` (share of the width a frame) by `decay` each frame toward a slow `drift`, so the line
 * reads word by word and settles with its last word in the frame.
 */
export const GiantTruck: React.FC<{
  text: string;
  at?: number;
  /** Where the line's left edge starts, as a share of the width (default 0.15). */
  start?: number;
  v0?: number;
  decay?: number;
  drift?: number;
  size?: number;
  color?: string;
  leaveAt?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, start = 0.15, v0 = 0.1, decay = 0.86, drift = 0.022, size, color = '#141414', leaveAt, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = useUid('truck');
  const fs = size ?? Math.round(height * 0.62);
  const style = { fontFamily: font, fontWeight: weight, fontSize: fs, letterSpacing: '-0.035em', lineHeight: 1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  // travel so far: a geometric fall of the speed, never past the point where the last word sits in the frame
  const f = frame - at;
  const v = (i: number) => Math.max(drift, v0 * Math.pow(decay, i)) * width;
  let travel = 0;
  for (let i = 0; i < f; i++) travel += v(i);
  const maxTravel = Math.max(0, start * width + L.width - width * 0.92);
  const t = Math.min(travel, maxTravel);
  const speed = travel < maxTravel ? v(f) : 0;
  const smear = Math.min(width * 0.02, speed * 0.12);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <WideSmear id={id} x={smear} />
      <div style={{ ...style, position: 'absolute', transform: `translate(${start * width - t}px, ${(y ?? height / 2) - L.height / 2}px)`, left: 0, top: 0, whiteSpace: 'pre', color, filter: smear > 0.5 ? `url(#${id})` : undefined }}>{text}</div>
    </div>
  );
};

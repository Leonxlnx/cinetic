// PlateSqueeze (logo, join / build): the full-frame colour field the mark sits on squeezes in from both sides, then from
// top and bottom too, faster and faster, until it is the small square plate of the app icon around the mark; for a few
// frames the plate leaves a step of itself behind (an echo of the frame before); the mark shrinks with it.
// Numbers: sides only for 6 f (98, 96, 90, 84, 76, 66 % of W), then all four (50 x 90, 22 x 38, 15 x 27, 11 x 20 % of W x
// H), the plate at its size on 10 f; the echo on 6-9 f, offset 1.2 % of W and 2 % of H; the mark from `markScale` to 1
// with the width.
// Caution: the field must be the scene's whole ground (a flat colour); what is around the plate afterwards is the ground
// behind it, shown as the field leaves.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, keys, mix } from '../../motion';

// progress of the width and the height toward the plate, measured per frame
const PW: Array<[number, number]> = [[0, 0.02], [1, 0.04], [2, 0.11], [3, 0.17], [4, 0.26], [5, 0.37], [6, 0.54], [7, 0.84], [8, 0.91], [9, 0.96], [10, 1]];
const PH: Array<[number, number]> = [[0, 0], [5, 0], [6, 0.11], [7, 0.71], [8, 0.83], [9, 0.91], [10, 1]];

export const PlateSqueeze: React.FC<{
  at?: number;
  /** The field's colour (the plate's). */
  color?: string;
  /** The mark on the field (drawn at its plate size; scaled up by `markScale` while the field is full). */
  mark?: React.ReactNode;
  markScale?: number;
  /** The plate's side as a share of the short side, and its corner radius as a share of its side. */
  plate?: number;
  radius?: number;
  /** Where the plate ends (its centre), default the frame's centre. */
  x?: number;
  y?: number;
  echo?: boolean;
}> = ({ at = 0, color = '#3A6BF2', mark, markScale = 1.8, plate = 0.124, radius = 0.12, x, y, echo = true }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const t = f - at;
  const s = plate * Math.min(W, H);
  const box = (tt: number) => {
    const pw = tt < 0 ? 0 : keys(tt, PW, (v) => v);
    const ph = tt < 0 ? 0 : keys(tt, PH, (v) => v);
    const w = mix(pw, W, s);
    const h = mix(ph, H, s);
    // the centre travels from the frame's centre to (cx, cy) with the width
    const bx = mix(pw, W / 2, cx);
    const by = mix(ph, H / 2, cy);
    return { x: bx - w / 2, y: by - h / 2, w, h, pw, r: mix(ease.in(pw), 0, radius * s) };
  };
  const b = box(t);
  const e = box(t - 1);
  const k = mix(b.pw, markScale, 1);
  return (
    <AbsoluteFill>
      {echo && t >= 6 && t <= 9 && <div style={{ position: 'absolute', left: e.x + W * 0.012, top: e.y + H * 0.02, width: e.w, height: e.h, background: color, borderRadius: e.r }} />}
      <div style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, background: color, borderRadius: b.r }} />
      {mark && <div style={{ position: 'absolute', left: b.x + b.w / 2, top: b.y + b.h / 2, transform: `translate(-50%, -50%) scale(${k})` }}>{mark}</div>}
    </AbsoluteFill>
  );
};

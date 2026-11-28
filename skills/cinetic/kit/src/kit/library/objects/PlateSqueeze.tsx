// PlateSqueeze (logo, join / build): the full-frame colour field the mark sits on squeezes in from both sides, then from
// top and bottom too, faster and faster, until it is the small square plate of the app icon around the mark; for a few
// frames the plate leaves a step of itself behind (an echo of the frame before); the mark shrinks with it.
// Numbers: sides only for 6 f (98, 96, 90, 84, 76, 66 % of W), then all four (50 x 90, 22 x 38, 15 x 27, 11 x 20 % of W x
// H), on one continuous curve (keys joined by `chain`: the speed builds, peaks near f7 and lands on a 6 f tail: about 99 %
// by f11, at rest on f15); the echo on 6-9 f, offset 1.2 % of W and 2 % of H; the mark from `markScale` to 1
// with the width.
// Caution: the field must be the scene's whole ground (a flat colour); what is around the plate afterwards is the ground
// behind it, shown as the field leaves.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { chain, ease, mix } from '../../motion';

// progress of the width and the height toward the plate: the measured keys, joined into one gesture (`chain`: no
// corner, no one-frame jump, at rest at both ends) with a soft landing tail instead of the measured stop on f10
const PW: Array<[number, number]> = [[0, 0], [2, 0.11], [4, 0.26], [6, 0.54], [8, 0.9], [11, 0.985], [15, 1]];
const PH: Array<[number, number]> = [[0, 0], [4, 0], [7, 0.55], [9, 0.88], [12, 0.985], [15, 1]];

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
    const pw = tt < 0 ? 0 : chain(tt, PW);
    const ph = tt < 0 ? 0 : chain(tt, PH);
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
  const inset = (r: { x: number; y: number; w: number; h: number; r: number }, dx: number, dy: number) =>
    `inset(${r.y + dy}px ${W - r.x - r.w - dx}px ${H - r.y - r.h - dy}px ${r.x + dx}px round ${r.r}px)`;
  return (
    <AbsoluteFill>
      {/* the field and its echo are clipped (sub-pixel edges), never laid out in whole pixels */}
      {echo && t >= 6 && t <= 9 && <AbsoluteFill style={{ background: color, clipPath: inset(e, W * 0.012, H * 0.02) }} />}
      <AbsoluteFill style={{ background: color, clipPath: inset(b, 0, 0) }} />
      {mark && <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${b.x + b.w / 2}px, ${b.y + b.h / 2}px) translate(-50%, -50%) scale(${k})` }}>{mark}</div>}
    </AbsoluteFill>
  );
};

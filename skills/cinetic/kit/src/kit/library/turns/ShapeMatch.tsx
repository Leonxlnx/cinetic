// ShapeMatch (turn, join): one shape detaches and travels to where the same shape sits in the next scene, changing
// size, radius and colour.
// Numbers: 14 f, the shape on expo in-out; the old scene leaves on expo in over the first 80 % with up to 24 px
// smear.
// Caution: draw the shape in both scenes at exactly a and b; let the next scene's other parts arrive after the cut.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix } from '../../motion';
import { mixLab } from '../../world';
import { SmearFilter, t01, useUid } from '../_shared';
import { type Scenes, sp, type TurnBox } from './_shared';

/**
 * ShapeMatch: a match cut on shape. One shape in the old scene (an icon tile, a chip, a dot, a photo) detaches and travels
 * to where the same shape sits in the next scene, changing size, radius and colour on the way, while the old scene is
 * carried off the other way; the next scene cuts in around the shape the moment it lands.
 * Measured: 12-14 f; the shape on ease in-out; the old scene leaves with ease in and a smear, opposite to the shape's travel.
 * Draw the shape in both scenes at exactly `a` and `b`; `ground` is the next scene's ground (painted behind the travel).
 */
export const ShapeMatch: React.FC<
  Scenes & {
    a: TurnBox & { color: string };
    b: TurnBox & { color: string };
    dur?: number;
    ground: string;
    /** Drawn inside the travelling shape (a glyph, a mark), laid out at `b`'s size and scaled with the shape. */
    inside?: React.ReactNode;
  }
> = ({ from, to, at: start, speed = 1, a, b, dur = 14, ground, inside }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const uid = useUid('sm');
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D) return <AbsoluteFill>{to}</AbsoluteFill>;
  const t = t01(frame, start, D);
  const p = ease.inOut(t);
  const x = mix(p, a.x, b.x), y = mix(p, a.y, b.y), w = mix(p, a.w, b.w), h = mix(p, a.h, b.h), r = mix(p, a.r ?? 0, b.r ?? 0);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = -(b.x - a.x) / len, uy = -(b.y - a.y) / len;
  const q = ease.in(clamp(t / 0.8));
  const off = q * W * 0.9;
  const blur = 24 * clamp((q - 0.2) * 2);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      {blur > 0.5 && <SmearFilter id={`${uid}${frame}`} x={Math.abs(ux) * blur} y={Math.abs(uy) * blur} />}
      {q < 1 && (
        <AbsoluteFill style={{ transform: `translate(${ux * off}px, ${uy * off}px)`, filter: blur > 0.5 ? `url(#${uid}${frame})` : undefined }}>
          {/* the shape's own copy is cut out of the old scene: it is the travelling shape now */}
          <AbsoluteFill style={{ clipPath: `path(evenodd, 'M-50 -50H${W + 50}V${H + 50}H-50Z M${a.x - a.w / 2 - 1} ${a.y - a.h / 2 - 1}h${a.w + 2}v${a.h + 2}h${-a.w - 2}Z')` }}>{from}</AbsoluteFill>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, background: mixLab(a.color, b.color, p), overflow: 'hidden' }}>
        {inside && (
          <div style={{ position: 'absolute', left: (w - b.w) / 2, top: (h - b.h) / 2, width: b.w, height: b.h, transform: `scale(${w / b.w}, ${h / b.h})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inside}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

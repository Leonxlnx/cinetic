// ClipExit (type, exit): an object (an app icon, a window, a card) slides across a held line and the letters are cut
// at its leading edge, so the line disappears behind it as it passes; the object owns the frame after.
// Numbers: about one word every 2 f, the object and the line meeting halfway (the line slides into the object while it
// moves over the line) on a critically damped push (from rest, half-way at 30 % of the time, an exponential tail that
// lands on the last frame); from below (a window rising over a heading): 6 f ease-in. The object then keeps a slow idle.
// Caution: the object must be something the film shows next (the product's icon, the window the story goes into); a
// plain shape crossing the line reads as a wipe.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease, settle } from '../../motion';
import { holdIdle } from '../_shared';
import { useTextLayout } from '../../type';

/**
 * ClipExit: `text` held centred; from `at` the object (`node`, `w` x `h` px) travels over it for `dur` frames: `from`
 * 'left' (it starts at the line's left end and slides right, the letters cut at its right edge), 'right' (the mirror),
 * or 'below' (it rises from under the line and the letters are cut at its top edge). `rest` is where the object stops,
 * relative to the frame's centre (from below only). Sideways, the object and the line travel toward each other until
 * the line is gone, `meet` of the way by the line, from rest and landing on a soft tail. The object then keeps a slow idle
 * (`idle={false}` holds it still).
 */
export const ClipExit: React.FC<{
  text: string;
  at?: number;
  dur?: number;
  from?: 'left' | 'right' | 'below';
  node: React.ReactNode;
  w: number;
  h: number;
  rest?: { x: number; y: number };
  /** Frame the object first shows (default `at`: it is already beside the line from then). */
  objectAt?: number;
  /** Share of the travel the line makes toward the object (default 0.5; 0: only the object moves). */
  meet?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  /** A slow drift and push on the object once it rests (default true). */
  idle?: boolean;
}> = ({ text, at = 0, dur, from = 'left', node, w, h, rest, objectAt, meet = 0.5, size = 96, color = '#141414', x, y, font = fonts.inter, weight = 500, idle = true }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const W = L.width;
  const nWords = text.split(/\s+/).filter(Boolean).length;
  const D = dur ?? (from === 'below' ? 6 : Math.max(4, nWords * 2));
  // sideways: a critically damped push from rest (half-way at 30 % of the time), scaled to land exactly on the last frame
  const p = from === 'below' ? ease.in(clamp((frame - at) / D)) : clamp(settle(frame, at, D * 0.3) / settle(at + D, at, D * 0.3));
  const x0 = cx - W / 2;
  const top = cy - L.height / 2;
  // the object's centre: from beside the line's start to its rest
  let ox: number;
  let oy: number;
  let clip: string;
  let tx = 0;
  if (from === 'below') {
    const r = rest ?? { x: 0, y: -h * 0.1 };
    const startY = top + L.height + h / 2;
    oy = startY + (cy + r.y - startY) * p;
    ox = cx + r.x;
    const edge = oy - h / 2 - top; // the object's top edge, in the line's box
    clip = `inset(0 0 ${Math.max(0, L.height - edge)}px 0)`;
  } else {
    // the object and the line travel toward each other: `meet` of the relative travel is the line's
    const dir = from === 'left' ? 1 : -1;
    // the object starts beside the line, a quarter em clear of its first (or last) letter
    const g = size * 0.25;
    const startX = from === 'left' ? x0 - w / 2 - g : x0 + W + w / 2 + g;
    const D = W + g + size * 0.2;
    ox = startX + dir * (1 - meet) * D * p;
    oy = cy + (rest?.y ?? 0);
    tx = -dir * meet * D * p;
    const lead = from === 'left' ? ox + w / 2 - (x0 + tx) : ox - w / 2 - (x0 + tx);
    clip = from === 'left' ? `inset(-20% 0 -20% ${Math.max(0, lead)}px)` : `inset(-20% ${Math.max(0, W - lead)}px -20% 0)`;
  }
  const showObj = frame >= (objectAt ?? at);
  return (
    <>
      {(from === 'below' || p < 1) && <div style={{ ...style, position: 'absolute', left: 0, top: 0, transform: `translate(${x0 + tx}px, ${top}px)`, whiteSpace: 'pre', color, clipPath: frame >= at ? clip : undefined }}>{text}</div>}
      {showObj && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate(${ox - w / 2}px, ${oy - h / 2}px)${idle ? ` ${holdIdle(frame, at + D, { drift: 4, push: 0.005, roll: 0.1, seed: 9 }).transform}` : ''}` }}>
          {node}
        </div>
      )}
    </>
  );
};

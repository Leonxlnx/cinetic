// StickyType (ui, emphasis): a sticky label appears as a small square and stretches to the right as its words type
// into it (its width follows the text), while a connector draws from it to the thing it annotates.
// Numbers: the square pops in 2 f; letters from +3 f at 1.3 a frame, the label's right edge chasing the text (2 f
// behind); the connector draws in 5 f (linear) from +2 f, straight by default (`bow` bends it); the label is 1.9 times
// the text size tall, radius 18 % of its height, padding 0.55 of the text size, a soft lift shadow.
// Caution: three or four words at most; one label per thing; the label's colour means something in the product (a
// comment, a note), never a random yellow.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { useTextWidth } from '../../type';
import { type Look, useUiFrame } from './_shared';

export const StickyType: React.FC<{
  L: Look;
  text: string;
  at: number;
  /** The label's left edge and its vertical centre, px. */
  x: number;
  y: number;
  /** The point the connector reaches, px; omit for no connector. */
  to?: { x: number; y: number };
  /** The label's fill and the connector's colour. */
  color: string;
  ink?: string;
  line?: string;
  size?: number;
  /** The connector's bend, as a share of its length (0 = straight). */
  bow?: number;
}> = ({ L, text, at: start, x, y, to, color, ink, line, size: sizeIn, bow = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useUiFrame();
  const size = sizeIn ?? Math.min(W, H) * 0.03;
  const style: React.CSSProperties = { fontFamily: L.font, fontSize: size, fontWeight: 560, letterSpacing: '-0.01em' };
  const shownAt = (f: number) => clamp(Math.floor((f - (start + 3) + 1) * 1.3), 0, text.length);
  const n = shownAt(frame);
  const twNow = useTextWidth(text.slice(0, n) || ' ', style);
  const twLag = useTextWidth(text.slice(0, shownAt(frame - 2)) || ' ', style);
  if (frame < start) return null;
  const h = size * 1.9;
  const pad = size * 0.55;
  const pop = at(frame, start, 2, ease.out);
  // the label's width chases the typed text: between where the text was two frames ago and where it is now
  const w = Math.max(h, mix(0.6, n ? twLag : 0, n ? twNow : 0) + pad * 2);
  const draw = to ? at(frame, start + 2, 5, ease.linear) : 0;
  const ax = to ? to.x : x;
  const ay = to && to.y > y ? y + h / 2 : y - h / 2;
  const d = to ? `M${ax} ${ay} Q${mix(0.5, ax, to.x) + (to.y - ay) * bow} ${mix(0.5, ay, to.y)} ${to.x} ${to.y}` : '';
  return (
    <>
      {to && draw > 0 && (
        <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
          <path d={d} fill="none" stroke={line ?? L.ink} strokeWidth={Math.max(1.5, size * 0.07)} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        </svg>
      )}
      <div style={{ position: 'absolute', left: x, top: y - h / 2, width: w, height: h, borderRadius: h * 0.18, background: color, transform: `scale(${mix(pop, 0.6, 1)})`, transformOrigin: 'left center', opacity: clamp(pop * 2), boxShadow: '0 1px 1px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: pad, boxSizing: 'border-box', whiteSpace: 'pre', color: ink ?? L.ink, ...style }}>
        {text.slice(0, n)}
      </div>
    </>
  );
};

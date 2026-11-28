// SelectFrame (ui, emphasis): a 2 px accent selection frame dragged open from its top-left corner, handles popping on
// one after another.
// Numbers: the frame drags open from its top-left corner in 12 f; handles pop 2 f apart.
// Caution: frame the thing exactly; one selection at a time.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { at, ease, mix, springAt, springs } from '../../motion';
import { bez, type Look, useUiFrame } from './_shared';

/**
 * A selection frame dragged open: from `at` a 2 px accent rectangle grows from its top-left corner to its full size
 * (12 f, decelerating, the drag), its four square handles pop on as it lands (2 f apart), and a size tag in the accent
 * rises under it. Place it over the thing it selects (left, top, w, h in the parent).
 */
export const SelectFrame: React.FC<{ L: Look; at: number; left: number; top: number; w: number; h: number; tag?: string; size?: number }> = ({ L, at: a, left, top, w, h, tag, size = 30 }) => {
  const frame = useUiFrame();
  if (frame < a) return null;
  const d = at(frame, a, 12, bez(0.25, 0.1, 0.1, 1));
  const cw = w * d;
  const ch = h * d;
  const hs = size * 0.55;
  const tg = at(frame, a + 12, 8, ease.out);
  const handle = (hx: number, hy: number, k: number) => {
    const q = springAt(frame, 30, a + 9 + k * 2, springs.pop);
    return <div key={k} style={{ position: 'absolute', left: hx - hs / 2, top: hy - hs / 2, width: hs, height: hs, background: '#FFFFFF', border: `2px solid ${L.accent}`, boxSizing: 'border-box', transform: `scale(${q})` }} />;
  };
  return (
    <div style={{ position: 'absolute', left, top, width: cw, height: ch }}>
      <div style={{ position: 'absolute', inset: 0, border: `2px solid ${L.accent}`, background: `${L.accent}0D` }} />
      {[handle(0, 0, 0), handle(cw, 0, 1), handle(cw, ch, 2), handle(0, ch, 3)]}
      {tag && tg > 0 && (
        <div style={{ position: 'absolute', left: cw / 2, top: ch + size * 0.8 + mix(tg, 14, 0), transform: 'translateX(-50%)', padding: `${size * 0.18}px ${size * 0.45}px`, borderRadius: size * 0.3, background: L.accent, color: L.accentInk, fontFamily: L.font, fontSize: size, fontWeight: 600, whiteSpace: 'nowrap', opacity: tg, fontVariantNumeric: 'tabular-nums' }}>{tag}</div>
      )}
    </div>
  );
};

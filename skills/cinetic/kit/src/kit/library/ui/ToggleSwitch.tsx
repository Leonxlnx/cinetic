// ToggleSwitch (ui, emphasis): a switch whose knob travels with a stretch and a small overshoot while the track takes
// the accent.
// Numbers: the knob travels 9 f, 30 % wider mid-way, a small overshoot; the track takes the accent over 6 f.
// Caution: one control changes at a time.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { at, clamp, ease } from '../../motion';
import { mixColor } from '../../type';
import { bez, type Look, useUiFrame } from './_shared';

/**
 * A toggle that switches: the knob travels with a stretch (it widens 30 % mid-way and settles with a small overshoot,
 * 8 f), the track blends from its rest grey to the accent over 6 f, a soft glow in the accent breathes out once.
 */
export const ToggleSwitch: React.FC<{ L: Look; onAt: number; offAt?: number; size?: number; style?: React.CSSProperties }> = ({ L, onAt, offAt, size = 80, style }) => {
  const frame = useUiFrame();
  const curve = bez(0.3, 1.35, 0.45, 1);
  const p = at(frame, onAt, 9, curve) - (offAt !== undefined ? at(frame, offAt, 9, curve) : 0);
  const mid = Math.sin(clamp(p) * Math.PI);
  const W = size * 1.75;
  const g = Math.max(3, size * 0.07);
  const k = size - g * 2;
  const kw = k * (1 + 0.3 * mid);
  const col = clamp(at(frame, onAt, 6, ease.out) - (offAt !== undefined ? at(frame, offAt, 6, ease.out) : 0));
  const glow = at(frame, onAt + 2, 14, ease.out);
  return (
    <div style={{ position: 'relative', width: W, height: size, flexShrink: 0, borderRadius: size, background: mixColor(L.dark ? '#3A3C43' : '#DCDFE4', L.accent, col), boxShadow: `inset 0 1px 2px rgba(0,0,0,0.08), 0 0 ${glow * 40}px ${(1 - glow) * 12}px ${L.accent}${Math.round((1 - glow) * 80).toString(16).padStart(2, '0')}`, ...style }}>
      <div style={{ position: 'absolute', top: g, left: g + p * (W - g * 2 - k) - (kw - k) * clamp(p), width: kw, height: k, borderRadius: k, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.12)' }} />
    </div>
  );
};

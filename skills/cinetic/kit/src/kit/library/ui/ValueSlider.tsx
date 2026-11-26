// ValueSlider (ui, emphasis): a slider thumb follows eased keys, swelling with a soft accent halo while dragged, its
// value in a pill.
// Numbers: the thumb follows eased keys, swelling 10 % with a soft accent halo while dragged.
// Caution: drag it with a pointer along a straight move.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { at, ease, mix } from '../../motion';
import { bez, type Look, useUiFrame } from './_shared';

/**
 * A slider: the fill and thumb follow `keys` ([{ f, v }], 0..1, eased). While it is dragged (from 3 f before the first
 * key to the last) the thumb swells 10 % and a soft halo in the accent sits under it. `pill` shows the value above the
 * thumb in a dark pill (off when the value is printed beside it).
 */
export const ValueSlider: React.FC<{ L: Look; keys: Array<{ f: number; v: number }>; w?: number; size?: number; format?: (v: number) => string; pill?: boolean; style?: React.CSSProperties }> = ({ L, keys, w = 700, size = 34, format = (v) => `${Math.round(v * 100)}%`, pill = true, style }) => {
  const frame = useUiFrame();
  let v = keys[0].v;
  for (let i = 1; i < keys.length; i++) v = mix(at(frame, keys[i - 1].f, keys[i].f - keys[i - 1].f, bez(0.45, 0, 0.15, 1)), v, keys[i].v);
  const th = size * 1.3;
  const tr = size * 0.32;
  const held = keys.length > 1 ? at(frame, keys[0].f - 3, 4, ease.out) - at(frame, keys[keys.length - 1].f + 1, 6, ease.out) : 0;
  return (
    <div style={{ position: 'relative', width: w, height: th, flexShrink: 0, ...style }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: (th - tr) / 2, height: tr, borderRadius: tr, background: L.dark ? '#33353B' : '#E3E5E9' }} />
      <div style={{ position: 'absolute', left: 0, width: v * w, top: (th - tr) / 2, height: tr, borderRadius: tr, background: L.accent }} />
      <div style={{ position: 'absolute', left: v * w - th, top: -th / 2, width: th * 2, height: th * 2, borderRadius: th * 2, background: L.accent, opacity: held * 0.16 }} />
      <div style={{ position: 'absolute', left: v * w - th / 2, top: 0, width: th, height: th, borderRadius: th, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.14), 0 6px 16px rgba(0,0,0,0.14)', transform: `scale(${1 + held * 0.1})` }} />
      {pill && <div style={{ position: 'absolute', left: v * w, top: -size * 1.9, transform: 'translateX(-50%)', padding: `${size * 0.2}px ${size * 0.5}px`, borderRadius: size, background: L.ink, color: L.dark ? '#111' : '#FFF', fontFamily: L.font, fontSize: size * 0.9, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{format(v)}</div>}
    </div>
  );
};

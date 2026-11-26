// ConstructType (logo, build): the name is set like a design tool builds a text box: two handle dots appear one above
// the other, a hairline joins them, the line opens to the right into a box outline in held steps (the dots riding to its
// bottom-left and top-right corners), and the name types into the box, each letter arriving pale and turning to ink.
// Numbers: dots at 0 f, the hairline drawn on 2-5 f, the box widening 4, 12, 30, 62, 100 % of its width on 7-11 f, a
// letter every 1.3 f from 12 f, each pale for 3 f then ink; hairline 1.5 px; handles 0.13 of the text size; the box
// padded 0.35 of the text size round the name.
// Caution: the outline and handles stay quiet (one hairline colour); the name is the subject. A tool-like voice:
// design, building, developer brands.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, keys } from '../../motion';
import { mixColor, useTextLayout } from '../../type';
import { fonts } from '../../fonts';

export const ConstructType: React.FC<{
  name: string;
  at?: number;
  size?: number;
  ink?: string;
  /** The colour letters arrive in. */
  pale?: string;
  /** Hairline and handle colours. */
  line?: string;
  handle?: string;
  /** Frames a letter (1.3 measured). */
  per?: number;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
}> = ({ name, at = 0, size, ink = '#141519', pale = '#C9CBD0', line = 'rgba(20,21,25,0.35)', handle = '#141519', per = 1.3, style, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const ts = size ?? H * 0.075;
  const type: React.CSSProperties = { fontFamily: fonts.inter, fontSize: ts, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'pre', ...style };
  const L = useTextLayout(name, type);
  if (f < at || !L.ready) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const pad = ts * 0.35;
  const bw = L.width + pad * 2;
  const bh = L.height + pad * 0.8;
  const left = cx - bw / 2;
  const top = cy - bh / 2;
  const hs = ts * 0.13;
  const draw = clamp((t - 2) / 4);
  const open = keys(t, [[6, 0], [7, 0.04], [8, 0.12], [9, 0.3], [10, 0.62], [11, 1]], (v) => v);
  const w = Math.max(0, open * bw);
  const chars = Array.from(name);
  return (
    <AbsoluteFill>
      {/* the hairline, then the box */}
      {open <= 0 ? (
        draw > 0 && <div style={{ position: 'absolute', left: left - 0.75, top: top + bh * (1 - draw), width: 1.5, height: bh * draw, background: line }} />
      ) : (
        <div style={{ position: 'absolute', left, top, width: w, height: bh, boxShadow: `inset 0 0 0 1.5px ${line}` }} />
      )}
      {/* the handles: bottom-left stays, top-right rides out with the box */}
      <div style={{ position: 'absolute', left: left - hs / 2, top: top + bh - hs / 2, width: hs, height: hs, background: handle }} />
      <div style={{ position: 'absolute', left: left + w - hs / 2, top: top - hs / 2, width: hs, height: hs, background: handle }} />
      <div style={{ position: 'absolute', left: left + pad, top: cy - L.height / 2 }}>
        {chars.map((ch, i) => {
          const b = 12 + Math.round(i * per);
          const g = L.chars[i];
          if (t < b || !g) return null;
          return (
            <span key={i} style={{ ...type, position: 'absolute', left: g.x, top: 0, color: mixColor(pale, ink, t - b >= 3 ? 1 : 0) }}>
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

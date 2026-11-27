// TumbleLockup (logo, build): the app tile grows out of a dot with a tilt and a small overshoot, its glyph popping in
// last; the name's letters tumble in one after another to its right, each born small, slanted, in the tile's colour and
// low to the right, rising into place as it turns to ink.
// Numbers: the tile from a dot to 122 % in 6 f and back to 100 % by 10 f, its turn 15, -8, 0 degrees; the glyph pops at
// 7-9 f (0 to 110 to 100 %); letters 2 f apart from 1 f, each lands in 4 f (scale 50 to 100 %, slant 14 to 0 degrees,
// from 0.3 em right and 0.25 em low, colour from the tile's to the ink); the whole lockup 16 f.
// Caution: a bold, playful opener for a consumer brand; the letters stay set at the name's spacing (they move, the
// spacing never closes up).
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix, keys } from '../../motion';
import { mixColor, useTextLayout } from '../../type';
import { fonts } from '../../fonts';

export const TumbleLockup: React.FC<{
  name: string;
  /** The tile's glyph (drawn centred on the tile, in white by default). */
  glyph?: React.ReactNode;
  at?: number;
  /** The tile's colour (letters are born in it). */
  color?: string;
  ink?: string;
  /** Text size in px (default 10 % of the short side); the tile is 1.25 times it. */
  size?: number;
  /** Frames between letters (2 measured). */
  gap?: number;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
}> = ({ name, glyph, at = 0, color = '#F24A2E', ink = '#1B1416', size, gap = 2, style, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const ts = size ?? Math.min(W, H) * 0.1;
  const type: React.CSSProperties = { fontFamily: fonts.inter, fontSize: ts, fontWeight: 620, letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'pre', ...style };
  const L = useTextLayout(name, type);
  if (f < at || !L.ready) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const tile = ts * 1.25;
  const sep = ts * 0.3;
  const total = tile + sep + L.width;
  const left = cx - total / 2;
  const tScale = keys(t, [[0, 0.1], [6, 1.22], [10, 1]], ease.out);
  const tRot = keys(t, [[0, 15], [4, -8], [10, 0]], ease.inOut);
  const gp = keys(t, [[6, 0], [8, 1.1], [10, 1]], ease.out);
  const chars = Array.from(name);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left, top: cy - tile / 2, width: tile, height: tile, borderRadius: tile * 0.24, background: color, transform: `scale(${tScale}) rotate(${tRot}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {gp > 0 && <div style={{ transform: `scale(${gp})`, display: 'flex' }}>{glyph}</div>}
      </div>
      {chars.map((ch, i) => {
        const b = 1 + i * gap;
        if (t < b || !ch.trim()) return null;
        const p = ease.out(clamp((t - b + 1) / 4));
        const g = L.chars[i];
        return (
          <div
            key={i}
            style={{
              ...type,
              position: 'absolute',
              left: left + tile + sep + g.x,
              top: cy - L.height / 2,
              color: mixColor(color, ink, clamp((t - b) / 4)),
              transformOrigin: '30% 80%',
              transform: `translate(${mix(p, ts * 0.3, 0)}px, ${mix(p, ts * 0.25, 0)}px) scale(${mix(p, 0.5, 1)}) skewX(${mix(p, -14, 0)}deg)`,
            }}
          >
            {ch}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

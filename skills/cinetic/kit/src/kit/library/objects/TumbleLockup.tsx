// TumbleLockup (logo, build): the app tile grows out of a dot with a tilt and a small overshoot, its glyph on it from
// the first frame; the name's letters tumble in one after another to its right, each born small, slanted and low to the
// right, in the ink, rising into place.
// Numbers: the tile from a dot to 122 % in 6 f and back to 100 % by 10 f, its turn 15, -8, 0 degrees; the glyph rides
// the tile from frame 0 (80 to 106 to 100 % of it by 10 f); letters 2 f apart from 1 f, each lands in 4 f (scale 50 to
// 100 %, slant 14 to 0 degrees, from 0.3 em right and 0.25 em low; `born` gives them a colour to turn from); the whole
// lockup 16 f.
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
  /** The tile's colour. */
  color?: string;
  ink?: string;
  /** Text size in px (default 10 % of the short side); the tile is 1.25 times it. */
  size?: number;
  /** Frames between letters (2 measured). */
  gap?: number;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
  /** The colour the letters are born in (default the ink: they never land in the tile's colour and change). */
  born?: string;
}> = ({ name, glyph, at = 0, color = '#F24A2E', ink = '#1B1416', size, gap = 2, style, x, y, born }) => {
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
  // the glyph rides on the tile from its first frame (a tile never tumbles blank) and settles with a small pop of its own
  const gp = keys(t, [[0, 0.8], [6, 1.06], [10, 1]], ease.out);
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
              color: born ? mixColor(born, ink, clamp((t - b) / 4)) : ink,
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

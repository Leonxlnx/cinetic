// TileWord (type, enter / emphasis): a giant word builds out of a lattice of outlined cells on a tilted plane, then
// cuts flat, every tile dotted.
// Numbers: the plane goes from rotateX 58 / Y -38 / Z 26 at 2.3x to 24 / -16 / 9 at 1.32x in 14 f; holds 6 f; the
// flat word creeps 3 % over 60 f.
// Caution: give it the whole frame and a dark ground.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease, mix, at as prog } from '../../motion';
import { absCentre, hash, useRaster } from './_shared';

/**
 * TileWord: a giant word that builds itself out of a lattice. Outlined cells (crosses, rings, slashes) sweep in on a
 * tilted, rippling plane and fill solid into a blocky word with stepped edges; it holds tilted for a few frames, then
 * a hard cut shows it flat and whole, every tile with a dot at its centre, creeping. Fill the frame with it (the turn of
 * an argument), then cut to a small line.
 */
export const TileWord: React.FC<{
  text: string;
  at?: number;
  /** Font size in px (the word's cap height is about 0.72 of it). */
  size?: number;
  /** Tile size in px. */
  cell?: number;
  color?: string;
  /** The dot and the grid line between tiles: the ground's colour, usually. */
  ink?: string;
  /** Frames the assembly takes (default 14). */
  dur?: number;
  /** Frames the built word holds tilted before the cut to flat (default 6). */
  hold?: number;
  /** Frame the tiles dissolve away (6 frames). */
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, size = 600, cell = 24, color = '#EFEFEC', ink = '#0B0B0C', dur = 14, hold = 6, leaveAt, x, y, font = fonts.inter, weight = 700, seed = 11 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(text, { font, size, weight, cell, threshold: 0.5 });
  const t = frame - at;
  if (t < 0 || !R.ready) return null;
  // two shots, as measured: the lattice sweeps in tilted and huge and builds the word, holds tilted, then a hard cut
  // to the word flat and whole, which creeps
  const p = prog(frame, at, dur, ease.out);
  const flatAt = at + dur + hold;
  const flat = frame >= flatAt;
  const creep = prog(frame, flatAt, 60, ease.out);
  const q = leaveAt === undefined ? 0 : clamp((frame - leaveAt) / 6);
  const s = cell - 1.5;
  const w = R.w;
  const h = R.h;
  const tiltHold = 1 - prog(frame, at + dur, hold + 1, ease.linear) * 0.12;
  const transform = flat
    ? `scale(${1 + 0.03 * creep})`
    : `rotateX(${mix(p, 58, 24) * tiltHold}deg) rotateY(${mix(p, -38, -16) * tiltHold}deg) rotateZ(${mix(p, 26, 9) * tiltHold}deg) scale(${mix(p, 2.3, 1.32)})`;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), width: w, height: h, perspective: 1400 }}>
      <div
        style={{
          width: w,
          height: h,
          transformOrigin: '50% 50%',
          transform,
        }}
      >
        <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
          {R.cells.map((c, i) => {
            const r = hash(i, seed);
            // cells arrive over the first frames, left to right with scatter, as outlines first
            const born = at + (c.x / w) * dur * 0.35 + r * dur * 0.3;
            if (frame < born) return null;
            const fillAt = at + dur * 0.35 + (c.x / w) * dur * 0.45 + r * dur * 0.35;
            const filled = frame >= fillAt && !(c.edge && r < 0.07);
            const gone = q > 0 && hash(i, seed + 5) < q;
            if (gone) return null;
            // a warp that ripples through the lattice and dies out as it lands
            const amp = (1 - p) * cell * 2.4;
            const dx = Math.sin(c.row * 0.45 + t * 0.7) * amp;
            const dy = Math.cos(c.col * 0.35 + t * 0.55) * amp;
            const X = c.x - s / 2 + dx;
            const Y = c.y - s / 2 + dy;
            const mark = r < 0.33 ? 'x' : r < 0.55 ? 'o' : '/';
            if (filled && !flat) return <rect key={i} x={X - 0.5} y={Y - 0.5} width={cell + 0.5} height={cell + 0.5} fill={color} />;
            if (filled || flat)
              return (
                <g key={i}>
                  <rect x={X} y={Y} width={s} height={s} fill={color} />
                  <circle cx={X + s / 2} cy={Y + s / 2} r={Math.max(1.2, cell * 0.08)} fill={ink} />
                </g>
              );
            const sw = Math.max(1.2, cell * 0.07);
            return (
              <g key={i} stroke={color} strokeWidth={sw} fill="none">
                <rect x={X + sw / 2} y={Y + sw / 2} width={s - sw} height={s - sw} />
                {mark === 'x' && <path d={`M${X} ${Y}L${X + s} ${Y + s}M${X + s} ${Y}L${X} ${Y + s}`} />}
                {mark === 'o' && <circle cx={X + s / 2} cy={Y + s / 2} r={s * 0.3} />}
                {mark === '/' && <path d={`M${X} ${Y + s}L${X + s} ${Y}`} />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

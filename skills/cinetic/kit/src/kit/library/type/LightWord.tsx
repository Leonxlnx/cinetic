// LightWord (type, enter / emphasis): a bulging wall of coloured lights pulls back while a label decodes in the
// middle, then falls away to white lights.
// Numbers: pixels at 3.2x the pitch hold 4 f, pull back over 14 f; glyphs hold 2 f; the decode takes 24 f; the fall
// is gone in about 7 f.
// Caution: it fills the frame and is loud: once a film.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { ease, logScale, at as prog } from '../../motion';
import { useTextLayout } from '../../type';
import { absCentre, FrameCanvas, hash, useRaster } from './_shared';

const LIGHT_HUES = ['#FFFFFF', '#FFE45C', '#FF5FA2', '#3FD3F2', '#7FB0FF', '#FF8A3D', '#F4F4F4'];

const SCRAMBLE = '&@/\\[]{}<>+%#1?!';

/**
 * LightWord: a wall of round lights in saturated colours, bulging like a screen seen through a lens, twinkling on twos.
 * Over it, on a dark plate, the label scrambles through stray glyphs (held two frames each) and finds its real
 * characters left to right. At `resolveAt` the coloured lights fall away column by column and the label is redrawn in
 * white lights on black: the word now made of the same lights. A year, a number, a short word.
 */
export const LightWord: React.FC<{
  text: string;
  at?: number;
  /** Frame the coloured lights drop and the word becomes lights (default at + 36). */
  resolveAt?: number;
  /** Frames over which the label finds its characters (default 24). */
  decode?: number;
  size?: number;
  /** Pitch of the light grid in px (default 34). */
  pitch?: number;
  hues?: string[];
  /** The ground under the lights and inside the plate. */
  ground?: string;
  /** How strongly the wall bulges toward the lens (0 flat, default 0.22). */
  bulge?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, resolveAt, decode = 24, size = 230, pitch = 34, hues = LIGHT_HUES, ground = '#050505', bulge = 0.22, x, y, font = fonts.inter, weight = 500, seed = 19 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1 } as const;
  const L = useTextLayout(text, style);
  const cell = Math.max(6, Math.round(size / 14));
  const R = useRaster(text, { font, size, weight: Math.max(Number(weight), 640), cell, threshold: 0.38 });
  const t = frame - at;
  if (t < 0 || !L.ready || !R.ready) return null;
  const res = resolveAt ?? at + 36;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const tw = onTwosLocal(frame);
  const chars = Array.from(text);
  // the plate: the label's box with a ragged edge of whole cells
  const plateW = L.width + size * 0.5;
  const plateH = size * 1.3;
  const shown = chars
    .map((ch, i) => {
      if (!ch.trim()) return ch;
      const settle = at + Math.round((i / Math.max(1, chars.length - 1)) * decode * 0.7 + hash(i, seed) * decode * 0.3);
      if (frame >= settle) return ch;
      if (frame < at + i * 2) return ' ';
      return SCRAMBLE[Math.floor(hash(i * 7 + tw, seed) * SCRAMBLE.length)];
    })
    .join('');
  const resolved = frame >= res;
  return (
    <div style={{ position: 'absolute', inset: 0, background: ground }}>
      <FrameCanvas
        w={width}
        h={height}
        deps={[frame, R.ready, resolved]}
        draw={(ctx) => {
          // the camera pulls back from the wall over the first frames: big square pixels become a field of small dots
          const pull = prog(frame, at + 4, 14, ease.inOut);
          const pp = logScale(pitch * 3.2, pitch, pull);
          const hc = Math.ceil(width / 2 / pp) + 1;
          const hr = Math.ceil(height / 2 / pp) + 1;
          const rMax = Math.hypot(width / 2, height / 2);
          for (let jj = -hr; jj < hr; jj++)
            for (let ii = -hc; ii < hc; ii++) {
              const i = ii + 500;
              const j = jj + 500;
              const gx = width / 2 + (ii + 0.5) * pp;
              const gy = height / 2 + (jj + 0.5) * pp;
              // barrel: points near the centre spread out, the rim compresses
              const dx = gx - width / 2;
              const dy = gy - height / 2;
              const rn = Math.hypot(dx, dy) / rMax;
              const k = 1 + bulge * (1 - rn * rn);
              let X = width / 2 + dx * k;
              let Y = height / 2 + dy * k;
              let d = pp * (pp > pitch * 2 ? 0.94 : 0.82) * k * (1 - 0.35 * rn * rn);
              // inside the plate: dark
              const inPlate = Math.abs(X - cx) < plateW / 2 + (hash(i, j + seed) - 0.5) * pp * 1.2 && Math.abs(Y - cy) < plateH / 2 + (hash(j, i + seed) - 0.5) * pp;
              if (inPlate) continue;
              const idx = j * 1009 + i;
              // twinkle: a third of the lights change colour every two frames, a few go dark
              const h0 = hash(idx, seed + Math.floor(tw / 2) * (hash(idx, 3) < 0.33 ? 1 : 0));
              if (h0 < 0.12) continue;
              let alpha = 1;
              if (resolved) {
                // the fall: column by column, gravity, gone in ~10 frames
                const ft = frame - res - Math.floor(hash(i, seed + 9) * 4);
                if (ft > 0) {
                  Y += 0.5 * 16 * ft * ft + ft * 10;
                  X += (hash(idx, 5) - 0.5) * ft * 8;
                  d *= Math.max(0.3, 1 - ft * 0.08);
                  alpha = Math.max(0, 1 - ft / 7);
                }
                if (alpha <= 0 || Y > height + d) continue;
              }
              ctx.globalAlpha = alpha;
              ctx.fillStyle = hues[Math.floor(h0 * 997) % hues.length];
              ctx.beginPath();
              if (pp < pitch * 1.8 && rn < 0.6) ctx.arc(X, Y, d / 2, 0, Math.PI * 2);
              else ctx.roundRect(X - d / 2, Y - d / 2, d, d, d * 0.18);
              ctx.fill();
            }
          ctx.globalAlpha = 1;
          if (resolved) {
            // the word as white lights, the same size and place as the label
            const ox = cx - R.w / 2;
            const oy = cy - R.h / 2;
            ctx.fillStyle = '#F4F4F2';
            R.cells.forEach((c, n) => {
              const pop = frame - res - (hash(n, seed + 2) < 0.5 ? 0 : 1);
              if (pop < 0) return;
              ctx.beginPath();
              ctx.arc(ox + c.x, oy + c.y, cell * 0.42, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }}
      />
      {!resolved && (
        <div style={{ ...absCentre(cx, cy), ...style, color: '#FFFFFF', whiteSpace: 'pre', display: 'flex' }}>
          {Array.from(shown).map((ch, i) => (
            // every glyph sits in its real character's box, so the line never shifts while it scrambles
            <span key={i} style={{ display: 'inline-block', width: L.chars[i]?.width ?? 0, textAlign: 'center', whiteSpace: 'pre' }}>
              {ch}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const onTwosLocal = (f: number) => Math.floor(f / 2) * 2;

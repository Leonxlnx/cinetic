// DotWord (type, enter): a word in dot-matrix typed letter by letter, the dots soft square LEDs; glitch frames slip
// rows sideways.
// Numbers: a letter every 3 f (uneven); each letter's dots pop in over 2 f in a scatter; 22 px cells.
// Caution: a glitch frame is a seasoning: two in a shot at most.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { absCentre, FrameCanvas, hash, typeTimes, useRaster } from './_shared';

/**
 * DotWord: a word in dot-matrix, typed in letter by letter (each letter's dots pop in over two frames, in a scatter),
 * dots as soft square LEDs. `glitch` frames slice it into bands that slip sideways for one frame each (a screen being
 * re-read; no flash, the ground never changes).
 */
export const DotWord: React.FC<{
  text: string;
  at?: number;
  /** Frames per letter (default 3, uneven). */
  per?: number;
  size?: number;
  cell?: number;
  color?: string;
  /** Frames on which the dot rows slip sideways in bands. */
  glitch?: number[];
  /** 'square' LEDs (default) or 'round' dots. */
  shape?: 'square' | 'round';
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, per = 3, size = 420, cell = 22, color = '#F4F4F1', glitch = [], shape = 'square', x, y, font = fonts.geist, weight = 500, seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(text, { font, size, weight, cell, threshold: 0.45 });
  const times = typeTimes(text, at, per, seed);
  if (frame < at || !R.ready) return null;
  const inv = glitch.includes(frame);
  const W = R.w + cell * 6;
  const H = R.h + cell * 2;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), width: W, height: H }}>
      <FrameCanvas
        w={W}
        h={H}
        deps={[frame, R, inv]}
        draw={(ctx) => {
          const d = cell * 0.74;
          R.cells.forEach((c, i) => {
            const t0 = times[c.char] ?? at;
            const r = hash(i, seed);
            if (frame < t0 + (r < 0.5 ? 0 : 1)) return;
            // a glitch frame: bands of rows slip by whole cells, a few dots drop out
            const band = Math.floor(c.row / 3);
            const slip = inv ? Math.round((hash(band, frame + seed) - 0.5) * 5) * cell : 0;
            if (inv && hash(i, frame) < 0.18) return;
            const X = c.x + cell * 3 - d / 2 + slip;
            const Y = c.y + cell - d / 2;
            ctx.fillStyle = color;
            if (shape === 'round') {
              ctx.beginPath();
              ctx.arc(X + d / 2, Y + d / 2, d / 2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.roundRect(X, Y, d, d, d * 0.22);
              ctx.fill();
              ctx.fillStyle = 'rgba(0,0,0,0.16)';
              ctx.fillRect(X + d * 0.12, Y + d * 0.8, d * 0.76, d * 0.12);
            }
          });
        }}
      />
    </div>
  );
};

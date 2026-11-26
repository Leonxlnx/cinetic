// DotDive (type, join / exit): one plain letter cuts to dot-matrix, grows toward the lens and becomes a deep field of
// dots the camera flies through.
// Numbers: the plain letter holds 3 f; the dive runs 34 f; 18 px cells.
// Caution: the next shot must start on its last frame; held longer it is an empty starfield.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, logScale, mix } from '../../motion';
import { absCentre, FrameCanvas, hash, useRaster } from './_shared';

/**
 * DotDive: one letter becomes the way in. A small plain letter holds for a beat, cuts to the same letter in dot-matrix
 * that grows toward the lens, tilts back and turns into a deep field of dots that the camera flies through, the letter's
 * own dots rushing past. Cut to the next shot on its last frame (`at + dur`).
 */
export const DotDive: React.FC<{
  char: string;
  at?: number;
  /** Frames from the plain letter to the end of the dive (default 34). */
  dur?: number;
  size?: number;
  cell?: number;
  color?: string;
  /** The plain letter's colour (a dimmer step of `color`). */
  dim?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ char, at = 0, dur = 34, size = 420, cell = 18, color = '#F2F2EE', dim = '#8D8D89', x, y, font = fonts.geist, weight = 500, seed = 13 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(char, { font, size, weight, cell, threshold: 0.4 });
  const t = frame - at;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  if (t < 0 || t > dur || !R.ready) return null;
  const k = dur / 34; // the measured beat is 34 frames; everything scales with dur
  const plainEnd = Math.round(3 * k);
  const growEnd = Math.round(10 * k);
  if (t < plainEnd)
    return <div style={{ ...absCentre(cx, cy), fontFamily: font, fontWeight: 400, fontSize: size * 0.36, color: dim, lineHeight: 1 }}>{char}</div>;
  // grow: log-scale from 0.62 to 1.25 with an accelerating curve
  const g = clamp((t - plainEnd) / Math.max(1, growEnd - plainEnd));
  const diving = t >= growEnd;
  const dv = clamp((t - growEnd) / Math.max(1, dur - growEnd));
  // the first frames of the dive flicker between the flat letter and the field
  const flat = diving && t < growEnd + 4 * k && (t - growEnd) % 2 === 1;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <FrameCanvas
        w={width}
        h={height}
        deps={[frame, R]}
        draw={(ctx) => {
          const d = cell * 0.7;
          if (!diving || flat) {
            const sc = diving ? 1.3 : logScale(0.62, 1.25, Math.pow(g, 1.6));
            const tilt = diving ? 1 : 0;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tilt * -0.32);
            ctx.scale(sc, sc * (1 - tilt * 0.25));
            ctx.fillStyle = color;
            R.cells.forEach((c) => {
              ctx.beginPath();
              ctx.roundRect(c.x - R.w / 2 - d / 2, c.y - R.h / 2 - d / 2, d, d, d * 0.2);
              ctx.fill();
            });
            ctx.restore();
            return;
          }
          // the dive: the letter's dots at z = 0, a field of dots on a rolling surface behind; the camera moves in z
          const camZ = mix(Math.pow(dv, 1.7), -900, 1150);
          const f = 900;
          const project = (X: number, Y: number, Z: number) => {
            const dz = Z - camZ;
            if (dz < 30) return null;
            const s = f / dz;
            return { x: cx + X * s, y: cy + Y * s, s };
          };
          const fade = 1 - clamp((dv - 0.82) / 0.18);
          // field
          const n = 2600;
          for (let i = 0; i < n; i++) {
            const X = (hash(i, seed) - 0.5) * width * 4.2;
            const Y = (hash(i, seed + 1) - 0.5) * height * 4.2;
            const Z = 260 + hash(i, seed + 2) * 1400 + Math.sin(X * 0.002 + Y * 0.003) * 160;
            const P = project(X, Y, Z);
            if (!P) continue;
            const sz = Math.max(1.2, d * 0.55 * P.s);
            ctx.globalAlpha = Math.min(1, 0.25 + P.s * 0.6) * fade;
            ctx.fillStyle = color;
            ctx.fillRect(P.x - sz / 2, P.y - sz / 2, sz, sz);
          }
          // the letter, slightly tilted, extruded into three sheets
          for (let layer = 0; layer < 3; layer++)
            R.cells.forEach((c, i) => {
              const X = (c.x - R.w / 2) * 1.25;
              const Y = (c.y - R.h / 2) * 1.25 + X * 0.25;
              const Z = layer * 60 + (hash(i, seed + 4) - 0.5) * 30;
              const P = project(X, Y, Z);
              if (!P) return;
              const sz = d * 1.25 * P.s * (1 - layer * 0.2);
              ctx.globalAlpha = (layer === 0 ? 1 : 0.45) * fade;
              ctx.fillStyle = color;
              ctx.fillRect(P.x - sz / 2, P.y - sz / 2, sz, sz);
            });
          ctx.globalAlpha = 1;
        }}
      />
    </div>
  );
};

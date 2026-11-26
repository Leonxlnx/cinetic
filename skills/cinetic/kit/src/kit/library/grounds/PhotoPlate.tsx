// PhotoPlate (ground, idle / emphasis): a full-bleed photograph as the ground, pushing in slowly, with thin white
// outline shapes drawn onto it (a rectangle beside a circle, a pill, a ring) and a re-grade on an event.
// Numbers: push 1.04 to 1.10 over 10 s; outlines 1.5 px white at 1080, drawn in 14 f (expo out); a re-grade eases in
// over `tint.fade` frames (10, never under 8: a one-frame re-grade reads as a flash), multiply at about 45 %, held until
// `tint.until` and eased out the same way.
// Caution: one grade on every photograph of a film; the outlines frame the subject, never a word; a re-grade needs a
// reason on screen (an error, a state).
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease } from '../../motion';

export type PlateShape = { kind: 'rect' | 'circle' | 'pill'; x: number; y: number; w: number; h: number; at: number };

/**
 * PhotoPlate: `src` is a file in public/ (`img/...`) or a URL; `shapes` are outlines in shares of the frame, each
 * drawn from its `at`; `tint` multiplies a colour over the picture from `tint.at` (to `tint.until`), easing in and out
 * over `tint.fade` frames.
 */
export const PhotoPlate: React.FC<{
  src: string;
  at?: number;
  /** The picture's grade (a CSS filter for every picture of the film). */
  grade?: string;
  /** Push: scale at the start and per second. */
  zoom?: number;
  push?: number;
  /** Where the picture is anchored (CSS object-position). */
  position?: string;
  shapes?: PlateShape[];
  stroke?: string;
  tint?: { at: number; until?: number; color: string; amount?: number; fade?: number };
}> = ({ src, at = 0, grade = 'saturate(0.92) contrast(1.03)', zoom = 1.04, push = 0.006, position = '50% 50%', shapes = [], stroke = '#FFFFFF', tint }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const s = zoom + (push * Math.max(0, f - at)) / fps;
  const url = /^(https?:|data:|\/)/.test(src) ? src : staticFile(src.startsWith('img/') ? src : `img/${src}`);
  const sw = Math.max(1, 1.5 * (H / 1080));
  // the re-grade eases in and out (smoothstep over `fade`, at least 8 f) so the light of the frame never jumps
  const fade = Math.max(8, tint?.fade ?? 10);
  const smooth = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return c * c * (3 - 2 * c);
  };
  const tintK = tint ? smooth((f - tint.at) / fade) * (tint.until === undefined ? 1 : 1 - smooth((f - tint.until) / fade)) : 0;
  const tinted = tintK > 0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#111' }}>
      <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, transform: `scale(${s})`, filter: grade }} />
      {tint && tinted && <AbsoluteFill style={{ background: tint.color, mixBlendMode: 'multiply', opacity: (tint.amount ?? 0.45) * tintK }} />}
      {shapes.length > 0 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {shapes.map((sh, i) => {
            const p = prog(f, sh.at, 14, ease.out);
            if (p <= 0) return null;
            const x = sh.x * W;
            const y = sh.y * H;
            const w = sh.w * W;
            const h = sh.h * H;
            const rad = sh.kind === 'rect' ? 0 : Math.min(w, h) / 2;
            const per = sh.kind === 'circle' ? Math.PI * w : 2 * (w + h) - (8 - 2 * Math.PI) * rad;
            const common = { fill: 'none', stroke, strokeWidth: sw, strokeDasharray: per, strokeDashoffset: per * (1 - p) };
            return sh.kind === 'circle' ? <circle key={i} cx={x} cy={y} r={w / 2} {...common} transform={`rotate(-90 ${x} ${y})`} /> : <rect key={i} x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rad} {...common} />;
          })}
        </svg>
      )}
    </AbsoluteFill>
  );
};

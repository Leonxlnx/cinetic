/**
 * Plate: a real photograph or clip as the world behind a shot, graded to the film's palette and as sharp or soft as
 * its depth. Cover-framed on its focus point; a clip plays on the film's clock (OffthreadVideo, muted, frame exact).
 *
 *   depth   'near' as shot (the default) · 'mid' 5 px · 'far' 14 px (the world pushed behind UI in focus) · or px
 *           at 1080p. A fixed blur per plate, never animated (a rack focus cross-fades two plates).
 *   grade   a static grade: saturate, brightness and contrast filters, then a one-hue wash in a blend mode (the
 *           world's hue in `color` at 10-25 %: warm sun on a cloud drains toward the film's cool palette). The heavy
 *           grade is baked into the file by `scripts/assets.mjs plate`; this one sets the plate into the world.
 *   move    one purposeful camera move: from frame `from` to `to`, scale (a push of 1.04-1.10, log-mixed so its
 *           perceived speed is even) and a shift in px, on E.stdInOut: it starts, travels and lands, then holds.
 *           Never a drift: a plate without a move holds still.
 *
 * Cost: an unblurred plate is one image draw. A blurred one blurs a full frame every frame: prefer the pre-blurred
 * copy `scripts/assets.mjs plate` writes beside the plate (<name>-soft.jpg) and give it as the src at depth 0.
 */
import React from 'react';
import { Img, OffthreadVideo, useCurrentFrame } from 'remotion';
import { clamp, E, type Ease, lmix } from '../../lib/anim';
import { uOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import type { PlateGrade } from './worlds';

/** Blur in px at 1080p for each depth. */
export const PLATE_DEPTH = { far: 14, mid: 5, near: 0 } as const;
export type PlateDepth = keyof typeof PLATE_DEPTH | number;

export type PlateMove = { from: number; to: number; scale?: number; x?: number; y?: number; ease?: Ease };

export type PlateProps = {
  src: string; // a graded photo or clip (staticFile)
  focus?: [number, number]; // the point that stays put in the frame (shares of the picture), default the centre
  depth?: PlateDepth;
  grade?: PlateGrade | null;
  move?: PlateMove;
  frame?: number; // default the current frame
  trimBefore?: number; // a clip: the source frame shown at the plate's frame 0
  playbackRate?: number; // a clip: its speed (1 for anything with people or water)
  style?: React.CSSProperties;
};

/** The plate's camera at frame f: scale (log-mixed), shift x, y px. Holds before `from` and after `to`. Pure. */
export const plateMove = (f: number, m?: PlateMove) => {
  if (!m) return { s: 1, x: 0, y: 0 };
  const t = (m.ease ?? E.stdInOut)(clamp((f - m.from) / Math.max(1, m.to - m.from)));
  return { s: lmix(1, m.scale ?? 1, t), x: (m.x ?? 0) * t, y: (m.y ?? 0) * t };
};

export const isVideo = (src: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src);
export const depthBlur = (d?: PlateDepth) => (typeof d === 'number' ? d : PLATE_DEPTH[d ?? 'near']);
/** The plate's CSS filter: only the grade's non-identity parts and the depth blur (undefined when there is nothing to do). Pure. */
export const gradeFilter = (g: PlateGrade | null | undefined, blurPx: number) =>
  [
    g && g.saturate !== 1 ? `saturate(${g.saturate})` : '',
    g && g.brightness !== 1 ? `brightness(${g.brightness})` : '',
    g && g.contrast !== 1 ? `contrast(${g.contrast})` : '',
    blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : '',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

export const Plate: React.FC<PlateProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const m = plateMove(f, p.move);
  const blur = depthBlur(p.depth) * u;
  const margin = blur > 0 ? Math.ceil(blur * 3) : 0; // the blur samples real picture past the frame edge, never a dark fringe
  const [fx, fy] = p.focus ?? [0.5, 0.5];
  const media: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%` };
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', isolation: 'isolate', ...p.style }}>
      <div
        style={{
          position: 'absolute',
          inset: -margin,
          transform: `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px) scale(${m.s.toFixed(5)})`,
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
          filter: gradeFilter(p.grade, blur),
        }}
      >
        {isVideo(p.src) ? <OffthreadVideo src={p.src} muted trimBefore={p.trimBefore} playbackRate={p.playbackRate} style={media} /> : <Img src={p.src} style={media} />}
      </div>
      {p.grade && p.grade.tintMix > 0 ? <div style={{ position: 'absolute', inset: 0, background: p.grade.tint, mixBlendMode: p.grade.tintMode, opacity: p.grade.tintMix }} /> : null}
    </div>
  );
};

/** A plate is a picture: nothing steps or flashes (a clip slower than the film's rate: declare it with fx/Footage). */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

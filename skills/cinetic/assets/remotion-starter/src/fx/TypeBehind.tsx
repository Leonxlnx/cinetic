/**
 * Type that touches the picture: the line sits inside the shot instead of floating over it.
 *
 *   TypeBehind  the line behind the subject: the picture, then the line, then the subject again, cut out along a
 *               matte (a polygon in the image's own px, traced once on a still, as fx/Cutout's pieces are), so the
 *               person, the product or the hand stands in front of the words. `front` is anything else that passes
 *               over the line (a card that masks part of it, a phone sliding across). `ride` moves the picture, the
 *               line and the cut-out as one (the line riding a photo card as it travels).
 *
 * Keep the read: the subject covers at most the line's ends or the gaps between words while it is read (a covered
 * keyword is unread); the layout audit sees the line through its own probe, so a covered line still counts as read.
 * matteToBox() is pure (the matte in frame px for a picture cover-fitted into a box, as fx/Photo fits it).
 */
import React from 'react';
import type { Declares } from '../timeline';

/** A subject's outline in its image's own px (the image `w` x `h`). */
export type Matte = { points: [number, number][]; w: number; h: number };
export type Box = { x: number; y: number; w: number; h: number };

/** The matte's points in frame px for its image cover-fitted into `box` (`focus` places the crop, 0.5 0.5 = centred). Pure. */
export const matteToBox = (m: Matte, box: Box, focus: [number, number] = [0.5, 0.5]): [number, number][] => {
  const s = Math.max(box.w / m.w, box.h / m.h);
  const ox = box.x + (box.w - m.w * s) * focus[0];
  const oy = box.y + (box.h - m.h * s) * focus[1];
  return m.points.map(([x, y]) => [ox + x * s, oy + y * s]);
};

/** The CSS clip-path polygon of a matte in frame px. Pure. */
export const matteClip = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;

export const TypeBehind: React.FC<{
  picture: () => React.ReactNode; // draws the picture (called twice: the full picture and the cut-out over the line)
  line: React.ReactNode; // the line (a TypeLine, a TypeStack)
  matte?: Matte; // the subject's outline (with `box`, the box the picture is cover-fitted into)
  box?: Box;
  focus?: [number, number];
  front?: React.ReactNode; // anything else that passes over the line
  ride?: { x?: number; y?: number; s?: number; rot?: number }; // one move for the picture, the line and the cut-out
  style?: React.CSSProperties;
}> = (p) => {
  const r = p.ride ?? {};
  const clip = p.matte && p.box ? matteClip(matteToBox(p.matte, p.box, p.focus)) : undefined;
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translate(${(r.x ?? 0).toFixed(2)}px, ${(r.y ?? 0).toFixed(2)}px) rotate(${(r.rot ?? 0).toFixed(3)}deg) scale(${(r.s ?? 1).toFixed(5)})`, ...p.style }}>
      {p.picture()}
      {p.line}
      {clip ? <div style={{ position: 'absolute', inset: 0, clipPath: clip, pointerEvents: 'none' }}>{p.picture()}</div> : null}
      {p.front}
    </div>
  );
};

/** TypeBehind declares nothing of its own (its line declares itself). */
export const declares = (_p?: unknown, _film?: unknown): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

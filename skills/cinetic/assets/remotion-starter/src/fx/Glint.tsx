import React from 'react';
import { fd } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Glint: a tiny sprite of three or four bright squares that bridges a hard cut. Right after the cut it
 * drops down and to the right across the frame, changing its arrangement every 4 frames at 60 fps (on
 * twos at 30) through six poses: a diagonal triplet; a tall bar, a square and a dot; a wide block with a
 * tick; two bars and a dot in an L; a long bar with dots above and below; a single square. Then it is
 * gone. The new scene rises behind it on ones, and the stage can flash and decay with it (glintGlow).
 * Stepped by nature: each pose is a cut, never a tween, so the sprite reads as pixel art with a pulse.
 * Ban-safe default: flat squares, no halo (a halo only on a dark stage the brand allows to glow).
 */

/** One square: x, y, w, h in px at 1080p, relative to the pose's centre. */
export type GlintRect = [number, number, number, number];

/** The six house poses (px at 1080p, each centred on its own bounding box). */
export const GLINT_POSES: GlintRect[][] = [
  [[-6, -69, 43, 43], [-96, 4, 21, 23], [54, 26, 41, 43]],
  [[-26, -77, 41, 56], [21, 39, 39, 38], [-60, 56, 19, 19]],
  [[29, -60, 13, 26], [-1, -26, 15, 28], [-42, 13, 69, 47]],
  [[-41, -55, 36, 19], [-6, -14, 47, 19], [-8, 42, 11, 13]],
  [[11, -69, 21, 28], [-66, -2, 131, 13], [-38, 39, 30, 30]],
  [[-15, -15, 30, 30]],
];
/** Where each pose's centre sits, px at 1080p from the first: a drop down-right that speeds up, about 330 px. */
export const GLINT_PATH: [number, number][] = [[0, 0], [36, 34], [61, 107], [161, 121], [171, 227], [163, 283]];

export const GLINT = { every60: 4, glow: { peak: 1, fast60: 1.2, slow60: 30, share: 0.55 } } as const;

export type GlintProps = {
  at: number; // first frame of the sprite (the first frame after the cut)
  x: number; // the first pose's centre, px
  y: number;
  poses?: GlintRect[][];
  path?: [number, number][]; // one centre per pose (px at 1080p, relative to the first)
  every?: number; // 60 fps frames per pose (house 4: on twos at 30 fps)
  scale?: number; // sprite and path scale (1 at 1080p)
  flip?: { x?: boolean; y?: boolean }; // mirror the drop (a drop down-left: flip.x)
  id?: string;
};

export type GlintState = { visible: boolean; pose: number; x: number; y: number; rects: { x: number; y: number; w: number; h: number }[] };

/** Film frames per pose, whole frames when the film allows it (4 at 60, 2 at 30, 1.6 at 24 -> holds of 2, 2, 1...). */
const per = (p: GlintProps, fps: number) => Math.max(1, f60x(p.every ?? GLINT.every60, fps));

/** The sprite at frame f: its pose index, centre and absolute rects (px). Pure; decides on whole frames. */
export const glintState = (frame: number, p: GlintProps, film?: Partial<FilmCtx>): GlintState => {
  const fps = fpsOf(film);
  const poses = p.poses ?? GLINT_POSES;
  const path = p.path ?? GLINT_PATH;
  const k = (p.scale ?? 1) * uOf(film);
  const pose = Math.floor((fd(frame) - p.at) / per(p, fps) + 1e-9);
  if (pose < 0 || pose >= poses.length) return { visible: false, pose, x: p.x, y: p.y, rects: [] };
  const sx = p.flip?.x ? -1 : 1;
  const sy = p.flip?.y ? -1 : 1;
  const [px, py] = path[Math.min(pose, path.length - 1)];
  const cx = p.x + sx * px * k;
  const cy = p.y + sy * py * k;
  const rects = poses[pose].map(([rx, ry, w, h]) => {
    const x0 = sx > 0 ? rx : -rx - w;
    const y0 = sy > 0 ? ry : -ry - h;
    return { x: cx + x0 * k, y: cy + y0 * k, w: w * k, h: h * k };
  });
  return { visible: true, pose, x: cx, y: cy, rects };
};

/** The pose frames (sync: the whoosh into the cut sits before `start`; a tick can sit on each pose). */
export const glintFrames = (p: GlintProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const n = (p.poses ?? GLINT_POSES).length;
  const poses = Array.from({ length: n }, (_, i) => Math.ceil(p.at + i * per(p, fps) - 1e-9));
  return { start: p.at, poses, end: Math.ceil(p.at + n * per(p, fps) - 1e-9) };
};

/**
 * The stage flash that rides with the sprite, 0..1 (1 on its first frame): a fast drop to about half in
 * one 30 fps frame, then a slow decay over ~30 f at 60 fps. Multiply a light overlay's opacity by it.
 */
export const glintGlow = (frame: number, at: number, film?: Partial<FilmCtx>): number => {
  const t = ((frame - at) * 60) / fpsOf(film);
  if (t < 0) return 0;
  const g = GLINT.glow;
  return g.peak * (g.share * Math.exp(-t / g.fast60) + (1 - g.share) * Math.exp(-t / g.slow60));
};

/** Draws the sprite: flat squares (div per square). `halo` adds a static soft plate behind each (dark stages only). */
export const Glint: React.FC<GlintProps & { frame: number; color?: string; halo?: false | { color: string; radius?: number } }> = (props) => {
  const film = useFilm();
  const s = glintState(props.frame, props, film);
  if (!s.visible) return null;
  const color = props.color ?? C.accent;
  const halo = props.halo ? `0 0 ${(props.halo.radius ?? 18) * uOf(film)}px ${props.halo.color}` : undefined;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, pointerEvents: 'none' }} aria-hidden>
      {s.rects.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: r.w, height: r.h, background: color, boxShadow: halo, transform: `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)` }} />
      ))}
    </div>
  );
};

/** Every pose is a cut: the sprite's span is one stepped range. */
export const declares = (p?: Partial<GlintProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = glintFrames(p as GlintProps, film);
  return { stepped: [{ from: fr.start, to: fr.end, id: p.id ?? 'glint' }], flashes: [], cameraBlur: [], seams: [] };
};

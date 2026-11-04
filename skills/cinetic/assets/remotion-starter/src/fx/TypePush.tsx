import React from 'react';
import { clamp, E, type Ease, lmix, mix, prog } from '../lib/anim';
import { camera, type Shot } from '../lib/camera';
import { f60x, type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import { type LineMetrics, wordMap } from './TypePresets';

/**
 * Type push: the camera pushes through a line of type by scale, 1.0 -> 2.2x on E.cam over 45-60 f (house 52 f at 60
 * fps), following the reading point, and lets the line cross the frame's edges. Type changes size through the camera,
 * never by a snap: the line is set once at its role's size and the push carries it to a hero's scale, so the eye stays
 * on the word it is reading while the rest of the line grows past the frame.
 *
 * The reading point is where the eye is (a word's centre, in the layer's px: wordPoint()); with two or more points the
 * push travels along them as it grows (the line's first word, then its keyword). The first point stays where it is on
 * the push's first frame (the push starts from rest, no jump); on landing the last point sits at `toward` (default: its
 * own rest position pulled `centre` of the way to the frame's centre). Scale travels in log space, so the push reads as
 * one speed; after landing a slow creep keeps the hold alive (a few tenths of a px a frame near the reading point).
 *
 * Resting states are what the layout audit holds to the safe zone: before the push the line rests at its size; while it
 * pushes the layer is tagged data-audit-push="moving" (no safe-area, speed or type-role check: it is a camera move); once
 * it lands at a bleed scale it is tagged "bleed": a declared bleed, which must cross the frame's edge (a line resting half
 * in the margin is a fault, not a crop). Pure state (typePushState) and a thin component (<TypePush>); Node-safe except
 * the component.
 */

/** House numbers: 60 fps frames. */
export const TYPE_PUSH = { from: 1, to: 2.2, frames60: 52, range60: [45, 60] as const, centre: 0.35, creep: 0.02, settle: 0.1, bleedFrom: 1.05 } as const;

export type Point = { x: number; y: number };

export type TypePushSpec = {
  at: number; // the push's first frame
  frames?: number; // film frames (default 52 f at 60 fps; house range 45-60)
  from?: number; // scale at rest (default 1)
  to?: number; // scale on landing (default 2.2)
  read: Point | Point[]; // the reading point(s), layer px: the push follows them in order
  toward?: Point; // where the last reading point lands on screen (default: centre of the way to the frame's centre)
  centre?: number; // share of the way to the frame's centre when `toward` is not given (default 0.35)
  ease?: Ease; // default E.cam
  creep?: number; // scale a second after landing (default 0.02: the hold keeps moving)
  bleed?: boolean; // the landed state is a declared bleed (default true)
};

export type TypePushPhase = 'rest' | 'moving' | 'landed';
export type TypePushState = { shot: Shot; k: number; p: number; phase: TypePushPhase; read: Point; audit?: 'moving' | 'bleed' };

const pts = (r: Point | Point[]) => (Array.isArray(r) ? (r.length ? r : [{ x: 0, y: 0 }]) : [r]);

/** A point along the polyline of reading points at share p (0..1, equal shares per segment). */
const along = (ps: Point[], p: number): Point => {
  if (ps.length === 1) return ps[0];
  const t = clamp(p) * (ps.length - 1);
  const i = Math.min(ps.length - 2, Math.floor(t));
  return { x: mix(ps[i].x, ps[i + 1].x, t - i), y: mix(ps[i].y, ps[i + 1].y, t - i) };
};

/** The push's frames: its first frame, its length, the last frame of the move and the frame it has settled (speed under 10 % of its peak). */
export const typePushFrames = (s: TypePushSpec, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const frames = Math.max(1, s.frames ?? f60x(TYPE_PUSH.frames60, fps));
  const ease = s.ease ?? E.cam;
  const v = (f: number) => Math.abs(ease(clamp((f - s.at) / frames)) - ease(clamp((f - 1 - s.at) / frames)));
  let peak = Math.ceil(s.at);
  for (let f = Math.ceil(s.at); f <= s.at + frames + 1; f++) if (v(f) > v(peak)) peak = f;
  let settled = Math.ceil(s.at + frames);
  for (let f = peak + 1; f <= s.at + frames + 1; f++)
    if (v(f) < TYPE_PUSH.settle * v(peak)) {
      settled = f;
      break;
    }
  return { at: s.at, frames, end: s.at + frames, peak, settled };
};

/**
 * The push at frame f (pure): the camera shot over the layer (lib/camera.ts: world point (ax, ay) at screen point
 * (sx, sy) at scale k), its eased progress, its phase and what the layout audit should read it as.
 */
export const typePushState = (f: number, s: TypePushSpec, film?: Partial<FilmCtx>): TypePushState => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const fr = typePushFrames(s, film);
  const ps = pts(s.read);
  const from = s.from ?? TYPE_PUSH.from;
  const to = s.to ?? TYPE_PUSH.to;
  const p = prog(f, fr.at, fr.end, s.ease ?? E.cam);
  const last = ps[ps.length - 1];
  const c = s.centre ?? TYPE_PUSH.centre;
  const toward = s.toward ?? { x: mix(last.x, width / 2, c), y: mix(last.y, height / 2, c) };
  const read = along(ps, p);
  const creep = f > fr.end ? 1 + (s.creep ?? TYPE_PUSH.creep) * ((f - fr.end) / fps) : 1;
  const k = lmix(from, to, p) * creep;
  const shot: Shot = { ax: read.x, ay: read.y, sx: mix(ps[0].x, toward.x, p), sy: mix(ps[0].y, toward.y, p), k };
  const phase: TypePushPhase = f <= fr.at ? 'rest' : f < fr.settled ? 'moving' : 'landed';
  const audit = phase === 'moving' ? 'moving' : phase === 'landed' && (s.bleed ?? true) && k >= TYPE_PUSH.bleedFrom ? 'bleed' : undefined;
  return { shot, k, p, phase, read, audit };
};

/**
 * A word's centre in the layer (px) for a line drawn by <TypeLine> centred on (cx, cy) with metrics `m` (measureLine()):
 * the reading point for a push. `w` is the word's index (default the last word).
 */
export const wordPoint = (text: string, m: LineMetrics, cx: number, cy: number, w?: number): Point => {
  const W = wordMap(text);
  const i = clamp(Math.round(w ?? W.n - 1), 0, Math.max(0, W.n - 1));
  if (!W.n) return { x: cx, y: cy };
  const x0 = m.xs[W.starts[i]];
  const x1 = m.xs[W.ends[i]] + m.ws[W.ends[i]];
  return { x: cx - m.width / 2 + (x0 + x1) / 2, y: cy };
};

/** A push declares nothing: it is a continuous camera move with no step and no seam. */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });

/**
 * <TypePush push frame>: the camera over a type layer. Lay the children out in the frame's own px (left:0, top:0 of the
 * layer); the push moves them as one, by one transform, and tags the layer for the layout audit.
 */
export const TypePush: React.FC<{ push: TypePushSpec; frame: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ push, frame, children, style }) => {
  const film = useFilm();
  const st = typePushState(frame, push, film);
  return (
    <div data-audit-push={st.audit} style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      <div style={{ ...camera(st.shot), width: film.width, height: film.height }}>{children}</div>
    </div>
  );
};

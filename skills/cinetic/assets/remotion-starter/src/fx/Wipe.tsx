import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Wipe: the incoming shot is revealed behind a soft edge that travels across the frame. Soft edges
 * come from masks, never from a blurred element: the edge is an alpha ramp `feather` px wide.
 *
 *   feather   a wide feathered edge (house 350 px at 1080p) that decelerates across the frame (the edge
 *             starts at about 4.5 px/f per 100 px of frame width and lands at about a third of that)
 *   gradient  an edge as wide as 70 % of the element it reveals, travelling at one speed (a line of
 *             type washing on: house 112 px/f at 1080p and 30 fps = 3360 px/s)
 *
 * edgeMask() is the static version for scrolling lines: an alpha ramp on the left edge (house 250 px)
 * that lets a line slide in out of nothing instead of being cut by the frame.
 */
export type WipeProps = {
  start: number;
  frames?: number; // feather: house 30 f at 60 fps; gradient: from the speed
  kind?: 'feather' | 'gradient';
  angle?: number; // direction of travel, deg: 0 = left to right, 90 = top to bottom
  feather?: number; // edge width, px (feather: house 350 at 1080p; gradient: `share` x the element span)
  share?: number; // gradient: the edge width as a share of the span (house 0.7)
  span?: number; // gradient: the element's extent along the travel, px (default the frame's)
  speed?: number; // gradient: px per second (house 3360 at 1080p)
  from?: number; // the edge's centre at start, px along the travel (default: fully hidden)
  to?: number; // at the end (default: fully revealed)
  ease?: Ease; // feather: house E.softOut (decelerating); gradient: E.linear
  id?: string;
};

export type WipeState = {
  edge: number; // the ramp's centre, px along the travel axis (0 = where the travel enters the frame)
  feather: number; // ramp width, px
  v: number; // edge speed, px per film frame
  t: number; // 0..1 of the run
  length: number; // the frame's extent along the travel axis, px
  frames: number;
};

/** The extent of a w x h frame along a travel direction of `angle` degrees. */
const extentAlong = (w: number, h: number, angle: number) => {
  const a = (angle * Math.PI) / 180;
  return Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
};

/** The wipe at frame f: where its soft edge is, how wide and how fast. Pure, closed form. */
export const wipeState = (f: number, p: WipeProps, film?: Partial<FilmCtx>): WipeState => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const u = Math.min(width, height) / 1080;
  const angle = p.angle ?? 0;
  const length = extentAlong(width, height, angle);
  const gradient = p.kind === 'gradient';
  const span = p.span ?? length;
  const feather = p.feather ?? (gradient ? (p.share ?? 0.7) * span : 350 * u);
  const from = p.from ?? -feather / 2;
  const to = p.to ?? length + feather / 2;
  const speed = (p.speed ?? 3360 * u) / fps;
  const frames = Math.max(1, p.frames ?? (gradient ? Math.abs(to - from) / Math.max(1e-6, speed) : f60x(30, fps)));
  const ease = p.ease ?? (gradient ? E.linear : E.softOut);
  const at = (g: number) => mix(from, to, ease(clamp((g - p.start) / frames)));
  return { edge: at(f), feather, v: at(f) - at(f - 1), t: clamp((f - p.start) / frames), length, frames };
};

/** CSS mask that shows what is behind the edge (the revealed side) for a wipe state. */
export const wipeMask = (s: WipeState, angle = 0): React.CSSProperties => {
  const a = s.edge - s.feather / 2;
  const b = s.edge + s.feather / 2;
  const g = `linear-gradient(${(angle + 90).toFixed(2)}deg, #000 ${a.toFixed(2)}px, transparent ${b.toFixed(2)}px)`;
  return { maskImage: g, WebkitMaskImage: g };
};

/** A static soft edge for a line that scrolls through the frame: alpha ramps over `left` px (house 250 at 1080p) and `right` px. */
export const edgeMask = (o: { left?: number; right?: number; width?: number } = {}): React.CSSProperties => {
  const l = o.left ?? 250;
  const r = o.right ?? 0;
  const g =
    r > 0
      ? `linear-gradient(90deg, transparent 0px, #000 ${l}px, #000 calc(100% - ${r}px), transparent 100%)`
      : `linear-gradient(90deg, transparent 0px, #000 ${l}px)`;
  return { maskImage: g, WebkitMaskImage: g };
};

/** Renders a wipe: `outgoing` underneath, `incoming` revealed behind the travelling soft edge. `frame` is local. */
export const Wipe: React.FC<WipeProps & { frame: number; outgoing?: React.ReactNode; incoming: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = wipeState(props.frame, props, film);
  const done = s.edge - s.feather / 2 >= s.length;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {!done && props.outgoing}
      {props.frame >= props.start && <div style={{ position: 'absolute', inset: 0, ...(done ? {} : wipeMask(s, props.angle ?? 0)) }}>{props.incoming}</div>}
    </div>
  );
};

/** A wipe is a `wipe` seam on its first frame (the incoming shot shows from there). */
export const declares = (p?: Partial<WipeProps>, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.start, kind: 'wipe', dir: (p.angle ?? 0) > 90 && (p.angle ?? 0) < 270 ? -1 : 1, id: p.id ?? 'wipe' }] };
};

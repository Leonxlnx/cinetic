import React from 'react';
import { clamp, curveOf, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import { fastRanges, SMEAR, smearEdge } from '../lib/handoff';
import type { Declares } from '../timeline';
import { DirBlur } from './Defocus';

/**
 * Wipe: the incoming shot is revealed behind an edge that travels across the frame. Soft edges come
 * from masks, never from a blurred element: the edge is an alpha ramp in a mask.
 *
 *   push      (the studio wipe) a hard edge that pushes the outgoing shot along with it: the old shot
 *             starts moving a few frames before the edge enters (it is pushed, not cut), the edge
 *             arrives fast and decelerates to about half the frame, creeps, then accelerates on to the
 *             far side and leaves at speed. The outgoing shot rides the first stage at 0.62 of the
 *             edge's travel; the edge carries its own streak (a ramp 0.3 of its step: a box-blurred
 *             hard edge is a ramp), so it reads sharp when slow and smeared when fast.
 *   feather   a wide feathered edge (house 350 px at 1080p) that decelerates across the frame (the edge
 *             starts at about 4.5 px/f per 100 px of frame width and lands at about a third of that)
 *   gradient  an edge as wide as 70 % of the element it reveals, travelling at one speed (a line of
 *             type washing on: house 112 px/f at 1080p and 30 fps = 3360 px/s)
 *
 * A wipe is finished on the frame its run ends (or its edge has cleared the frame): from there
 * <Wipe> stops drawing the outgoing shot and the incoming one is unmasked. edgeMask() is the static
 * version for scrolling lines: an alpha ramp on the left edge (house 250 px) that lets a line slide in
 * out of nothing instead of being cut by the frame.
 */

/**
 * The push-wipe, house numbers (60 fps frames, shares of the frame's extent along the travel). The arrival is
 * the measured edge path: it starts off-frame (from -0.075, so the outgoing shot is already moving when the edge
 * enters), peaks about a quarter of the way in (about 7 % of the extent per 60 fps frame) and decays about x0.92
 * a 60 fps frame to 0.483 of the extent in 54 f; the edge creeps on (0.13 % a frame) and leaves on E.buildIn over
 * 42 f, at speed. The outgoing shot moves 0.62 of the edge's travel in the arrival, none after it.
 */
export const PUSH = {
  from: -0.075,
  to: 0.483,
  arrive60: 54,
  leave60: 42,
  push: 0.62,
  creep60: 0.0013,
  // progress of the arrival per 30 fps frame (27 frames), the measured edge path normalised
  arrive: [0, 0.0061, 0.021, 0.0509, 0.0994, 0.1899, 0.3224, 0.4475, 0.5464, 0.6248, 0.6864, 0.735, 0.776, 0.8115, 0.8413, 0.8656, 0.888, 0.9067, 0.9235, 0.9384, 0.9496, 0.9608, 0.9701, 0.9776, 0.9832, 0.9888, 0.9925, 1] as number[],
} as const;

/** The measured push-wipe arrival as an ease (a short build, a long settle: its speed peaks near t = 0.2). */
export const pushArrive: Ease = curveOf(PUSH.arrive);

/** One stage of a push-wipe: the edge moves to `to` (share of the extent; 1 = clear of the frame) over `frames` (60 fps) on `ease`, the outgoing shot riding `push` of its travel; then `gap` 60 fps frames of creep. */
export type WipeStage = { to: number; frames?: number; ease?: Ease; push?: number; gap?: number };

export type WipeProps = {
  start: number;
  frames?: number; // feather: house 30 f at 60 fps; gradient: from the speed (push: the stages)
  kind?: 'feather' | 'gradient' | 'push';
  angle?: number; // direction of travel, deg: 0 = left to right, 90 = top to bottom
  feather?: number; // edge width, px (feather: house 350 at 1080p; gradient: `share` x the element span)
  share?: number; // gradient: the edge width as a share of the span (house 0.7)
  span?: number; // gradient: the element's extent along the travel, px (default the frame's)
  speed?: number; // gradient: px per second (house 3360 at 1080p)
  from?: number; // the edge's centre at start, px along the travel (default: fully hidden; push: PUSH.from of the extent)
  to?: number; // at the end (default: fully revealed)
  ease?: Ease; // feather: house E.softOut (decelerating); gradient: E.linear
  /** push: the stages (default: [{ to: PUSH.to, frames: 54, ease: pushArrive, push: 0.62 }, { to: 1, frames: 42, ease: E.buildIn }]). */
  stages?: WipeStage[];
  push?: number; // push: the outgoing shot's share of the edge's travel in stages that do not set their own (house 0.62 in the first, 0 after)
  ride?: number; // push: the incoming shot's share (0 = revealed in place, house; 1 = a sheet pinned to the edge)
  edgeSmear?: number; // push: the edge's streak as a share of its step (house SMEAR.share 0.3)
  /** push: the pushed shots' streak when they move fast: 'draw' (house) smears them along the travel in the picture (fx/Defocus DirBlur), 'shutter' declares camera blur for the finishing pass instead, false keeps them crisp. */
  smear?: 'draw' | 'shutter' | false;
  id?: string;
};

export type WipeState = {
  edge: number; // the ramp's centre, px along the travel axis (0 = where the travel enters the frame)
  feather: number; // ramp width, px
  v: number; // edge speed, px per film frame
  t: number; // 0..1 of the run
  length: number; // the frame's extent along the travel axis, px
  frames: number;
  done: boolean; // the run is over (or the edge has cleared the frame): draw the incoming shot alone
  outX: number; // push: the outgoing shot's offset along the travel, px (0 for feather and gradient)
  outV: number; // push: the outgoing shot's step into this frame, px
  inX: number; // push: the incoming shot's offset along the travel, px (0 unless `ride`)
  stage: number; // push: the stage frame f is in (-1 before, stages.length after)
};

/** The extent of a w x h frame along a travel direction of `angle` degrees. */
const extentAlong = (w: number, h: number, angle: number) => {
  const a = (angle * Math.PI) / 180;
  return Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
};

type Leg = { from: number; frames: number; x0: number; x1: number; ease: Ease; push: number; stage: number };

/** The push-wipe's legs in film frames and px: each stage, then its creep (gap) if any. */
const pushLegs = (p: WipeProps, fps: number, length: number): Leg[] => {
  const stages: WipeStage[] = p.stages ?? [
    { to: PUSH.to, frames: PUSH.arrive60, ease: pushArrive },
    { to: 1, frames: PUSH.leave60, ease: E.buildIn },
  ];
  const margin = 0.02 * length; // a final stage ends this far past the frame, so its own streak has cleared it
  const legs: Leg[] = [];
  let t0 = p.start;
  let x0 = p.from ?? PUSH.from * length;
  stages.forEach((st, i) => {
    const frames = Math.max(1, f60x(st.frames ?? (i === 0 ? PUSH.arrive60 : PUSH.leave60), fps));
    const x1 = st.to * length + (st.to >= 1 ? margin : 0);
    const push = st.push ?? (i === 0 ? (p.push ?? PUSH.push) : 0);
    legs.push({ from: t0, frames, x0, x1, ease: st.ease ?? (i === 0 ? pushArrive : E.buildIn), push, stage: i });
    t0 += frames;
    x0 = x1;
    const gap = f60x(Math.max(0, st.gap ?? 0), fps);
    if (gap > 0 && i < stages.length - 1) {
      const x2 = x1 + PUSH.creep60 * length * ((gap * 60) / fps); // a hold that creeps on, never frozen
      legs.push({ from: t0, frames: gap, x0: x1, x1: x2, ease: E.linear, push: 0, stage: i });
      t0 += gap;
      x0 = x2;
    }
  });
  return legs;
};

/** Edge position and the outgoing shot's travel (each leg's push share of the edge's travel in it) at frame g. */
const pushAt = (legs: Leg[], g: number) => {
  let edge = legs[0].x0;
  let out = 0;
  let stage = -1;
  for (const l of legs) {
    if (g <= l.from) break;
    const k = l.ease(clamp((g - l.from) / l.frames));
    edge = mix(l.x0, l.x1, k);
    out += l.push * (edge - l.x0);
    stage = g < l.from + l.frames ? l.stage : l.stage + (l === legs[legs.length - 1] ? 1 : 0);
  }
  return { edge, out, stage };
};

/** The wipe at frame f: where its edge is, how wide and how fast, and whether it has finished. Pure, closed form. */
export const wipeState = (f: number, p: WipeProps, film?: Partial<FilmCtx>): WipeState => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const u = Math.min(width, height) / 1080;
  const angle = p.angle ?? 0;
  const length = extentAlong(width, height, angle);
  if (p.kind === 'push') {
    const legs = pushLegs(p, fps, length);
    const last = legs[legs.length - 1];
    const end = last.from + last.frames;
    const a = pushAt(legs, f);
    const b = pushAt(legs, f - 1);
    const v = a.edge - b.edge;
    const feather = smearEdge(v, { share: p.edgeSmear ?? SMEAR.share, min: 1.5 * u });
    const ride = clamp(p.ride ?? 0);
    const frames = end - p.start;
    const done = f >= end || a.edge - feather / 2 >= length;
    return { edge: a.edge, feather, v, t: clamp((f - p.start) / frames), length, frames, done, outX: a.out, outV: a.out - b.out, inX: ride * (a.edge - last.x1), stage: f < p.start ? -1 : a.stage };
  }
  const gradient = p.kind === 'gradient';
  const span = p.span ?? length;
  const feather = p.feather ?? (gradient ? (p.share ?? 0.7) * span : 350 * u);
  const from = p.from ?? -feather / 2;
  const to = p.to ?? length + feather / 2;
  const speed = (p.speed ?? 3360 * u) / fps;
  const frames = Math.max(1, p.frames ?? (gradient ? Math.abs(to - from) / Math.max(1e-6, speed) : f60x(30, fps)));
  const ease = p.ease ?? (gradient ? E.linear : E.softOut);
  const at = (g: number) => mix(from, to, ease(clamp((g - p.start) / frames)));
  const edge = at(f);
  const t = clamp((f - p.start) / frames);
  // finished when the run is over (an edge that lands a hair short of the frame through rounding still
  // finishes), or as soon as the whole ramp has cleared the frame
  const done = t >= 1 || edge - feather / 2 >= length;
  return { edge, feather, v: edge - at(f - 1), t, length, frames, done, outX: 0, outV: 0, inX: 0, stage: f < p.start ? -1 : t >= 1 ? 1 : 0 };
};

/** The first frame a wipe is finished on (the outgoing shot can unmount from here). */
export const wipeEnd = (p: WipeProps, film?: Partial<FilmCtx>): number => {
  const s0 = wipeState(p.start, p, film);
  let f = Math.ceil(p.start + s0.frames - 1e-9);
  // the edge may clear the frame before the run ends (a feather that overshoots)
  for (let g = Math.floor(p.start); g < f; g++)
    if (wipeState(g, p, film).done) {
      f = g;
      break;
    }
  return f;
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

const along = (d: number, angle: number) => {
  const a = (angle * Math.PI) / 180;
  return `translate3d(${(d * Math.cos(a)).toFixed(3)}px, ${(d * Math.sin(a)).toFixed(3)}px, 0)`;
};

/**
 * Renders a wipe: `outgoing` underneath (pushed along for kind 'push'), `incoming` revealed behind the travelling
 * edge. Once the wipe is finished the outgoing shot is no longer drawn and the incoming one is unmasked. `frame`
 * is local.
 */
export const Wipe: React.FC<WipeProps & { frame: number; outgoing?: React.ReactNode; incoming: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const angle = props.angle ?? 0;
  const s = wipeState(props.frame, props, film);
  const u = Math.min(film.width, film.height) / 1080;
  const out =
    (props.smear ?? 'draw') === 'draw' && s.outV ? (
      <DirBlur v={s.outV / u} angle={angle} id={`${props.id ?? 'wipe'}-out`}>
        {props.outgoing}
      </DirBlur>
    ) : (
      props.outgoing
    );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {!s.done && props.outgoing && (s.outX ? <div style={{ position: 'absolute', inset: 0, transform: along(s.outX, angle) }}>{out}</div> : props.outgoing)}
      {props.frame >= props.start && (
        <div style={{ position: 'absolute', inset: 0, ...(s.done ? {} : wipeMask(s, angle)) }}>
          {s.inX && !s.done ? <div style={{ position: 'absolute', inset: 0, transform: along(s.inX, angle) }}>{props.incoming}</div> : props.incoming}
        </div>
      )}
    </div>
  );
};

/**
 * A wipe is a `wipe` seam on its first frame (the incoming shot shows from there). A push-wipe with smear
 * 'shutter' also declares camera blur on the frames its pushed shots move fast enough to smear (the edge always
 * draws its own streak).
 */
export const declares = (p?: Partial<WipeProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const a = (((p.angle ?? 0) % 360) + 360) % 360;
  const seams = [{ at: p.start, kind: 'wipe' as const, dir: (a > 90 && a < 270 ? -1 : 1) as 1 | -1, id: p.id ?? 'wipe' }];
  if (p.kind !== 'push' || p.smear !== 'shutter') return { stepped: [], flashes: [], cameraBlur: [], seams };
  const wp = p as WipeProps;
  const { width, height } = sizeOf(film);
  const u = Math.min(width, height) / 1080;
  const end = wipeEnd(wp, film);
  const speed = (f: number) => {
    const s1 = wipeState(f, wp, film);
    const s0 = wipeState(f - 1, wp, film);
    return Math.max(Math.abs(s1.outX - s0.outX), Math.abs(s1.inX - s0.inX));
  };
  const cameraBlur = fastRanges(speed, wp.start, end, { u, fps: fpsOf(film), id: `${p.id ?? 'wipe'}-push` });
  return { stepped: [], flashes: [], cameraBlur, seams };
};

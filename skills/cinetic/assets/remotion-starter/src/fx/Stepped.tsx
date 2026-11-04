import React, { createContext, useContext } from 'react';
import { Sequence, useCurrentFrame } from 'remotion';
import { clamp, type Ease, M, rand } from '../lib/anim';
import { irregular, onTwos, stepFrame } from '../lib/cadence';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';

/**
 * Stepped time for graphics: a layer animates on a lower cadence than the film (16 fps inside 24 or
 * 60, on twos for illustration) while the camera and footage stay smooth. <Stepped fps={16}> hands its
 * children a stepped frame (a Sequence shifted by the hold: a Freeze adds only its direct parent's offset
 * before clamping, so under an outer Sequence that starts mid-scene its children would see the wrong
 * frame), so any animation inside (yours or a primitive's) holds each pose for film fps / 16 frames
 * without knowing it; useStepped() reads both clocks. Stepped layers get no shutter blur: declare the
 * range (declares() says which) so blur sampling, forensics and the speed checks treat the holds as designed.
 *
 * collage(): a stop-motion build. Elements are born as cuts (full size and full opacity on their first
 * frame, never faded or scaled in) on an irregular but repeatable cadence (house: gaps of 4 frames at
 * 60 fps on average, every gap 1-10), some re-cut larger a few frames later (x1.8-2.1), some born with a
 * faint oversized ghost for 5-8 frames, the camera stepping a little on births, then one slow push under
 * the whole build (M.collagePush, +30 % over 92 frames at 60 fps). Strokes draw on at a constant pen
 * speed (house 65 px a frame at 60 fps).
 */

export type SteppedProps = {
  fps?: number; // the animation's own rate (house 16; 12 = on twos at 24)
  on?: 2 | 3; // or: hold every pose for `on` film frames
  phase?: number; // shifts the grid, film frames
  from?: number; // active range, local frames (outside it the layer runs live)
  to?: number;
  id?: string;
};

type SteppedCtx = { stepped: number; live: number; active: boolean; fps: number };
const Ctx = createContext<SteppedCtx | null>(null);

/** The frame a stepped layer shows at film frame f (whole film frames in; the pose's own time out). */
export const steppedFrame = (frame: number, p: SteppedProps, film?: Partial<FilmCtx>): number => {
  const f = Math.round(frame);
  if ((p.from !== undefined && f < p.from) || (p.to !== undefined && f > p.to)) return frame;
  if (p.on) return onTwos(f, p.on, p.phase ?? 0);
  return stepFrame(f, { animFps: p.fps ?? 16, filmFps: fpsOf(film), phase: p.phase ?? 0 });
};

/** True when film frame f shows the same pose as f - 1 (a held frame). */
export const isHeld = (frame: number, p: SteppedProps, film?: Partial<FilmCtx>) => steppedFrame(frame, p, film) === steppedFrame(frame - 1, p, film);

/** Held flags over frames [a, b] and the share of 3-frame windows holding exactly one held frame. */
export const heldStats = (a: number, b: number, p: SteppedProps, film?: Partial<FilmCtx>) => {
  const flags: number[] = [];
  for (let f = a; f <= b; f++) flags.push(isHeld(f, p, film) ? 1 : 0);
  let one = 0;
  let n = 0;
  for (let i = 0; i + 2 < flags.length; i++) {
    n++;
    if (flags[i] + flags[i + 1] + flags[i + 2] === 1) one++;
  }
  return { flags, heldShare: flags.reduce((s, v) => s + v, 0) / Math.max(1, flags.length), windowsOneHeld: n ? one / n : 0 };
};

/** Runs its children on stepped time. The camera and anything outside keep the film's frame. */
export const Stepped: React.FC<SteppedProps & { children: React.ReactNode }> = ({ children, ...p }) => {
  const live = useCurrentFrame();
  const film = useFilm();
  const stepped = steppedFrame(live, p, film);
  const active = (p.from === undefined || live >= p.from) && (p.to === undefined || live <= p.to);
  return (
    <Ctx.Provider value={{ stepped, live, active, fps: p.fps ?? 16 }}>
      <Sequence from={live - stepped} layout="none" name="stepped">
        {children}
      </Sequence>
    </Ctx.Provider>
  );
};

/** Inside <Stepped>: the stepped frame (what useCurrentFrame() also returns there) and the live film frame. */
export const useStepped = (): SteppedCtx => {
  const c = useContext(Ctx);
  const f = useCurrentFrame();
  return c ?? { stepped: f, live: f, active: false, fps: 0 };
};

// ------------------------------------------------------------------------------------------ collage

export type CollageOpts = {
  n: number; // elements
  start: number; // first birth (film frame)
  seed?: string | number;
  mean?: number; // birth gap, 60 fps frames (house 4)
  min?: number; // house 1
  max?: number; // house 10
  gaps?: number[]; // gaps in film frames (an explicit cadence); overrides the seeded cadence
  growth?: false | { share?: number; every?: [number, number]; ratio?: [number, number]; steps?: number };
  ghosts?: false | { share?: number; len?: [number, number]; alpha?: [number, number]; scale?: number };
  camera?: false | { share?: number; panShare?: number; stepK?: [number, number]; stepPx?: [number, number]; push?: { at: number; dur?: number; amount?: number; ease?: Ease } };
  stroke?: { pxPerFrame60?: number };
};

export type CollageSchedule = {
  births: number[]; // whole film frames
  gaps: number[];
  growth: { el: number; at: number; ratio: number }[];
  ghosts: { el: number; at: number; until: number; alpha: number; scale: number }[];
  jumps: { at: number; k: number; dx: number; dy: number }[];
  push: { at: number; dur: number; amount: number; ease: Ease } | null;
  strokePx: number; // pen speed, px per film frame
  end: number; // last birth or growth step
  fps: number;
};

const pick = (seed: string, [a, b]: [number, number]) => a + (b - a) * rand(seed);

/** A collage schedule (closed form): births, growth re-cuts, ghosts, camera steps and the push. */
export const collage = (o: CollageOpts, film?: Partial<FilmCtx>): CollageSchedule => {
  const fps = fpsOf(film);
  const seed = o.seed ?? 'collage';
  const k = fps / 60;
  const gaps = o.gaps ?? irregular(`${seed}:births`, Math.max(0, o.n - 1), (o.mean ?? 4) * k, Math.max(1, (o.min ?? 1) * k), Math.max(1, (o.max ?? 10) * k));
  const births = [Math.round(o.start)];
  for (const g of gaps.slice(0, Math.max(0, o.n - 1))) births.push(births[births.length - 1] + Math.max(1, Math.round(g)));
  const growth: CollageSchedule['growth'] = [];
  if (o.growth !== false) {
    const g = o.growth ?? {};
    births.forEach((b, i) => {
      if (rand(`${seed}:grow:${i}`) >= (g.share ?? 0.4)) return;
      let at = b;
      for (let s = 0; s < (g.steps ?? 1); s++) {
        at += Math.max(1, Math.round(f60x(pick(`${seed}:growAt:${i}:${s}`, g.every ?? [7, 10]), fps)));
        growth.push({ el: i, at, ratio: pick(`${seed}:growR:${i}:${s}`, g.ratio ?? [1.8, 2.1]) });
      }
    });
  }
  const ghosts: CollageSchedule['ghosts'] = [];
  if (o.ghosts !== false) {
    const g = o.ghosts ?? {};
    births.forEach((b, i) => {
      if (rand(`${seed}:ghost:${i}`) >= (g.share ?? 0.3)) return;
      const len = Math.max(1, Math.round(f60x(pick(`${seed}:ghostLen:${i}`, g.len ?? [5, 8]), fps)));
      ghosts.push({ el: i, at: b, until: b + len, alpha: pick(`${seed}:ghostA:${i}`, g.alpha ?? [0.08, 0.15]), scale: g.scale ?? 5.6 });
    });
  }
  const jumps: CollageSchedule['jumps'] = [];
  let push: CollageSchedule['push'] = null;
  if (o.camera !== false) {
    const c = o.camera ?? {};
    births.slice(1).forEach((b, j) => {
      if (rand(`${seed}:jump:${j}`) >= (c.share ?? 0.5)) return;
      // a step is either a scale step (x1.05-1.11) or a pan (150-200 px at 1080p), never both
      if (rand(`${seed}:jumpKind:${j}`) < (c.panShare ?? 0.5)) {
        const ang = rand(`${seed}:jumpA:${j}`) * Math.PI * 2;
        const px = (pick(`${seed}:jumpP:${j}`, c.stepPx ?? [150, 200]) * (film?.height ?? 1080)) / 1080;
        jumps.push({ at: b, k: 1, dx: Math.cos(ang) * px, dy: Math.sin(ang) * px });
      } else jumps.push({ at: b, k: pick(`${seed}:jumpK:${j}`, c.stepK ?? [1.05, 1.11]), dx: 0, dy: 0 });
    });
    if (c.push) push = { at: c.push.at, dur: c.push.dur ?? f60x(92, fps), amount: c.push.amount ?? 0.3, ease: c.push.ease ?? M.collagePush };
  }
  const end = Math.max(births[births.length - 1], ...growth.map((g) => g.at));
  return { births, gaps: births.slice(1).map((b, i) => b - births[i]), growth, ghosts, jumps, push, strokePx: ((o.stroke?.pxPerFrame60 ?? 65) * 60) / fps, end, fps };
};

/** Element i at frame f: shown (from its birth frame, full size and opacity at once), its scale (growth re-cuts) and its ghost. */
export const collageElement = (frame: number, i: number, s: CollageSchedule) => {
  const f = Math.round(frame);
  const on = f >= s.births[i];
  const scale = s.growth.filter((g) => g.el === i && f >= g.at).reduce((v, g) => v * g.ratio, 1);
  const gh = s.ghosts.find((g) => g.el === i && f >= g.at && f < g.until);
  return { on, scale, opacity: on ? 1 : 0, ghost: gh ? { alpha: gh.alpha, scale: gh.scale } : null };
};

/** The collage camera at frame f: whole-frame steps on births, times the slow push (scale k, offset x, y). */
export const collageCamera = (frame: number, s: CollageSchedule) => {
  const f = Math.round(frame);
  let k = 1;
  let x = 0;
  let y = 0;
  for (const j of s.jumps) {
    if (f < j.at) break;
    k *= j.k;
    x += j.dx;
    y += j.dy;
  }
  const push = s.push ? 1 + s.push.amount * s.push.ease(clamp((frame - s.push.at) / s.push.dur)) : 1;
  return { k: k * push, x, y, push };
};

/** The drawn length of a stroke born at `born` (px), at the collage's constant pen speed. */
export const strokeDrawn = (frame: number, born: number, length: number, s: CollageSchedule) => clamp((Math.round(frame) - born + 1) * s.strokePx, 0, length);

/** A stepped layer declares its range (one sample per frame, no shutter blur across a hold). */
export const declares = (p?: Partial<SteppedProps> & { collage?: CollageSchedule }, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p || (p.from === undefined && !p.collage)) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const id = p.id ?? 'stepped';
  const fpsDecl = p.fps && [12, 16, 20, 30].includes(p.fps) ? (p.fps as SteppedRange['fps']) : undefined;
  const from = p.from ?? p.collage!.births[0];
  const to = p.to ?? p.collage!.end;
  const range: SteppedRange = { from, to: Math.max(from + 1, to), id };
  if (fpsDecl) range.fps = fpsDecl;
  if (p.on) range.on = p.on;
  return { stepped: [range], flashes: [], cameraBlur: [], seams: [] };
};

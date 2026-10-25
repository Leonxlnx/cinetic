import React, { useId } from 'react';
import { Freeze, OffthreadVideo } from 'remotion';
import { C } from '../brand/tokens';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';
import { DuotoneDefs, gradeFilter, type PhotoGrade, type PhotoMove, photoState, TintPlate } from './Photo';

/**
 * Footage as material: a clip framed like a photo (focus point, push, drift), graded, and timed by the
 * film rather than by its own clock: a speed (constant or keyed), freezes on chosen frames, and a loop
 * whose length sits on the music (loopSpan(beats, ...)). Every output frame shows exactly one source
 * frame, picked in closed form (footageTime) and drawn with <Freeze> around <OffthreadVideo>, so any
 * frame renders the same in any order.
 *
 * Speed keys: [{ at, speed }] in film frames; the speed is linear between keys and held outside them,
 * and the source time is its integral (trapezoids), so a ramp has no jump. A freeze holds the source
 * frame at `at` for `dur` film frames, then the clip continues from where it stopped. House: real time
 * (1) for anything with people or water; 0.5 for slow texture (foam, smoke, cloth), never below 0.25 on
 * a 30 fps source at 60 fps (each source frame would hold 8 output frames).
 * Cadence: a 30 fps clip in a 60 fps film shows each source frame twice; declares() marks that run as
 * stepped (the checks would otherwise read it as dropped frames). Shoot or choose 50/60 fps footage for
 * slow motion.
 */
export type SpeedKey = { at: number; speed: number };
export type FootageProps = {
  src: string;
  w: number; // the clip's pixel size (scripts/assets.mjs probe)
  h: number;
  frame: number;
  start?: number; // the film frame the clip's `from` plays on (default 0)
  dur?: number; // film frames it is on screen (for declares)
  from?: number; // source seconds at `start` (default 0)
  srcFps?: number; // the clip's frame rate (default the film's)
  speed?: number | SpeedKey[];
  freeze?: { at: number; dur: number }[]; // film frames
  loop?: number; // loop span in source seconds (see loopSpan)
  focus?: [number, number];
  anchor?: [number, number];
  scale?: number;
  move?: PhotoMove;
  shift?: [number, number]; // a translation this frame (frame px): a carried move from lib/handoff
  room?: [number, number]; // the cover's margin for `shift`
  grade?: PhotoGrade;
  style?: React.CSSProperties;
  id?: string;
};

/** Source seconds a loop of `beats` beats spans at constant `speed` (beatFrames = film frames per beat). */
export const loopSpan = (beats: number, beatFrames: number, fps: number, speed = 1) => (beats * beatFrames * Math.abs(speed)) / fps;

/** Integral of the speed from `start` to film frame g (in film frames x speed). Linear between keys. */
export const speedIntegral = (g: number, start: number, speed: number | SpeedKey[] = 1): number => {
  if (typeof speed === 'number') return (g - start) * speed;
  const keys = [...speed].sort((a, b) => a.at - b.at);
  if (!keys.length) return g - start;
  const v = (x: number) => {
    if (x <= keys[0].at) return keys[0].speed;
    if (x >= keys[keys.length - 1].at) return keys[keys.length - 1].speed;
    let i = 0;
    while (x > keys[i + 1].at) i++;
    const a = keys[i];
    const b = keys[i + 1];
    return a.speed + ((b.speed - a.speed) * (x - a.at)) / Math.max(1e-9, b.at - a.at);
  };
  // breakpoints between start and g, then trapezoids (exact for a piecewise-linear speed)
  const lo = Math.min(start, g);
  const hi = Math.max(start, g);
  const pts = [lo, ...keys.map((k) => k.at).filter((x) => x > lo && x < hi), hi];
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) s += ((v(pts[i]) + v(pts[i + 1])) / 2) * (pts[i + 1] - pts[i]);
  return g >= start ? s : -s;
};

export type FootageTime = { seconds: number; srcFrame: number; shown: number; frozen: boolean; loop: number };

/** Which source frame shows at film frame f (seconds from the file's start, the exact and the shown frame). Pure. */
export const footageTime = (f: number, p: Omit<FootageProps, 'frame' | 'w' | 'h' | 'src'>, film?: Partial<FilmCtx>): FootageTime => {
  const fps = fpsOf(film);
  const start = p.start ?? 0;
  // freezes take their held frames out of the clock
  let held = 0;
  let frozen = false;
  for (const z of p.freeze ?? []) {
    if (f >= z.at) {
      const inside = Math.min(z.dur, f - z.at);
      held += inside;
      if (f < z.at + z.dur) frozen = true;
    }
  }
  const g = Math.max(start, f - held);
  let s = speedIntegral(g, start, p.speed ?? 1) / fps;
  let loop = 0;
  if (p.loop && p.loop > 0) {
    loop = Math.floor(s / p.loop);
    s -= loop * p.loop;
  }
  const seconds = (p.from ?? 0) + Math.max(0, s);
  const sf = p.srcFps ?? fps;
  const srcFrame = seconds * sf;
  return { seconds, srcFrame, shown: Math.floor(srcFrame + 1e-6), frozen, loop };
};

/** The cadence a clip plays at in the film: source frames per film second at its speed (for declares). */
export const effectiveRate = (srcFps: number, speed: number) => srcFps * Math.abs(speed);

const STEP_RATES = [12, 16, 20, 30] as const;
const nearestStep = (r: number) => STEP_RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), STEP_RATES[0]);

/** A footage run that repeats source frames (rate under the film's) as a stepped range, else none. */
export const footageStepped = (p: Pick<FootageProps, 'start' | 'dur' | 'srcFps' | 'speed' | 'id'>, film?: Partial<FilmCtx>): SteppedRange[] => {
  const fps = fpsOf(film);
  if (p.dur === undefined || p.srcFps === undefined) return [];
  const sp = typeof p.speed === 'number' || p.speed === undefined ? Math.abs(p.speed ?? 1) : Math.max(...p.speed.map((k) => Math.abs(k.speed)));
  const r = effectiveRate(p.srcFps, sp);
  if (r >= fps * 0.95) return [];
  return [{ from: p.start ?? 0, to: (p.start ?? 0) + p.dur, fps: nearestStep(r), id: p.id ?? 'footage' }];
};

/** A clip, framed (cover on its focus, the move of a Photo), graded, on the film's clock. */
export const Footage: React.FC<FootageProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const uid = useId().replace(/:/g, '');
  const duoId = `fduo-${p.id ?? uid}`;
  const t = footageTime(p.frame, p, film);
  const sf = p.srcFps ?? film.fps;
  // OffthreadVideo reads media time = frame / fps: aim at the middle of the source frame
  const freezeAt = ((t.shown + 0.5) / sf) * film.fps;
  const s = photoState(p.frame, { photo: { src: p.src, w: p.w, h: p.h, focus: p.focus }, anchor: p.anchor, scale: p.scale, move: p.move, shift: p.shift, room: p.room }, film);
  const L = s.layers[0];
  const A = [(p.anchor ?? [0.5, 0.5])[0] * W, (p.anchor ?? [0.5, 0.5])[1] * H];
  const roll = L.roll ? `translate(${A[0]}px, ${A[1]}px) rotate(${L.roll.toFixed(4)}deg) translate(${-A[0]}px, ${-A[1]}px) ` : '';
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.ink, ...p.style }}>
      {p.grade?.duotone && <DuotoneDefs id={duoId} duotone={p.grade.duotone} />}
      <div style={{ position: 'absolute', inset: 0, filter: gradeFilter(p.grade, duoId) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '0 0', transform: `${roll}translate(${L.x.toFixed(3)}px, ${L.y.toFixed(3)}px) scale(${L.k.toFixed(5)})` }}>
          <Freeze frame={freezeAt}>
            <OffthreadVideo src={p.src} muted style={{ width: p.w, height: p.h, display: 'block' }} />
          </Freeze>
        </div>
      </div>
      <TintPlate grade={p.grade} />
    </div>
  );
};

/** What a clip declares: a run below the film's rate is stepped; each loop restart is a hard seam. */
export const declares = (p?: Partial<FootageProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.dur === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fps = fpsOf(film);
  const start = p.start ?? 0;
  const end = start + p.dur;
  const seams: Declares['seams'] = [];
  if (p.loop) {
    let last = footageTime(start, p, film).loop;
    for (let f = start + 1; f < end; f++) {
      const l = footageTime(f, p, film).loop;
      if (l !== last) seams.push({ at: f, kind: 'hard', id: p.id ?? 'footage-loop' });
      last = l;
    }
  }
  return { stepped: footageStepped(p as FootageProps, { ...film, fps }), flashes: [], cameraBlur: [], seams: seams.slice(0, 64) };
};


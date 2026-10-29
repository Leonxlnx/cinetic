import React, { useId } from 'react';
import { OffthreadVideo, Sequence, useCurrentFrame } from 'remotion';
import { C } from '../brand/tokens';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';
import { DuotoneDefs, gradeFilter, type PhotoGrade, type PhotoMove, photoState, TintPlate } from './Photo';

/**
 * Footage as material: a clip framed like a photo (focus point, push, drift), graded, and timed by the
 * film rather than by its own clock: a speed (constant or keyed), freezes on chosen frames, and a loop
 * whose length sits on the music (loopSpan(beats, ...)). Every output frame shows exactly one source
 * frame, picked in closed form (footageTime) and drawn by a <Sequence> shifted so the video's own clock
 * stands on that frame (a <Freeze> does not reach OffthreadVideo's clock: it keeps playing the timeline), so
 * any frame renders the same in any order.
 *
 * Speed keys: [{ at, speed }] in film frames; the speed is linear between keys and held outside them,
 * and the source time is its integral (trapezoids), so a ramp has no jump. A freeze holds the source
 * frame at `at` for `dur` film frames, then the clip continues from where it stopped. House: real time
 * (1) for anything with people or water; 0.5 for slow texture (foam, smoke, cloth), never below 0.25 on
 * a 30 fps source at 60 fps (each source frame would hold 8 output frames).
 * Cadence: a 30 fps clip in a 60 fps film shows each source frame twice; declares() marks that run as
 * stepped (the checks would otherwise read it as dropped frames). Shoot or choose 50/60 fps footage for
 * slow motion, or set `blend`: the next source frame is drawn over the shown one at the fraction between
 * them, so a 24 fps clip, a slow ramp or a clock that eases to a stop moves on every film frame instead of
 * stepping 2-3 (a held clock or a freeze shows one crisp frame).
 *
 * Clock: `clock` gives the source time to the film. Keys [{ at, t }] (film frame -> source seconds, linear
 * between keys, held outside them) or a pure function f -> seconds: the picture plays at the speed of
 * something else in the film. The house case is a forecast or a dial: a value v(f) in 0..1 drives
 * t = lo + (hi - lo) v(f), so the water stands while the value stands, floods while it rises and ebbs as it
 * falls (a source played backward at <= 2x reads as the same event receding; turn it on a moment of zero
 * speed, never with a sudden reversal).
 * Steady: `steady` takes a land track (per source frame, the similarity that maps it onto source frame 0:
 * { s, r, tx, ty } in px of a frame `w` wide, from a feature track on what does not move) and holds the
 * land still while the water moves, about source frame `ref`. `amount` < 1 keeps some of the drift as a
 * living camera; `offset` moves the held land in the frame (px at `w`) to compose it. steadyZoom() is the
 * extra cover scale that keeps every corner inside the picture, offset included.
 */
export type SpeedKey = { at: number; speed: number };
export type ClockKey = { at: number; t: number }; // film frame -> source seconds
export type SteadyRow = { s: number; r: number; tx: number; ty: number }; // source frame i -> source frame 0 (r in degrees, t in px at `w`)
export type Steady = { rows: SteadyRow[]; w: number; ref?: number; amount?: number; offset?: [number, number] }; // offset: where the held land sits (px at `w`), to frame it
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
  clock?: ClockKey[] | ((f: number) => number); // source seconds set by the film (replaces from/speed/freeze/loop)
  blend?: boolean; // draw the next source frame over the shown one at the fraction between them
  steady?: Steady; // hold the land still (a per-source-frame track); see steadyZoom for the cover
  freeze?: { at: number; dur: number }[]; // film frames
  loop?: number; // loop span in source seconds (see loopSpan)
  focus?: [number, number];
  anchor?: [number, number];
  scale?: number;
  move?: PhotoMove;
  shift?: [number, number]; // a translation this frame (frame px): a carried move from lib/handoff
  room?: [number, number]; // the cover's margin for `shift` (the root clips there, not at the frame)
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

export type FootageTime = { seconds: number; srcFrame: number; shown: number; frozen: boolean; loop: number; mix: number };

/** Source seconds of a clock at film frame f (keys: linear between, held outside). Pure. */
export const clockTime = (f: number, clock: ClockKey[] | ((f: number) => number)): number => {
  if (typeof clock === 'function') return clock(f);
  const k = [...clock].sort((a, b) => a.at - b.at);
  if (!k.length) return 0;
  if (f <= k[0].at) return k[0].t;
  if (f >= k[k.length - 1].at) return k[k.length - 1].t;
  let i = 0;
  while (f > k[i + 1].at) i++;
  return k[i].t + ((k[i + 1].t - k[i].t) * (f - k[i].at)) / Math.max(1e-9, k[i + 1].at - k[i].at);
};

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
  const sf = p.srcFps ?? fps;
  if (p.clock) {
    const seconds = Math.max(0, clockTime(f, p.clock));
    const srcFrame = seconds * sf;
    const shown = Math.floor(srcFrame + 1e-6);
    // a clock that stands (the same source time a frame before and after) shows one crisp frame
    const stands = Math.abs(clockTime(f - 1, p.clock) - seconds) < 1e-7 && Math.abs(clockTime(f + 1, p.clock) - seconds) < 1e-7;
    return { seconds, srcFrame, shown, frozen: stands, loop: 0, mix: p.blend && !stands ? srcFrame - shown : 0 };
  }
  const g = Math.max(start, f - held);
  let s = speedIntegral(g, start, p.speed ?? 1) / fps;
  let loop = 0;
  if (p.loop && p.loop > 0) {
    loop = Math.floor(s / p.loop);
    s -= loop * p.loop;
  }
  const seconds = (p.from ?? 0) + Math.max(0, s);
  const srcFrame = seconds * sf;
  const shown = Math.floor(srcFrame + 1e-6);
  return { seconds, srcFrame, shown, frozen, loop, mix: p.blend && !frozen ? srcFrame - shown : 0 };
};

/** The 2D similarity (a, b, c, d, e, f as in CSS matrix()) that holds source frame i on the steady reference, in px of a clip `clipW` wide. Pure. */
export const steadyMatrix = (i: number, st: Steady, clipW: number): [number, number, number, number, number, number] => {
  const n = st.rows.length;
  if (!n) return [1, 0, 0, 1, 0, 0];
  const row = (k: number) => st.rows[Math.min(n - 1, Math.max(0, Math.round(k)))];
  const m = (q: SteadyRow) => {
    const a = (q.r * Math.PI) / 180;
    return [q.s * Math.cos(a), q.s * Math.sin(a), -q.s * Math.sin(a), q.s * Math.cos(a), q.tx, q.ty];
  };
  // M_ref^-1 * M_i (frame i -> frame 0 -> the reference frame)
  const [a1, b1, c1, d1, e1, f1] = m(row(i));
  const [a0, b0, c0, d0, e0, f0] = m(row(st.ref ?? 0));
  const det = a0 * d0 - b0 * c0;
  const ia = d0 / det;
  const ib = -b0 / det;
  const ic = -c0 / det;
  const id = a0 / det;
  const ie = -(ia * e0 + ic * f0);
  const iff = -(ib * e0 + id * f0);
  let A = ia * a1 + ic * b1;
  let B = ib * a1 + id * b1;
  let Cc = ia * c1 + ic * d1;
  let D = ib * c1 + id * d1;
  let Ex = ia * e1 + ic * f1 + ie;
  let Fy = ib * e1 + id * f1 + iff;
  const amt = st.amount ?? 1;
  if (amt !== 1) {
    // a partial hold: scale, angle and shift taken toward the identity
    const sc = Math.hypot(A, B) ** amt;
    const ang = Math.atan2(B, A) * amt;
    A = sc * Math.cos(ang);
    B = sc * Math.sin(ang);
    Cc = -B;
    D = A;
    Ex *= amt;
    Fy *= amt;
  }
  const q = clipW / st.w;
  return [A, B, Cc, D, (Ex + (st.offset?.[0] ?? 0)) * q, (Fy + (st.offset?.[1] ?? 0)) * q];
};

/**
 * The extra cover scale (about the anchor) that keeps the frame inside every steadied source frame a shot
 * shows (source frames lo..hi), on top of the clip's own cover fit; >= 1. Pure.
 */
export const steadyZoom = (st: Steady, clip: { w: number; h: number; focus?: [number, number] }, lo: number, hi: number, film?: Partial<FilmCtx>, anchor: [number, number] = [0.5, 0.5]): number => {
  const { width: W, height: H } = sizeOf(film);
  const cov = photoState(0, { photo: { src: '', ...clip }, anchor }, film).cover;
  const A = [anchor[0] * W, anchor[1] * H];
  // the frame's corners, zoomed by z about the anchor, in reference px
  const corners = (z: number) => [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => [(A[0] + (x - A[0]) / z - cov.x) / cov.k, (A[1] + (y - A[1]) / z - cov.y) / cov.k]);
  const inside = (pt: number[], M: number[]) => {
    // a reference point mapped back into source frame i must lie inside the clip
    const [a, b, c, d, e, f] = M;
    const det = a * d - b * c;
    const x = (d * (pt[0] - e) - c * (pt[1] - f)) / det;
    const y = (-b * (pt[0] - e) + a * (pt[1] - f)) / det;
    return x >= 0 && y >= 0 && x <= clip.w && y <= clip.h;
  };
  const fits = (z: number) => {
    const cs = corners(z);
    for (let i = Math.floor(lo); i <= Math.ceil(hi); i++) {
      const M = steadyMatrix(i, st, clip.w);
      if (!cs.every((pt) => inside(pt, M))) return false;
    }
    return true;
  };
  if (fits(1)) return 1;
  let a = 1;
  let b = 3;
  if (!fits(b)) return b;
  for (let k = 0; k < 24; k++) {
    const m = (a + b) / 2;
    if (fits(m)) b = m;
    else a = m;
  }
  return b;
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

/**
 * The film frame X whose time lies inside source frame n (OffthreadVideo reads media time = its frame / fps): the
 * source frame's middle, in whole film frames, a tie rounded down, so a clip at the film's rate lands on its own
 * frame's start (X = n) rather than on the next frame's. Pure.
 */
export const mediaFrame = (n: number, srcFps: number, fps: number) => Math.round(((n + 0.5) / srcFps) * fps - 1e-6);

/** A clip, framed (cover on its focus, the move of a Photo), graded, on the film's clock. */
export const Footage: React.FC<FootageProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const uid = useId().replace(/:/g, '');
  const duoId = `fduo-${p.id ?? uid}`;
  const cur = useCurrentFrame();
  const t = footageTime(p.frame, p, film);
  const sf = p.srcFps ?? film.fps;
  // a Sequence starting at cur - X puts the video's own frame on X (mediaFrame: inside source frame n)
  const at = (n: number) => mediaFrame(n, sf, film.fps);
  const drawn = t.mix > 1e-3 ? [{ n: t.shown, o: 1 }, { n: t.shown + 1, o: t.mix }] : [{ n: t.shown, o: 1 }];
  const s = photoState(p.frame, { photo: { src: p.src, w: p.w, h: p.h, focus: p.focus }, anchor: p.anchor, scale: p.scale, move: p.move, shift: p.shift, room: p.room }, film);
  const L = s.layers[0];
  const A = [(p.anchor ?? [0.5, 0.5])[0] * W, (p.anchor ?? [0.5, 0.5])[1] * H];
  const roll = L.roll ? `translate(${A[0]}px, ${A[1]}px) rotate(${L.roll.toFixed(4)}deg) translate(${-A[0]}px, ${-A[1]}px) ` : '';
  const [rx, ry] = (p.room ?? [0, 0]).map((v) => Math.abs(v));
  // clipped at the frame grown by the room (as Photo): a wrapper carrying the whole clip within the room shows no edge
  const clip: React.CSSProperties = rx || ry ? { overflow: 'visible', clipPath: `inset(${-ry}px ${-rx}px)` } : { overflow: 'hidden' };
  return (
    <div style={{ position: 'absolute', inset: 0, ...clip, background: C.ink, ...p.style }}>
      {p.grade?.duotone && <DuotoneDefs id={duoId} duotone={p.grade.duotone} />}
      <div style={{ position: 'absolute', inset: 0, filter: gradeFilter(p.grade, duoId) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '0 0', transform: `${roll}translate(${L.x.toFixed(3)}px, ${L.y.toFixed(3)}px) scale(${L.k.toFixed(5)})` }}>
          {drawn.map((d) => {
            const M = p.steady ? steadyMatrix(d.n, p.steady, p.w) : null;
            return (
              <div key={d.n} style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, opacity: d.o, transformOrigin: '0 0', transform: M ? `matrix(${M.map((v) => v.toFixed(6)).join(', ')})` : undefined }}>
                <Sequence from={cur - at(d.n)} layout="none">
                  <OffthreadVideo data-imagery="" src={p.src} muted style={{ width: p.w, height: p.h, display: 'block' }} />
                </Sequence>
              </div>
            );
          })}
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
  // a blended clip moves on every film frame; a clock without blend steps wherever it runs under the film's rate
  let stepped: SteppedRange[] = [];
  if (!p.blend) {
    if (p.clock && p.srcFps !== undefined) {
      const sp: number[] = [];
      for (let f = start + 1; f < end; f++) sp.push(Math.abs(clockTime(f, p.clock) - clockTime(f - 1, p.clock)) * fps);
      const moving = sp.filter((v) => v > 1e-6).sort((a, b) => a - b);
      const med = moving.length ? moving[Math.floor(moving.length / 2)] : 1;
      const r = p.srcFps * med;
      if (moving.length && r < fps * 0.95) stepped = [{ from: start, to: end, fps: nearestStep(r), id: p.id ?? 'footage-clock' }];
    } else stepped = footageStepped(p as FootageProps, { ...film, fps });
  }
  return { stepped, flashes: [], cameraBlur: [], seams: seams.slice(0, 64) };
};


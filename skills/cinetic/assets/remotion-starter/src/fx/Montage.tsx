import React, { useId } from 'react';
import { Img, OffthreadVideo, Sequence, useCurrentFrame } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, lmix } from '../lib/anim';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import { type ChainShot, carryChain } from '../lib/handoff';
import type { Declares, Seam } from '../timeline';
import { footageStepped, footageTime, mediaFrame } from './Footage';
import { DuotoneDefs, gradeFilter, type PhotoGrade, photoCover, TintPlate } from './Photo';

/**
 * A montage cut on the film's accents: each shot (a clip or a still) is on screen from one accent to the
 * next, and one travel runs through all of them. The camera in each shot moves along the shot's own
 * direction; it accelerates into each cut and the next shot opens already moving at a share of that
 * speed (lib/handoff carryChain: launch into the cut, carry out of it, a living drift between), so a
 * row of different places reads as one gesture. Cut on the accents the music gives (downbeats, entries)
 * and keep the direction: a montage that changes direction every cut reads as a slideshow.
 *
 * House (60 fps, 1080p): shots of 0.5-1.0 s (one or two beats), the first shot opening at 4 px/f, the
 * cut speed 9 px/f, each shot opening at 0.7 x the last cut's speed, a residual drift of 0.75 px/f
 * (45 px/s), and a push of 3 % per shot so stills live too. Footage plays at real time unless a shot
 * says otherwise; a still never sits without its push.
 */
export type MontageShot = {
  src: string;
  w: number;
  h: number;
  kind?: 'footage' | 'photo'; // default: footage when the name ends in a video extension
  focus?: [number, number];
  from?: number; // footage: source seconds at the shot's first frame
  speed?: number; // footage: x real time
  srcFps?: number;
  dir?: [number, number]; // the travel's direction on screen (default [-1, 0]: the world slides left)
  push?: number; // scale at the shot's end (default 1.03)
  grade?: PhotoGrade; // per shot (default the montage's)
};
export type MontageProps = {
  frame: number;
  start: number; // the first shot's first frame
  cuts: number[]; // the first frame of every later shot (the accents); shots.length - 1 of them
  end: number; // the frame after the last shot
  shots: MontageShot[];
  travel?: { v0?: number; vCut?: number; ratio?: number; residual?: number }; // px per 60 fps frame
  exit?: { vCut?: number }; // the last shot builds into the frame before `end` too (the next scene carries it), px per 60 fps frame
  grade?: PhotoGrade;
  style?: React.CSSProperties;
  id?: string;
};

export const MONTAGE_HOUSE = { v0: 4, vCut: 9, ratio: 0.7, residual: 0.75, push: 1.03 } as const;

const isVideo = (s: MontageShot) => s.kind === 'footage' || (s.kind === undefined && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.src));

/** Shot i's frames: [first, last] (last = the frame before the next cut). */
export const montageFrames = (p: Pick<MontageProps, 'start' | 'cuts' | 'end' | 'shots'>) =>
  p.shots.map((_, i) => ({ first: i === 0 ? p.start : p.cuts[i - 1], last: (i < p.cuts.length ? p.cuts[i] : p.end) - 1 }));

const chainOf = (p: MontageProps, fps: number): ChainShot[] => {
  const tr = { ...MONTAGE_HOUSE, ...(p.travel ?? {}) };
  const fr = montageFrames(p);
  return p.shots.map((_, i) => {
    const last = i === fr.length - 1;
    const exits = !last || p.exit !== undefined;
    return {
      cut: exits ? fr[i].last : undefined,
      carry: i === 0 ? { v0: (tr.v0 * 60) / fps, residual: tr.residual, fps } : { ratio: tr.ratio, residual: tr.residual, fps },
      launch: exits ? { vCut: (((last ? p.exit?.vCut : undefined) ?? tr.vCut) * 60) / fps, fps } : undefined,
    };
  });
};

export type MontageState = { shot: number; first: number; last: number; local: number; travel: number; speed: number; total: number; push: number };

/**
 * The montage at frame f: which shot, frames into it, the travel inside it (px along its direction, 0 on
 * its first frame), the speed now (px per film frame), the shot's whole travel, and its push. Pure.
 */
export const montageState = (f: number, p: MontageProps, film?: Partial<FilmCtx>): MontageState => {
  const fps = fpsOf(film);
  const fr = montageFrames(p);
  const ff = clamp(f, p.start, p.end - 1);
  const chain = chainOf(p, fps);
  const c = carryChain(ff, p.start, chain, fps);
  const i = c.shot;
  const endOf = carryChain(fr[i].last, p.start, chain, fps);
  const total = endOf.local;
  const t = clamp((ff - fr[i].first) / Math.max(1, fr[i].last - fr[i].first));
  return { shot: i, first: fr[i].first, last: fr[i].last, local: ff - fr[i].first, travel: c.local, speed: c.v, total, push: lmix(1, p.shots[i].push ?? MONTAGE_HOUSE.push, t) };
};

export const Montage: React.FC<MontageProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const uid = useId().replace(/:/g, '');
  const cur = useCurrentFrame();
  const s = montageState(p.frame, p, film);
  const shot = p.shots[s.shot];
  const dir = shot.dir ?? [-1, 0];
  const n = Math.hypot(dir[0], dir[1]) || 1;
  const u: [number, number] = [dir[0] / n, dir[1] / n];
  const half = Math.abs(s.total) / 2;
  // room for the whole travel (centred on the focus) and the push
  const cover = photoCover({ src: shot.src, w: shot.w, h: shot.h, focus: shot.focus }, film, { move: { drift: [u[0] * half, u[1] * half] } });
  const k = cover.k * s.push; // the push only adds margin
  const x = W / 2 + (cover.x - W / 2) * s.push + u[0] * (s.travel - half);
  const y = H / 2 + (cover.y - H / 2) * s.push + u[1] * (s.travel - half);
  const grade = shot.grade ?? p.grade;
  const duoId = `mduo-${p.id ?? uid}-${s.shot}`;
  let inner: React.ReactNode;
  if (isVideo(shot)) {
    const t = footageTime(p.frame, { start: s.first, from: shot.from, speed: shot.speed, srcFps: shot.srcFps }, film);
    const sf = shot.srcFps ?? film.fps;
    // a Sequence shifted so the video's own clock stands on the source frame (Freeze does not reach it)
    inner = (
      <Sequence from={cur - mediaFrame(t.shown, sf, film.fps)} layout="none">
        <OffthreadVideo data-imagery="" src={shot.src} muted style={{ width: shot.w, height: shot.h, display: 'block' }} />
      </Sequence>
    );
  } else inner = <Img data-imagery="" src={shot.src} style={{ width: shot.w, height: shot.h, display: 'block' }} />;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.ink, ...p.style }}>
      {grade?.duotone && <DuotoneDefs id={duoId} duotone={grade.duotone} />}
      <div style={{ position: 'absolute', inset: 0, filter: gradeFilter(grade, duoId) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: shot.w, height: shot.h, transformOrigin: '0 0', transform: `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) scale(${k.toFixed(5)})` }}>{inner}</div>
      </div>
      <TintPlate grade={grade} />
    </div>
  );
};

/** The speed (px per film frame) on the montage's last frame, for the next scene's carry (with `exit`). */
export const montageExitSpeed = (p: MontageProps, film?: Partial<FilmCtx>) => montageState(p.end - 1, p, film).speed;

/** Every cut is a velocity seam carrying x along the travel; footage below the film's rate is stepped. */
export const declares = (p?: Partial<MontageProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || !p.shots || !p.cuts || p.start === undefined || p.end === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = montageFrames(p as MontageProps);
  const id = p.id ?? 'montage';
  const seams: Seam[] = p.cuts.map((at, i) => {
    const d = p.shots?.[i + 1]?.dir ?? [-1, 0];
    return { at, kind: 'velocity' as const, carry: (Math.abs(d[0]) >= Math.abs(d[1]) ? 'x' : 'y') as 'x' | 'y', dir: ((Math.abs(d[0]) >= Math.abs(d[1]) ? d[0] : d[1]) >= 0 ? 1 : -1) as 1 | -1, id };
  });
  const stepped = p.shots.flatMap((sh, i) => (isVideo(sh) ? footageStepped({ start: fr[i].first, dur: fr[i].last - fr[i].first + 1, srcFps: sh.srcFps, speed: sh.speed, id: `${id}-${i}` }, film) : []));
  return { stepped, flashes: [], cameraBlur: [], seams };
};

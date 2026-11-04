import React from 'react';
import { rand } from '../lib/anim';
import { stepFrame } from '../lib/cadence';
import { type FilmCtx, fpsOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Markers: small squares (or short bars) on the corners of whatever the film is pointing at, a word,
 * a figure, a card. When the target changes they do not tween: on a stepped clock (house 16 fps) each
 * marker's leading end jumps most of the way on the first pose and settles by a fixed share a pose
 * (house 0.38 of the rest), its trailing end follows a pose behind (house 0.315 a pose), so a marker
 * stretches toward its new place and snaps back to a square. A stretch longer than three markers splits
 * into a leading piece and an echo piece with a gap: echo bars replace motion blur. Zero tween frames.
 * Optional blink: the markers flicker on uneven but repeatable runs (house on 1-5, off 1-3 frames)
 * from a seed. Boxes change exactly on their onsets (put them on word onsets).
 */

export type Box = { x: number; y: number; w: number; h: number };
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type MarkersProps = {
  boxes: Box[]; // targets in order
  onsets: number[]; // frame each box becomes the target (the first: the markers appear)
  fps?: number; // stepped clock (house 16)
  phase?: number; // stepped grid phase, film frames
  corners?: Corner[]; // house all four
  size?: number; // marker edge, px at 1080p (house 24)
  jump?: number; // share of the move the leading end makes on the first pose (house 0.83)
  lead?: number; // the leading end's remaining share after each further pose (house 0.38)
  trail?: number; // the trailing end's remaining share after each pose (house 0.315)
  echo?: false | { over?: number; gap?: number; lead?: number }; // split a stretch longer than `over` markers (house 3) into lead (0.36) + gap (0.11) + echo
  blink?: false | { seed?: string | number; on?: [number, number]; off?: [number, number]; from?: number; to?: number };
  color?: string;
  id?: string;
};

export const MARKERS = { fps: 16, size: 24, jump: 0.83, lead: 0.38, trail: 0.315, echo: { over: 3, gap: 0.11, lead: 0.36 }, blink: { on: [1, 5] as [number, number], off: [1, 3] as [number, number] } } as const;

export type MarkerRect = { corner: Corner; rects: Box[] };
export type MarkerState = { visible: boolean; target: number; pose: number; markers: MarkerRect[] };

/** The corner point of a box. */
const cornerOf = (b: Box, c: Corner): [number, number] => [c[1] === 'l' ? b.x : b.x + b.w, c[0] === 't' ? b.y : b.y + b.h];

/** Pose index on the stepped clock since an onset (0 on the onset frame's pose). */
const poseSince = (frame: number, onset: number, fps: number, filmFps: number, phase: number) => {
  const per = filmFps / fps;
  const s = stepFrame(frame, { animFps: fps, filmFps, phase });
  const s0 = stepFrame(onset, { animFps: fps, filmFps, phase });
  return Math.max(0, Math.round((s - s0) / per));
};

/** A seeded blink: on or off at frame f (runs of whole frames from `from`). Pure; iterates the runs. */
export const blinkOn = (frame: number, b: { seed?: string | number; on?: [number, number]; off?: [number, number]; from?: number; to?: number }) => {
  const from = b.from ?? 0;
  const f = Math.round(frame);
  if (f < from || (b.to !== undefined && f > b.to)) return true;
  const [on0, on1] = b.on ?? MARKERS.blink.on;
  const [of0, of1] = b.off ?? MARKERS.blink.off;
  const seed = b.seed ?? 'blink';
  let t = from;
  for (let i = 0; i < 100000; i++) {
    const on = on0 + Math.floor(rand(`${seed}:on:${i}`) * (on1 - on0 + 1));
    if (f < t + on) return true;
    t += on;
    const off = of0 + Math.floor(rand(`${seed}:off:${i}`) * (of1 - of0 + 1));
    if (f < t + off) return false;
    t += off;
  }
  return true;
};

/**
 * Every marker rect at frame f. A marker is an interval along x (its ends) of height `size`: on a jump
 * from box A to box B, each end moves from its place on A to its place on B; the end on the side of
 * the move leads (jump, then lead per pose), the other trails (trail per pose). Pure.
 */
export const markerState = (frame: number, p: MarkersProps, film?: Partial<FilmCtx>): MarkerState => {
  const filmFps = fpsOf(film);
  const s = (film?.height ?? 1080) / 1080;
  const fps = p.fps ?? MARKERS.fps;
  const phase = p.phase ?? 0;
  const size = (p.size ?? MARKERS.size) * s;
  const f = Math.round(frame);
  let ti = -1;
  for (let i = 0; i < p.onsets.length; i++) if (f >= p.onsets[i]) ti = i;
  const visible = ti >= 0 && (p.blink ? blinkOn(f, p.blink) : true);
  if (ti < 0) return { visible: false, target: -1, pose: 0, markers: [] };
  const B = p.boxes[ti];
  const A = ti > 0 ? p.boxes[ti - 1] : B;
  const k = poseSince(f, p.onsets[ti], fps, filmFps, phase);
  const jump = p.jump ?? MARKERS.jump;
  const lead = p.lead ?? MARKERS.lead;
  const trail = p.trail ?? MARKERS.trail;
  const echo = p.echo === false ? null : { over: p.echo?.over ?? MARKERS.echo.over, gap: p.echo?.gap ?? MARKERS.echo.gap, lead: p.echo?.lead ?? MARKERS.echo.lead };
  const corners = p.corners ?? (['tl', 'tr', 'bl', 'br'] as Corner[]);
  const markers = corners.map((c): MarkerRect => {
    const [ax, ay] = cornerOf(A, c);
    const [bx, by] = cornerOf(B, c);
    // the marker's x interval on each box: it sits inside the corner
    const inA: [number, number] = c[1] === 'l' ? [ax, ax + size] : [ax - size, ax];
    const inB: [number, number] = c[1] === 'l' ? [bx, bx + size] : [bx - size, bx];
    const dir = Math.sign(bx - ax); // +1 moving right
    const leadIdx = dir >= 0 ? 1 : 0; // the end on the side of the move
    const ends: [number, number] = [0, 0];
    for (const e of [0, 1]) {
      const d = inA[e] - inB[e];
      const rest = e === leadIdx ? d * (1 - jump) * lead ** k : d * trail ** k;
      ends[e] = inB[e] + (ti === 0 ? 0 : rest);
    }
    const yRest = (ay - by) * trail ** k;
    const y = (c[0] === 't' ? by : by - size) + (ti === 0 ? 0 : yRest);
    const x0 = Math.min(ends[0], ends[1]);
    const x1 = Math.max(ends[0], ends[1]);
    const len = x1 - x0;
    if (echo && len > echo.over * size) {
      const a = len * echo.lead;
      const g = len * echo.gap;
      // the leading piece sits at the leading end; the echo at the trailing end
      const rects: Box[] =
        dir >= 0
          ? [{ x: x1 - a, y, w: a, h: size }, { x: x0, y, w: len - a - g, h: size }]
          : [{ x: x0, y, w: a, h: size }, { x: x0 + a + g, y, w: len - a - g, h: size }];
      return { corner: c, rects };
    }
    return { corner: c, rects: [{ x: x0, y, w: Math.max(size * 0.25, len), h: size }] };
  });
  return { visible, target: ti, pose: k, markers };
};

/** Frames where the markers jump (their onsets) and where each settle is done (within 0.5 px). */
export const markerFrames = (p: MarkersProps, film?: Partial<FilmCtx>) => {
  const filmFps = fpsOf(film);
  const per = filmFps / (p.fps ?? MARKERS.fps);
  const trail = p.trail ?? MARKERS.trail;
  return p.onsets.map((at, i) => {
    if (i === 0) return { at, settled: at };
    const A = p.boxes[i - 1];
    const B = p.boxes[i];
    const d = Math.max(Math.abs(A.x - B.x), Math.abs(A.x + A.w - B.x - B.w), Math.abs(A.y - B.y), 1);
    const poses = Math.ceil(Math.log(0.5 / d) / Math.log(trail));
    return { at, settled: Math.ceil(at + poses * per) };
  });
};

/** Draws the markers: flat rects, no blur, no tween. `frame` is local. */
export const Markers: React.FC<MarkersProps & { frame: number }> = (props) => {
  const film = useFilm();
  const s = markerState(props.frame, props, film);
  if (!s.visible) return null;
  const color = props.color ?? C.mute;
  return (
    <svg width={film.width} height={film.height} viewBox={`0 0 ${film.width} ${film.height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden>
      {s.markers.flatMap((m) => m.rects.map((r, i) => <rect key={`${m.corner}${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={color} />))}
    </svg>
  );
};

/** Markers step on a 16 fps clock: their active span is a stepped range (one sample, no shutter blur). */
export const declares = (p?: Partial<MarkersProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p?.onsets?.length || !p.boxes?.length) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = markerFrames(p as MarkersProps, film);
  const fps = p.fps ?? MARKERS.fps;
  const range = { from: p.onsets[0], to: Math.max(p.onsets[0] + 1, fr[fr.length - 1].settled), id: p.id ?? 'markers' } as { from: number; to: number; id: string; fps?: 12 | 16 | 20 | 30 };
  if ([12, 16, 20, 30].includes(fps)) range.fps = fps as 12 | 16 | 20 | 30;
  return { stepped: [range], flashes: [], cameraBlur: [], seams: [] };
};

import React from 'react';
import { clamp, type Ease, E, M, mix, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { C } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Corners: four tiny squares on the corners of an invisible box around the words being read. Each corner
 * lives on its own: it blinks on a seeded, uneven rhythm (short flickers of 2-4 frames mixed with long
 * holds of 12-34 frames, off for 2-8, at 60 fps; about two thirds of the time on, all four together only
 * now and then), and when the box changes it teleports on its own frame (house order: top right first,
 * top left 2 f later, then the bottom pair 8-9 f later), never tweening. The box steps on word onsets,
 * sometimes a few frames early so the frame is ready for a long word, and is often larger than the text.
 * After the phrase ends the corners linger and blink alone for a beat, then go.
 *
 * Variants on the same state (one primitive, props):
 *   mode 'glide'  the corners follow a line's re-centre on its curve instead of teleporting
 *   mode 'jump'   each corner covers about 55 % of the way on its first frame and settles exponentially
 *                 (tau 2.5 f at 60 fps: 90 % home 4 f later); on its first frames it is drawn as three short
 *                 echo bars along its path (opacity .5, .7, .9) instead of motion blur
 *   anticipate    in the last 8-13 f before a corner's next jump it stretches toward the next box's corner
 *                 (reach 0.4 of the way, accelerating), then snaps
 *   shape 'L'     L-shaped brackets (an arm and a stroke) instead of squares
 *   chase         a loading chase made of the corners themselves: they turn dark in order (TL, then TR and
 *                 BL, then BR) and back, one step every 2.5 f at 60 fps (15 f a cycle)
 *   colors        per box and per corner colours (swatches picked from each card's image), swapped on the cut
 *   pop           one corner enters as a large square and shrinks to size (an oversized landing, 18 f)
 *
 * Pure: cornersState(f) for any fractional frame in any order; discrete state decides on whole frames.
 */

export type Box = { x: number; y: number; w: number; h: number };
export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export const CORNER_ORDER: Corner[] = ['tl', 'tr', 'bl', 'br'];

/** House numbers: px at 1080p, frames at 60 fps (converted to the film's rate). */
export const CORNERS = {
  size: 24,
  radius: 3,
  stagger60: { tl: 2, tr: 0, bl: 8, br: 9 } as Record<Corner, number>,
  blink: { short: [2, 4] as [number, number], long: [12, 34] as [number, number], pShort: 0.56, off: [2, 8] as [number, number] },
  linger60: 15,
  glide60: 22,
  jump: { share: 0.55, tau60: 2.5, echo60: 3, segs: [[0, 0.28], [0.4, 0.62], [0.74, 0.92]] as [number, number][], alpha: [0.5, 0.7, 0.9] },
  anticipate: { frames60: 10, reach: 0.4 },
  L: { arm: 1, stroke: 0.14 }, // arm = size, stroke = share of the size
  chase: { every60: 2.5, order: [['tl'], ['tr', 'bl'], ['br']] as Corner[][] },
  pop: { from: 2.5, frames60: 18 },
} as const;

export type CornerBlink = {
  seed?: string | number;
  short?: [number, number]; // short on-runs, 60 fps frames
  long?: [number, number]; // long on-runs (holds)
  pShort?: number; // share of on-runs that are short flickers
  off?: [number, number]; // off-runs
};

export type CornersProps = {
  boxes: Box[]; // targets in order (px)
  onsets: number[]; // the frame each box becomes the target; the first: the corners appear
  end?: number; // the phrase's last frame: corners linger after it, then go (default: they stay)
  linger?: number; // 60 fps frames of lone blinking after `end` (house 15)
  stagger?: false | Partial<Record<Corner, number>>; // per-corner delay of each jump after the first, 60 fps frames (house tl 2, tr 0, bl 8, br 9)
  mode?: 'snap' | 'glide' | 'jump';
  glide?: { frames?: number; ease?: Ease }; // glide: 60 fps frames (house 22) on E.jump
  jump?: { share?: number; tau?: number; echo?: false | number }; // jump: first-frame share (house 0.55), settle tau (60 fps frames, house 2.5), echo frames (house 3)
  anticipate?: false | { frames?: number; reach?: number; ease?: Ease }; // stretch toward the next box before each jump (house 10 f, reach 0.4, E.buildIn)
  blink?: false | CornerBlink; // house on, seeded per corner
  size?: number; // px at 1080p (house 24)
  radius?: number; // px at 1080p (house 3: slightly rounded)
  shape?: 'square' | 'L';
  inside?: boolean; // squares sit inside the box corners (house) or centred on them
  color?: string;
  colors?: string[][]; // per box, per corner in CORNER_ORDER
  chase?: { at: number; color: string; order?: Corner[][]; every?: number; cycles?: number };
  pop?: { corner: Corner; from?: number; frames?: number };
  id?: string;
};

/** One drawn piece of a corner: the marker itself (echo false) or one of its echo bars; seg: an echo bar's centre line
 *  (x0, y0, x1, y1), drawn as a bar of the marker's width along the path (any angle). */
export type CornerRect = { x: number; y: number; w: number; h: number; opacity: number; echo: boolean; seg?: [number, number, number, number] };
export type CornerState = { corner: Corner; x: number; y: number; size: number; visible: boolean; color: string; scale: number; target: number; rects: CornerRect[] };
export type CornersState = { active: boolean; corners: CornerState[] };

const cornerPoint = (b: Box, c: Corner): [number, number] => [c[1] === 'l' ? b.x : b.x + b.w, c[0] === 't' ? b.y : b.y + b.h];

/** The frame corner `c` takes box i (whole frames): the onset, plus the corner's stagger after the first box. */
export const cornerOnset = (p: CornersProps, i: number, c: Corner, film?: Partial<FilmCtx>): number => {
  if (i === 0 || p.stagger === false) return p.onsets[i];
  const s = { ...CORNERS.stagger60, ...(p.stagger ?? {}) }[c] ?? 0;
  return p.onsets[i] + Math.round(f60x(s, fpsOf(film)));
};

/**
 * A seeded blink, whole frames: alternate on and off runs from `from` (starting on). On-runs are short
 * flickers (probability pShort) or long holds. Iterates the runs, so cost grows with (f - from) / 8.
 */
export const cornerBlinkOn = (frame: number, from: number, b: CornerBlink, salt: string, fps: number): boolean => {
  const f = Math.round(frame);
  if (f < from) return false;
  const k = (n: number) => Math.max(1, Math.round(f60x(n, fps)));
  const sh = b.short ?? CORNERS.blink.short;
  const lo = b.long ?? CORNERS.blink.long;
  const of = b.off ?? CORNERS.blink.off;
  const pS = b.pShort ?? CORNERS.blink.pShort;
  const seed = `${b.seed ?? 'corners'}:${salt}`;
  const pick = (r: [number, number], i: number, tag: string) => k(r[0] + Math.floor(rand(`${seed}:${tag}:${i}`) * (r[1] - r[0] + 1)));
  let t = from;
  for (let i = 0; i < 100000; i++) {
    const on = rand(`${seed}:kind:${i}`) < pS ? pick(sh, i, 's') : pick(lo, i, 'l');
    if (f < t + on) return true;
    t += on;
    const off = pick(of, i, 'o');
    if (f < t + off) return false;
    t += off;
  }
  return true;
};

/**
 * Progress of a 'jump' move `t` film frames after the corner's onset (t >= 0): `share` on the onset frame,
 * then 1 - (1 - share) e^(-t / tau), tau in film frames (house 2.5 at 60 fps). Whole frames decide.
 */
export const cornerJumpProgress = (t: number, share: number = CORNERS.jump.share, tau: number = CORNERS.jump.tau60): number =>
  t < 0 ? 0 : 1 - (1 - share) * Math.exp(-Math.round(t) / Math.max(1e-6, tau));

/** Every corner at frame f: where it is, whether it shows, its colour, scale and drawn pieces. Pure. */
export const cornersState = (frame: number, p: CornersProps, film?: Partial<FilmCtx>): CornersState => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const F = Math.round(frame);
  const size = (p.size ?? CORNERS.size) * u;
  const inside = p.inside ?? true;
  const mode = p.mode ?? 'snap';
  const lingerEnd = p.end === undefined ? Infinity : p.end + Math.round(f60x(p.linger ?? CORNERS.linger60, fps));
  const first = p.onsets.length ? p.onsets[0] : Infinity;
  const active = F >= first && F <= lingerEnd;
  // the square's top-left for a corner point (inside the box or centred on the point)
  const place = (c: Corner, x: number, y: number): [number, number] =>
    inside ? [c[1] === 'r' ? x - size : x, c[0] === 'b' ? y - size : y] : [x - size / 2, y - size / 2];
  const corners = CORNER_ORDER.map((c, ci): CornerState => {
    let ti = -1;
    for (let i = 0; i < p.onsets.length; i++) if (F >= cornerOnset(p, i, c, film)) ti = i;
    const base = p.color ?? C.mute;
    if (ti < 0 || !active) return { corner: c, x: 0, y: 0, size, visible: false, color: base, scale: 1, target: ti, rects: [] };
    const B = p.boxes[Math.min(ti, p.boxes.length - 1)];
    let [x, y] = cornerPoint(B, c);
    const echoes: CornerRect[] = [];
    if (ti > 0 && mode !== 'snap') {
      const A = p.boxes[Math.min(ti - 1, p.boxes.length - 1)];
      const [ax, ay] = cornerPoint(A, c);
      const t0 = cornerOnset(p, ti, c, film);
      let t = 1;
      if (mode === 'glide') {
        const g = Math.max(1, f60x(p.glide?.frames ?? CORNERS.glide60, fps));
        t = (p.glide?.ease ?? E.jump)(clamp((frame - t0) / g));
      } else {
        const share = p.jump?.share ?? CORNERS.jump.share;
        const tau = f60x(p.jump?.tau ?? CORNERS.jump.tau60, fps);
        t = cornerJumpProgress(F - t0, share, tau);
        const echoF = p.jump?.echo === false ? 0 : Math.max(1, Math.round(f60x(p.jump?.echo ?? CORNERS.jump.echo60, fps)));
        if (F - t0 < echoF) {
          // three bars along the path from where it was to where it is now
          const [sx, sy] = place(c, ax, ay);
          const [ex, ey] = place(c, mix(ax, x, t), mix(ay, y, t));
          CORNERS.jump.segs.forEach(([s0, s1], j) => {
            const x0 = mix(sx, ex, s0);
            const y0 = mix(sy, ey, s0);
            const x1 = mix(sx, ex, s1);
            const y1 = mix(sy, ey, s1);
            echoes.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0) + size, h: Math.abs(y1 - y0) + size, opacity: CORNERS.jump.alpha[j], echo: true, seg: [x0 + size / 2, y0 + size / 2, x1 + size / 2, y1 + size / 2] });
          });
        }
      }
      x = mix(ax, x, t);
      y = mix(ay, y, t);
    }
    const [px, py] = place(c, x, y);
    let main: CornerRect = { x: px, y: py, w: size, h: size, opacity: 1, echo: false };
    // anticipation: stretch toward the next box's corner before the next jump
    if (p.anticipate && ti + 1 < p.onsets.length) {
      const nextAt = cornerOnset(p, ti + 1, c, film);
      const fr = Math.max(1, f60x(p.anticipate.frames ?? CORNERS.anticipate.frames60, fps));
      const k = (p.anticipate.ease ?? E.buildIn)(clamp((frame - (nextAt - fr)) / Math.max(1, fr - 1))) * (p.anticipate.reach ?? CORNERS.anticipate.reach); // full reach on the frame before the jump
      if (k > 0) {
        const N = p.boxes[Math.min(ti + 1, p.boxes.length - 1)];
        const [nx, ny] = place(c, ...cornerPoint(N, c));
        const tx = mix(px, nx, k);
        const ty = mix(py, ny, k);
        main = { x: Math.min(px, tx), y: Math.min(py, ty), w: Math.abs(tx - px) + size, h: Math.abs(ty - py) + size, opacity: 1, echo: false };
      }
    }
    let visible = p.blink === false ? true : cornerBlinkOn(F, cornerOnset(p, 0, c, film), p.blink ?? {}, c, fps);
    let color = p.colors?.[ti]?.[ci] ?? base;
    if (p.chase) {
      const order = p.chase.order ?? CORNERS.chase.order;
      const n = order.length;
      const every = Math.max(1e-6, f60x(p.chase.every ?? CORNERS.chase.every60, fps));
      const k = Math.floor((F - p.chase.at) / every + 1e-9);
      if (k >= 0 && k < 2 * n * (p.chase.cycles ?? 1)) {
        const s = k % (2 * n);
        const g = order.findIndex((grp) => grp.includes(c));
        const dark = s < n ? g <= s : g > s - n;
        if (dark) color = p.chase.color;
        visible = true;
      }
    }
    if (echoes.length) visible = true; // a corner in flight always shows (the echo is the move)
    let scale = 1;
    if (p.pop && p.pop.corner === c) {
      const fr = Math.max(1, f60x(p.pop.frames ?? CORNERS.pop.frames60, fps));
      scale = mix(p.pop.from ?? CORNERS.pop.from, 1, M.oversize(clamp((frame - p.onsets[0]) / fr)));
    }
    return { corner: c, x: px, y: py, size, visible, color, scale, target: ti, rects: [...echoes, main] };
  });
  return { active, corners };
};

/** Sync cues: every corner jump (its own frame) and every chase step, sorted. Put ticks on the jumps, not on each blink. */
export const cornerFrames = (p: CornersProps, film?: Partial<FilmCtx>) => {
  const jumps = p.onsets.flatMap((_, i) => CORNER_ORDER.map((c) => ({ at: cornerOnset(p, i, c, film), corner: c, target: i })));
  jumps.sort((a, b) => a.at - b.at);
  const fps = fpsOf(film);
  const chase = p.chase
    ? Array.from({ length: 2 * (p.chase.order ?? CORNERS.chase.order).length * (p.chase.cycles ?? 1) }, (_, k) => Math.round(p.chase!.at + k * f60x(p.chase!.every ?? CORNERS.chase.every60, fps)))
    : [];
  const end = p.end === undefined ? undefined : p.end + Math.round(f60x(p.linger ?? CORNERS.linger60, fps));
  return { jumps, chase, end };
};

/** An L bracket for corner c in a size x size cell: the arm along both outer edges, `stroke` thick. */
const lPath = (c: Corner, x: number, y: number, s: number, t: number) => {
  const l = c[1] === 'l';
  const top = c[0] === 't';
  const X0 = l ? x : x + s - t;
  const Y0 = top ? y : y + s - t;
  return `M${x} ${Y0}h${s}v${t}h${-s}Z M${X0} ${y}h${t}v${s}h${-t}Z`;
};

/** Draws the corners: flat rounded squares (or L brackets) and their echo bars. No blur. `frame` is local. */
export const Corners: React.FC<CornersProps & { frame: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = cornersState(props.frame, props, film);
  if (!s.active) return null;
  const r = (props.radius ?? CORNERS.radius) * uOf(film);
  const L = (props.shape ?? 'square') === 'L';
  return (
    <svg width={film.width} height={film.height} viewBox={`0 0 ${film.width} ${film.height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...props.style }} aria-hidden>
      {s.corners
        .filter((c) => c.visible)
        .map((c) =>
          c.rects.map((q, j) => {
            const key = `${c.corner}-${j}`;
            if (!q.echo && q.w === c.size && q.h === c.size && (c.scale !== 1 || L)) {
              const sz = c.size * c.scale;
              const x = q.x + c.size / 2 - sz / 2;
              const y = q.y + c.size / 2 - sz / 2;
              return L ? <path key={key} d={lPath(c.corner, x, y, sz, Math.max(1, sz * CORNERS.L.stroke))} fill={c.color} /> : <rect key={key} x={x} y={y} width={sz} height={sz} rx={r * c.scale} fill={c.color} />;
            }
            if (q.seg) return <line key={key} x1={q.seg[0]} y1={q.seg[1]} x2={q.seg[2]} y2={q.seg[3]} stroke={c.color} strokeWidth={c.size} strokeLinecap="square" opacity={q.opacity} />;
            return <rect key={key} x={q.x} y={q.y} width={q.w} height={q.h} rx={L ? 0 : r} fill={c.color} opacity={q.opacity} />;
          }),
        )}
    </svg>
  );
};

/** The corners never tween (snap and jump): their span is a stepped range (one sample a frame, no shutter blur). */
export const declares = (p?: Partial<CornersProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p?.onsets?.length) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = cornerFrames(p as CornersProps, film);
  const last = fr.end ?? Math.max(...fr.jumps.map((j) => j.at), ...(fr.chase.length ? fr.chase : [0])) + 1;
  return { stepped: [{ from: p.onsets[0], to: Math.max(p.onsets[0] + 1, last), id: p.id ?? 'corners' }], flashes: [], cameraBlur: [], seams: [] };
};

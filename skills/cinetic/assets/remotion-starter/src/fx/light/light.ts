// Pure helpers for the light parts (fx/light): where a box sees the world's key from, a rounded rect as a path, the
// timing of a light sweep, and colours with alpha. Node-safe: no React, no DOM, no clock. Numbers are px at 1080p and
// 60 fps frames unless they say otherwise; every function is a closed form of its inputs (any frame, any order).
import { clamp, E, type Ease } from '../../lib/anim';
import { type FilmCtx, f60x, fpsOf } from '../../lib/film';

/** A box in frame px; `r` its corner radius. */
export type Box = { x: number; y: number; w: number; h: number; r?: number };

/**
 * A world's key light: where it comes from as a point in shares of the frame (outside 0..1 is off frame: -0.2 above the
 * top edge), its colour and its strength (0..1). Every rim, sweep and glare in the world faces this point.
 */
export type Key = { x: number; y: number; color: string; strength: number };

/** Screen angle in degrees (0 right, 90 down, -90 up) from the box's centre toward the key. */
export const keyAngle = (box: Box, key: Pick<Key, 'x' | 'y'>, W: number, H: number) =>
  (Math.atan2(key.y * H - (box.y + box.h / 2), key.x * W - (box.x + box.w / 2)) * 180) / Math.PI;

/** The corner radius a box gets when none is given: a pill up to 140 px tall, else 28 px (u: the film's unit). */
export const radiusOf = (box: Pick<Box, 'w' | 'h' | 'r'>, u = 1) => Math.min(box.r ?? (box.h <= 140 * u ? box.h / 2 : 28 * u), box.w / 2, box.h / 2);

/** A w x h rounded rect (radius r, inset by `inset`) as an SVG path that starts at the middle of the top edge and runs clockwise. */
export const roundRectPath = (w: number, h: number, r: number, inset = 0) => {
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const rr = Math.max(0, Math.min(r - inset, (x1 - x0) / 2, (y1 - y0) / 2));
  const f = (v: number) => v.toFixed(2);
  return [
    `M${f((x0 + x1) / 2)} ${f(y0)}`,
    `H${f(x1 - rr)}`,
    `A${f(rr)} ${f(rr)} 0 0 1 ${f(x1)} ${f(y0 + rr)}`,
    `V${f(y1 - rr)}`,
    `A${f(rr)} ${f(rr)} 0 0 1 ${f(x1 - rr)} ${f(y1)}`,
    `H${f(x0 + rr)}`,
    `A${f(rr)} ${f(rr)} 0 0 1 ${f(x0)} ${f(y1 - rr)}`,
    `V${f(y0 + rr)}`,
    `A${f(rr)} ${f(rr)} 0 0 1 ${f(x0 + rr)} ${f(y0)}`,
    'Z',
  ].join(' ');
};

/**
 * The point at share `s` of a w x h rounded rect's perimeter (0..1 from the middle of the top edge, clockwise: the same
 * parametrisation as roundRectPath with pathLength 1), in the box's own px, with its outward normal in degrees. Pure.
 */
export const perimeterPoint = (w: number, h: number, r: number, s: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const sw = w - 2 * rr;
  const sh = h - 2 * rr;
  const arc = (Math.PI * rr) / 2;
  const arcAt = (cx: number, cy: number, a0: number, t: number) => {
    const a = a0 + (arc > 0 ? (t / arc) * 90 : 0);
    const rad = (a * Math.PI) / 180;
    return { x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad), n: a };
  };
  const segs: [number, (t: number) => { x: number; y: number; n: number }][] = [
    [sw / 2, (t) => ({ x: w / 2 + t, y: 0, n: -90 })],
    [arc, (t) => arcAt(w - rr, rr, -90, t)],
    [sh, (t) => ({ x: w, y: rr + t, n: 0 })],
    [arc, (t) => arcAt(w - rr, h - rr, 0, t)],
    [sw, (t) => ({ x: w - rr - t, y: h, n: 90 })],
    [arc, (t) => arcAt(rr, h - rr, 90, t)],
    [sh, (t) => ({ x: 0, y: h - rr - t, n: 180 })],
    [arc, (t) => arcAt(rr, rr, 180, t)],
    [sw / 2, (t) => ({ x: rr + t, y: 0, n: -90 })],
  ];
  const L = segs.reduce((a, [len]) => a + len, 0);
  let d = (((s % 1) + 1) % 1) * L;
  for (const [len, at] of segs) {
    if (d <= len) return at(d);
    d -= len;
  }
  return { x: w / 2, y: 0, n: -90 };
};

/**
 * Where a w x h rounded rect's edge faces a light at screen angle `angle` (degrees, from the box's centre): the point
 * on the edge along that ray, in the box's own px (a key above a wide pill lands on its top edge, toward the key's
 * side). The glint of a rim sits here. Pure.
 */
export const edgeToward = (w: number, h: number, r: number, angle: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const a = (angle * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const hw = w / 2;
  const hh = h / 2;
  const t = Math.min(Math.abs(c) > 1e-6 ? hw / Math.abs(c) : Infinity, Math.abs(sn) > 1e-6 ? hh / Math.abs(sn) : Infinity);
  let x = c * t;
  let y = sn * t;
  // inside a corner zone the edge is the arc: project onto it
  if (Math.abs(x) > hw - rr && Math.abs(y) > hh - rr && rr > 0) {
    const ox = Math.sign(x) * (hw - rr);
    const oy = Math.sign(y) * (hh - rr);
    const k = Math.hypot(x - ox, y - oy) || 1;
    x = ox + ((x - ox) * rr) / k;
    y = oy + ((y - oy) * rr) / k;
  }
  return { x: hw + x, y: hh + y };
};

/** House numbers of a light sweep (60 fps frames, shares of the perimeter from the top middle, clockwise). */
export const SWEEP = {
  dur60: 54, // one pass: 0.9 s
  from: 0.82, // starts on the top edge, left of centre on a wide box
  travel: 0.36, // crosses the top edge and turns down the right side
  tail: [0.02, 0.05, 0.1, 0.18] as const, // the streak: a hot head and a tail that fades (lengths, shares of the perimeter)
  tailAlpha: [1, 0.55, 0.28, 0.12] as const,
  // a band: a bar of light crossing the pane, catching its top and bottom edges at once (two streaks, the bottom one
  // ahead by the bar's tilt), each a white-hot line on the edge with a fan of light off it
  band: { tilt: 16, len: 0.2, min: 90, max: 280, aspect: 2.5 },
} as const;

/** How a light crosses a pane: `edge` runs along the rim and turns the corner; `band` crosses it, lighting top and bottom edges together. */
export type SweepKind = 'edge' | 'band';

export type SweepOpts = { at: number; dur60?: number; from?: number; travel?: number; ease?: Ease };

/**
 * A light sweeping round a rounded rect at frame f: `pos` the head (share of the perimeter from the top middle,
 * clockwise, 0..1), `e` the eased progress of the pass, `level` its brightness 0..1 (it rises, travels and fades:
 * sin^0.6 of the pass), `on` while it runs. The head starts, travels and lands on E.stdInOut (a light that crosses
 * the edge, never a loop).
 */
export const sweepState = (f: number, p: SweepOpts, film?: Partial<FilmCtx>) => {
  const dur = f60x(p.dur60 ?? SWEEP.dur60, fpsOf(film));
  const t = (f - p.at) / Math.max(1, dur);
  if (t <= 0 || t >= 1) return { on: false, pos: 0, e: t <= 0 ? 0 : 1, level: 0, t: clamp(t) };
  const e = (p.ease ?? E.stdInOut)(t);
  const pos = (p.from ?? SWEEP.from) + (p.travel ?? SWEEP.travel) * e;
  return { on: true, pos: pos - Math.floor(pos), e, level: Math.sin(Math.PI * t) ** 0.6, t };
};

/** The sweep a pane gets when none is named: a band across a bar or an input (w >= 2.5 h), a light along the rim of a card. Pure. */
export const sweepKindOf = (w: number, h: number, kind?: SweepKind, circle = false): SweepKind =>
  kind ?? (!circle && w >= SWEEP.band.aspect * h ? 'band' : 'edge');

/**
 * A band crossing a w x h pane at eased progress e (0..1, left to right): the bar's centre x at mid-height, the x of
 * its streak on the top edge and on the bottom edge (the bar is tilted `tilt` degrees, its foot ahead), the streak's
 * length, and each streak's level 0..1 (it fades in and out where the straight edge turns into the corner `r`). Pure.
 */
export const bandState = (w: number, h: number, r: number, e: number, u = 1, tilt: number = SWEEP.band.tilt) => {
  const B = SWEEP.band;
  const len = Math.min(B.max * u, Math.max(B.min * u, w * B.len));
  const lean = (h / 2) * Math.tan((tilt * Math.PI) / 180);
  const reach = len / 2 + lean;
  const xc = -reach + (w + 2 * reach) * e;
  const top = xc - lean;
  const bottom = xc + lean;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  // a streak lives on the straight edge: full between the corners, gone half a length past them
  const onEdge = (x: number) => {
    const a = clamp((x - (rr - len * 0.5)) / Math.max(1, len * 0.75));
    const b = clamp((w - rr + len * 0.5 - x) / Math.max(1, len * 0.75));
    return Math.min(a, b) ** 1.5;
  };
  return { xc, top, bottom, len, lean, topLevel: onEdge(top), bottomLevel: onEdge(bottom) };
};

/**
 * A linear-gradient stop position (0..1) for a band of light at x = xc (mid-height) across a w x h box, the gradient at
 * CSS angle `deg` (0 up, clockwise): where the box's own glare must sit so the face lights with the bar. Pure.
 */
export const gradientAt = (w: number, h: number, deg: number, xc: number) => {
  const a = (deg * Math.PI) / 180;
  const L = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return 0.5 + ((xc - w / 2) * Math.sin(a)) / Math.max(1, L);
};

/** The sweep that is running at frame f among several start frames (the latest started), or null. */
export const activeSweep = (f: number, at: number | readonly number[] | undefined, o: Omit<SweepOpts, 'at'> = {}, film?: Partial<FilmCtx>) => {
  if (at === undefined) return null;
  const starts = (typeof at === 'number' ? [at] : [...at]).filter((a) => a <= f).sort((a, b) => b - a);
  for (const a of starts) {
    const s = sweepState(f, { ...o, at: a }, film);
    if (s.on) return s;
  }
  return null;
};

/** An entrance at frame f: 0 before `at`, 1 once landed (E.glideOut over dur60 at 60 fps); 1 when `at` is undefined. */
export const arrival = (f: number, at: number | undefined, dur60 = 30, film?: Partial<FilmCtx>, ease: Ease = E.glideOut) =>
  at === undefined ? 1 : ease(clamp((f - at) / Math.max(1, f60x(dur60, fpsOf(film)))));

// -------------------------------------------------------------------------------------------- colour with alpha
const rgbOf = (c: string): [number, number, number] => {
  const m = c.trim().match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** A colour (hex or 'rgb(...)') at alpha a, as 'rgba(...)'. */
export const rgbaOf = (c: string, a: number) => {
  const [r, g, b] = rgbOf(c);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a).toFixed(3)})`;
};

/** The colour's channels 0..255. */
export const channels = rgbOf;

import React from 'react';
import { clamp, E, fd, hitPulse, mix, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Meter: pictures driven by sound. Each hit opens a pill-shaped bar that is a window onto a picture (the
 * sound's source), and its height is that sound's loudness at film frames through meter ballistics: an
 * instant attack and an exponential release (x0.84 per 60 fps frame). The bar is hot (the accent) at the
 * moment it sounds and cools back to the picture's own tone. A row of thin windows can rush on centre-out
 * into a full meter whose heights flicker on threes, then collapse into a mark's bars.
 *
 *   meterLevel(f, env)       ballistics over a loudness envelope (measured per film frame, 0..1)
 *   hitsEnvelope(f, hits)    a stand-in envelope from cue frames when no measured loudness exists
 *   meterWindowState(f, o)   one window: height from hold to peak by the level, heat, a living breath
 *   meterRowState(f, o)      the full meter: slots switch on centre-out, grow (8 f), flicker on threes
 *   <PillWindow box>         a pill (or any radius) that shows a full-frame layer through itself
 *
 * Every state is a pure function of the frame (the ballistics iterate over the envelope's own samples).
 */

/** House numbers: frames at 60 fps, px at 1080p. */
export const METER = {
  release60: 0.84, // per 60 fps frame
  heat: { gain: 1.15, floor: 0.1 },
  breath: { amount: 0.02, rate: 0.19 }, // a living window: +-2 % at 0.19 rad per 60 fps frame
  row: { order60: 0.9, grow60: 8, flicker60: 3, low: 0.42, h: [300, 680] as [number, number] },
} as const;

/** A loudness envelope sampled at film frames from frame f0 (0..1, e.g. RMS normalised to the loudest hit). */
export type Envelope = { f0: number; env: number[] };

/** The envelope's value at a whole frame (0 outside it). */
export const envAt = (e: Envelope | undefined, frame: number): number => {
  if (!e) return 0;
  const k = fd(frame) - e.f0;
  return k >= 0 && k < e.env.length ? e.env[k] : 0;
};

/**
 * Meter ballistics at frame f: the level jumps up to any louder sample at once and otherwise falls by
 * `release` per 60 fps frame (converted to the film's rate). Pure: iterates the envelope from f0 to f.
 */
export const meterLevel = (frame: number, e: Envelope | undefined, release: number = METER.release60, film?: Partial<FilmCtx>): number => {
  if (!e) return 0;
  const r = release ** (60 / fpsOf(film));
  const end = fd(frame);
  let m = 0;
  for (let k = e.f0; k <= end; k++) m = Math.max(envAt(e, k), m * r);
  return m;
};

/** A stand-in loudness at frame f from cue frames: each hit an attack-decay pulse (lib/anim hitPulse) of its own peak. */
export const hitsEnvelope = (frame: number, hits: { at: number; peak?: number; tau?: number }[], film?: Partial<FilmCtx>): number =>
  hits.reduce((m, h) => Math.max(m, (h.peak ?? 1) * hitPulse(frame - h.at, 1, h.tau ?? 9, fpsOf(film))), 0);

/** The envelope of hitsEnvelope() over [a, b] as an Envelope (to drive meterLevel the same way as a measured one). */
export const hitsToEnvelope = (hits: { at: number; peak?: number; tau?: number }[], a: number, b: number, film?: Partial<FilmCtx>): Envelope => ({
  f0: a,
  env: Array.from({ length: b - a + 1 }, (_, i) => hitsEnvelope(a + i, hits, film)),
});

export type MeterWindowOpts = {
  at: number; // the hit: the window opens (nothing before)
  env?: Envelope; // the sound's loudness (or leave out and give `level`)
  level?: (f: number) => number; // a custom level 0..1
  hold: number; // height at rest, px
  peak: number; // height at full level, px
  release?: number; // per 60 fps frame (house 0.84)
  breath?: number; // living size change share (house 0.02)
  seed?: number; // breath phase
};

/** One window's height, its level and its heat (0 = the picture's tone, 1 = the accent). Pure. */
export const meterWindowState = (frame: number, o: MeterWindowOpts, film?: Partial<FilmCtx>) => {
  if (fd(frame) < o.at) return { visible: false, h: 0, level: 0, heat: 0 };
  const m = o.level ? clamp(o.level(frame)) : meterLevel(frame, o.env, o.release ?? METER.release60, film);
  const life = 1 + (o.breath ?? METER.breath.amount) * Math.sin(((frame - o.at) * METER.breath.rate * 60) / fpsOf(film) + (o.seed ?? 0));
  const h = mix(o.hold, o.peak, m) * life;
  const heat = clamp(m * METER.heat.gain - METER.heat.floor);
  return { visible: true, h, level: m, heat };
};

export type MeterRowOpts = {
  at: number; // the rush starts (the centre slot first)
  n: number; // slots
  x0: number; // first slot's centre x, px
  pitch: number; // px between slots
  skip?: number[]; // slots taken by other windows
  order?: number; // 60 fps frames per slot away from the centre (house 0.9)
  grow?: number; // 60 fps frames a slot takes to open (house 8)
  flicker?: number; // 60 fps frames per flicker step (house 3)
  low?: number; // the flicker's lowest share (house 0.42)
  h: (frame: number) => number; // the row's height at full strength (e.g. rising with the rush and a riser's level)
  hotShare?: (frame: number) => number; // share of slots that run hot on a flicker step (house 0)
  seed?: string | number;
};

/** Every slot of the full meter: centre x, height, whether it shows and whether it is hot. Pure. */
export const meterRowState = (frame: number, o: MeterRowOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const F = fd(frame);
  const per = Math.max(1, Math.round(f60x(o.flicker ?? METER.row.flicker60, fps)));
  const step = Math.floor(F / per);
  const skip = new Set(o.skip ?? []);
  const H = o.h(frame);
  return Array.from({ length: o.n }, (_, i) => {
    const on = o.at + Math.round(f60x(Math.abs(i - (o.n - 1) / 2) * (o.order ?? METER.row.order60), fps));
    if (skip.has(i) || F < on) return { i, x: o.x0 + i * o.pitch, h: 0, visible: false, hot: false };
    const g = E.snapOut(clamp((frame - on) / Math.max(1, f60x(o.grow ?? METER.row.grow60, fps))));
    const low = o.low ?? METER.row.low;
    const fl = low + (1 - low) * rand(`${o.seed ?? 'meter'}:${i}:${step}`);
    const hot = rand(`${o.seed ?? 'meter'}:hot:${i}:${Math.floor(F / (per + 1))}`) < (o.hotShare?.(frame) ?? 0);
    return { i, x: o.x0 + i * o.pitch, h: H * fl * g, visible: true, hot };
  });
};

/**
 * A window onto a full-frame layer: the box (centre cx, cy; w x h px; radius default w / 2: a pill) shows
 * `children` as if the frame were seen through it (children are laid out in frame coordinates). `heat` cross-
 * fades `hot` (a hot version of the layer, e.g. a duotone in the accent) or, without it, an accent overlay.
 */
export const PillWindow: React.FC<{ cx: number; cy: number; w: number; h: number; radius?: number; heat?: number; accent?: string; hot?: React.ReactNode; ground?: string; zoom?: number; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const h = Math.max(0, props.h);
  if (h < 0.5 || props.w < 0.5) return null;
  const left = props.cx - props.w / 2;
  const top = props.cy - h / 2;
  const heat = clamp(props.heat ?? 0);
  const layer = (node: React.ReactNode, o = 1) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, opacity: o, transform: `translate(${(-left).toFixed(2)}px, ${(-top).toFixed(2)}px) scale(${props.zoom ?? 1})`, transformOrigin: `${props.cx}px ${props.cy}px` }}>{node}</div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: props.w, height: h, borderRadius: props.radius ?? props.w / 2, overflow: 'hidden', background: props.ground, transform: `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px)` }}>
      {layer(props.children)}
      {heat > 0.01 && (props.hot ? layer(props.hot, heat) : props.accent ? <div style={{ position: 'absolute', inset: 0, background: props.accent, mixBlendMode: 'color', opacity: heat }} /> : null)}
    </div>
  );
};

/** The full meter's flicker is stepped on threes over its span; single windows are continuous. */
export const declares = (p?: { row?: Partial<MeterRowOpts> & { until?: number; id?: string } }, film?: Partial<FilmCtx>): Declares => {
  const r = p?.row;
  if (!r || r.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const per = Math.round(f60x(r.flicker ?? METER.row.flicker60, fpsOf(film)));
  return { stepped: [{ from: r.at, to: r.until ?? r.at + Math.round(fpsOf(film)), ...(per === 3 ? { on: 3 as const } : per === 2 ? { on: 2 as const } : {}), id: r.id ?? 'meterRow' }], flashes: [], cameraBlur: [], seams: [] };
};

/** px at 1080p for a film (the meter's house sizes are written at 1080p). */
export const meterPx = (px: number, film?: Partial<FilmCtx>) => px * uOf(film);

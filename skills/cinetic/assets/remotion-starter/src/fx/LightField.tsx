import React from 'react';
import { Img } from 'remotion';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, fpsOf, useFilm } from '../lib/film';
import { LIGHT } from '../lib/look';
import type { Declares } from '../timeline';

/**
 * cinetic:light living light: a one-hue light field built from baked, dithered plates
 * (scripts/dither-gradient.py kinds `pool`, `floor`, `loop`, or any full-frame backdrop) moved by
 * transform and opacity only. Never an animated CSS gradient: 8-bit ramps band, and a moving gradient
 * re-rasterises every frame.
 *
 * Parts (any mix):
 *   plates  static full-frame base plates (a stage, a vignette), each at its own opacity
 *   floor   a glow over the bottom of the frame (house 25 % of the height) whose strength breathes on a
 *           seamless loop and rises into a reveal (glowRise: x2 over 0.9 s, peaking on the hit); a tall
 *           plate can also lift (move up) so the light climbs the frame, the way a rising source would
 *   pools   soft sprites wandering on closed loops (Lissajous paths with whole-number frequencies, so
 *           every pool repeats exactly after `period`), house speed 240 px/s at 1080p (8 px a frame at
 *           30 fps), radius 300-500 px
 *   bands   a seamless band plate (kind `loop`: it tiles horizontally) flowing at a constant speed,
 *           one tile width per period
 * Strength must be visible (K: lib/look.ts LIGHT): a lightness swing of 0.05-0.20 across the field at
 * chroma 0.13 or less, at the accent hue only. Bake the plates in those numbers (dither-gradient.py
 * --check verifies them); here, opacity and position are the only animated values.
 */

/** A rise of the light into a reveal: up over `dur`, a hold, then back over `fall` (frames; 0 = stays up). */
export type GlowRise = { at: number; gain?: number; dur?: number; hold?: number; fall?: number; rest?: number; ease?: Ease; fallEase?: Ease };
/** A seamless breath: strength x (1 + amp sin(2 pi (t / period) + phase)), period in seconds. */
export type Breathe = { period: number; amp: number; phase?: number; harmonics?: { k: number; amp: number; phase?: number }[] };

/** The floor light rising by translation (px up): the light source climbing, not a brightness change. */
export type FloorLift = {
  rises?: { at: number; px: number; dur?: number; hold?: number; fall?: number; rest?: number; ease?: Ease; fallEase?: Ease }[];
  wave?: { period: number; px: number; phase?: number; harmonics?: { k: number; px: number; phase?: number }[] }; // seamless, seconds
};

export type FloorLight = {
  plate: string; // baked floor plate URL (full width, its own height)
  height?: number; // the plate's height as a share of the frame height (house 0.25); it may be taller than what shows
  top?: number; // where its top edge rests, share of the frame height (house 1 - height: the plate sits on the bottom edge)
  strength?: number; // base opacity 0..1 (house 0.85)
  breathe?: Breathe; // opacity breath
  rises?: GlowRise[]; // opacity rises
  lift?: FloorLift; // the plate moving up and down (a rising floor glow reaches higher up the frame)
};

export type PoolLight = {
  plate: string; // baked pool sprite URL (square)
  size: number; // sprite edge in px at 1080p (house 2 x 400: radius 400)
  centre: [number, number]; // loop centre, px
  radius?: [number, number]; // loop radii, px (house from the speed: 240 px/s x period / 2 pi)
  period?: number; // seconds for one loop (house 3)
  freq?: [number, number]; // whole-number frequencies of x and y (house [1, 2]: a figure eight)
  phase?: number; // 0..1 of a loop
  opacity?: number; // house 1
  breathe?: Breathe;
};

export type BandLight = {
  plate: string; // baked seamless band URL (kind `loop`)
  width: number; // one tile, px
  height: number; // px
  y: number; // top, px
  period?: number; // seconds per tile width (house 2; a sweeping band into a cut runs about 256 px a frame at 30 fps)
  dir?: 1 | -1;
  opacity?: number;
};

export type LightFieldProps = {
  plates?: { src: string; opacity?: number }[];
  floor?: FloorLight;
  pools?: PoolLight[];
  bands?: BandLight[];
  glowRise?: GlowRise | GlowRise[]; // a rise of the whole field (floor, pools and bands together)
  seam?: { at: number; id?: string }; // a rise that carries a cut: declared as a `light` seam
};

export type LightFieldState = {
  gain: number; // the field-wide rise multiplier
  floor: { opacity: number; y: number; height: number } | null; // y = the plate's top edge, px; height = the plate's, px
  pools: { x: number; y: number; size: number; opacity: number }[]; // x, y = sprite centre
  bands: { offset: number; opacity: number }[]; // offset = translateX of the first tile, px (0 .. -width)
};

const TAU = Math.PI * 2;

/** A rise's shape at frame f: 0 before `at`, up to 1 over `dur`, a hold, then down to `rest` over `fall`. */
export const riseShape = (f: number, r: { at: number; dur?: number; hold?: number; fall?: number; rest?: number; ease?: Ease; fallEase?: Ease }, fps: number) => {
  const dur = r.dur ?? LIGHT.revealBrighten.dur * fps;
  const hold = r.hold ?? 0;
  const fall = r.fall ?? 0;
  const rest = r.rest ?? 0; // share of the rise kept after the fall (0 = all the way back)
  if (f <= r.at) return 0;
  const up = (r.ease ?? E.softOut)(clamp((f - r.at) / Math.max(1e-6, dur)));
  if (fall <= 0 || f <= r.at + dur + hold) return up;
  const down = (r.fallEase ?? E.softIn)(clamp((f - r.at - dur - hold) / fall));
  return 1 - (1 - rest) * down;
};

/** One rise at frame f, as an added gain (0 before; `gain - 1` at the top; back to `rest` after the fall). */
export const riseGain = (f: number, r: GlowRise, fps: number) => ((r.gain ?? LIGHT.revealBrighten.gain) - 1) * riseShape(f, r, fps);

/** The floor's lift at frame f, px up (rises plus a seamless wave). */
export const floorLift = (f: number, l: FloorLift | undefined, fps: number) => {
  if (!l) return 0;
  let v = (l.rises ?? []).reduce((s, r) => s + r.px * riseShape(f, r, fps), 0);
  if (l.wave) {
    const t = f / (l.wave.period * fps);
    v += l.wave.px * Math.sin(TAU * t + (l.wave.phase ?? 0) * TAU);
    for (const h of l.wave.harmonics ?? []) v += h.px * Math.sin(TAU * Math.round(h.k) * t + (h.phase ?? 0) * TAU);
  }
  return v;
};

/** A seamless breath factor at frame f (exactly periodic: f and f + period x fps give the same value). */
export const breathe = (f: number, b: Breathe | undefined, fps: number) => {
  if (!b) return 1;
  const t = f / (b.period * fps);
  let v = b.amp * Math.sin(TAU * t + (b.phase ?? 0) * TAU);
  for (const h of b.harmonics ?? []) v += h.amp * Math.sin(TAU * Math.round(h.k) * t + (h.phase ?? 0) * TAU);
  return 1 + v;
};

/** House loop radius for a pool: the radius whose loop runs at LIGHT.poolSpeedPxS (scaled to the frame). */
export const poolRadius = (period: number, scale = 1) => (LIGHT.poolSpeedPxS * scale * period) / TAU;

/** The light field at frame f: every plate's position and opacity. Pure, closed form, loops exactly. */
export const lightFieldState = (frame: number, p: LightFieldProps, film?: Partial<FilmCtx>): LightFieldState => {
  const fps = fpsOf(film);
  const H = film?.height ?? 1080;
  const scale = H / 1080;
  const rises = p.glowRise ? (Array.isArray(p.glowRise) ? p.glowRise : [p.glowRise]) : [];
  const gain = 1 + rises.reduce((s, r) => s + riseGain(frame, r, fps), 0);
  let floor: LightFieldState['floor'] = null;
  if (p.floor) {
    const fl = p.floor;
    const own = 1 + (fl.rises ?? []).reduce((s, r) => s + riseGain(frame, r, fps), 0);
    const op = (fl.strength ?? 0.85) * breathe(frame, fl.breathe, fps) * own * gain;
    const hgt = H * (fl.height ?? 0.25);
    floor = { opacity: clamp(op), y: H * (fl.top ?? 1 - (fl.height ?? 0.25)) - floorLift(frame, fl.lift, fps) * scale, height: hgt };
  }
  const pools = (p.pools ?? []).map((pl) => {
    const period = pl.period ?? 3;
    const [fx, fy] = (pl.freq ?? [1, 2]).map((v) => Math.max(1, Math.round(v)));
    const r = pl.radius ?? [poolRadius(period, scale), poolRadius(period, scale) * 0.5];
    const t = frame / (period * fps) + (pl.phase ?? 0);
    return {
      x: pl.centre[0] + r[0] * Math.cos(TAU * fx * t),
      y: pl.centre[1] + r[1] * Math.sin(TAU * fy * t),
      size: pl.size,
      opacity: clamp((pl.opacity ?? 1) * breathe(frame, pl.breathe, fps) * gain),
    };
  });
  const bands = (p.bands ?? []).map((b) => {
    const period = b.period ?? 2; // seconds per tile width (house: a liquid band cycles every 2 s)
    const t = (frame / (period * fps)) % 1;
    const off = (b.dir ?? 1) === 1 ? -t * b.width : -(1 - t) * b.width;
    return { offset: off, opacity: clamp((b.opacity ?? 1) * gain) };
  });
  return { gain, floor, pools, bands };
};

/** Peak frames of every rise (where the hit or the cut goes) and the field's loop period in frames. */
export const lightFieldFrames = (p: LightFieldProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const all = [...(p.glowRise ? (Array.isArray(p.glowRise) ? p.glowRise : [p.glowRise]) : []), ...(p.floor?.rises ?? [])];
  return {
    peaks: all.map((r) => Math.round(r.at + (r.dur ?? LIGHT.revealBrighten.dur * fps))),
    periods: [...(p.pools ?? []).map((q) => (q.period ?? 3) * fps), ...(p.floor?.breathe ? [p.floor.breathe.period * fps] : [])],
  };
};

/** Pool speed at frame f (px per frame), for the drift gate (house 6-10 px a frame at 30 fps). */
export const poolSpeed = (frame: number, p: LightFieldProps, i: number, film?: Partial<FilmCtx>) => {
  const a = lightFieldState(frame, p, film).pools[i];
  const b = lightFieldState(frame + 1, p, film).pools[i];
  return Math.hypot(b.x - a.x, b.y - a.y);
};

/**
 * Draws the field: base plates, bands, pools, then the floor, each an <Img> moved by transform and
 * faded by opacity. Put it under the scene; `frame` is the local frame.
 */
export const LightField: React.FC<LightFieldProps & { frame: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const { width: W, height: H } = film;
  const s = lightFieldState(props.frame, props, film);
  const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0' };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', ...props.style }}>
      {(props.plates ?? []).map((pl, i) => (
        <Img key={`p${i}`} src={pl.src} style={{ ...abs, width: W, height: H, opacity: clamp((pl.opacity ?? 1) * s.gain) }} />
      ))}
      {(props.bands ?? []).map((b, i) => (
        <div key={`b${i}`} style={{ ...abs, width: b.width * 2, height: b.height, opacity: s.bands[i].opacity, transform: `translate(${s.bands[i].offset}px, ${b.y}px)` }}>
          <Img src={b.plate} style={{ ...abs, width: b.width, height: b.height }} />
          <Img src={b.plate} style={{ ...abs, width: b.width, height: b.height, transform: `translateX(${b.width}px)` }} />
        </div>
      ))}
      {(props.pools ?? []).map((pl, i) => {
        const q = s.pools[i];
        return <Img key={`o${i}`} src={pl.plate} style={{ ...abs, width: pl.size, height: pl.size, opacity: q.opacity, transform: `translate(${q.x - pl.size / 2}px, ${q.y - pl.size / 2}px)` }} />;
      })}
      {props.floor && s.floor && (
        <Img src={props.floor.plate} style={{ ...abs, width: W, height: s.floor.height, opacity: s.floor.opacity, transform: `translateY(${s.floor.y}px)` }} />
      )}
    </div>
  );
};

/** A rise that carries a cut is a `light` seam; the field itself is continuous and declares nothing else. */
export const declares = (p?: Partial<LightFieldProps>, film?: Partial<FilmCtx>): Declares => {
  void film;
  if (!p?.seam) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.seam.at, kind: 'light', id: p.seam.id ?? 'lightField' }] };
};

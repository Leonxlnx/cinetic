// cinetic:light exposure veil and light sweep: frame-wide light events in one hue, never a glow on an element
import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Exposure bloom: the whole frame over-exposes into a light event and the next scene settles out of
 * it. Two physical parts, both frame-wide: the content's brightness rises (highlights blow out first)
 * and a one-hue screen layer (a veil, white or a pale tint of the accent) lifts every pixel toward the
 * light. The outgoing scene hands over to the incoming one while the frame is brightest (a cut, or a
 * dissolve of at most a few frames hidden under the bloom), and the incoming scene settles back from
 * an overshoot of its own brightness. Never a glow or halo around one element.
 *
 * House numbers (60 fps): rise 40 f on E.buildIn to the peak, veil 0.82 at the peak, brightness x1.5,
 * the swap 10 f before the peak with a 6 f dissolve, settle 26 f nearly linear. Peak on a hit.
 */
export type ExposureProps = {
  at: number; // the brightest frame
  up?: number; // frames of the rise (house 40 f at 60 fps)
  down?: number; // frames of the settle (house 26 f)
  peak?: number; // veil opacity at the peak, 0..1 (house 0.82)
  upEase?: Ease; // the rise (house E.buildIn: it keeps accelerating into the light)
  downEase?: Ease; // the settle (house E.linear: light decays linearly)
  brightness?: number; // content brightness at the peak (house 1.5; 1 = veil only)
  /** When the incoming scene takes over: from frame `at` (house 10 f at 60 fps before the peak), dissolved over `frames` (0 = a cut inside the light; keep it <= 8 f at 60 fps). */
  swap?: { at?: number; frames?: number };
  hue?: string; // the veil's colour (house white); one hue only
  /** A short charge before the bloom: the veil pulses to `gain` around frame `at` (rise / fall frames). */
  charge?: { at: number; gain: number; rise?: number; fall?: number };
  id?: string;
};

export type ExposureState = {
  veil: number; // 0..1 opacity of the screen layer
  brightness: number; // content brightness multiplier
  mix: number; // 0 = the outgoing scene, 1 = the incoming one
  phase: 'before' | 'rise' | 'settle' | 'after';
};

const HOUSE = { up60: 40, down60: 26, peak: 0.82, brightness: 1.5, swapLead60: 10, swapDissolve60: 6 } as const;

/** The frames of an exposure: rise start, swap start and end, peak, settle end. */
export const exposureFrames = (p: ExposureProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const up = Math.max(1, p.up ?? f60x(HOUSE.up60, fps));
  const down = Math.max(1, p.down ?? f60x(HOUSE.down60, fps));
  const swapAt = p.swap?.at ?? Math.round(p.at - f60x(HOUSE.swapLead60, fps));
  const swapFrames = Math.max(0, p.swap?.frames ?? f60x(HOUSE.swapDissolve60, fps));
  return { start: p.at - up, swapAt, swapEnd: swapAt + swapFrames, at: p.at, end: p.at + down };
};

/** The exposure at frame f: veil, brightness, scene mix and phase. Pure, closed form. */
export const exposureState = (f: number, p: ExposureProps, film?: Partial<FilmCtx>): ExposureState => {
  const fr = exposureFrames(p, film);
  const peak = clamp(p.peak ?? HOUSE.peak);
  const bMax = p.brightness ?? HOUSE.brightness;
  let k: number; // 0..1 of the light event
  let phase: ExposureState['phase'];
  if (f <= fr.start) {
    k = 0;
    phase = 'before';
  } else if (f <= fr.at) {
    k = (p.upEase ?? E.buildIn)(clamp((f - fr.start) / (fr.at - fr.start)));
    phase = 'rise';
  } else if (f < fr.end) {
    k = 1 - (p.downEase ?? E.linear)(clamp((f - fr.at) / (fr.end - fr.at)));
    phase = 'settle';
  } else {
    k = 0;
    phase = 'after';
  }
  let veil = peak * k;
  if (p.charge) {
    const fps = fpsOf(film);
    const rise = Math.max(0.5, p.charge.rise ?? f60x(4, fps));
    const fall = Math.max(0.5, p.charge.fall ?? f60x(14, fps));
    const d = f - p.charge.at;
    const c = d < -rise || d > fall ? 0 : d <= 0 ? E.buildIn(1 + d / rise) : 1 - E.linear(d / fall);
    veil = clamp(veil + (1 - veil) * p.charge.gain * c);
  }
  const m = fr.swapEnd > fr.swapAt ? clamp((f - fr.swapAt) / (fr.swapEnd - fr.swapAt)) : f >= fr.swapAt ? 1 : 0;
  return { veil, brightness: mix(1, bMax, k), mix: m, phase };
};

/**
 * Renders an exposure: `a` (outgoing) until the swap, `b` (incoming) after it (dissolved over the
 * swap's frames), both under one brightness filter, and the veil on top in screen blend. `frame` is
 * the local frame. The brightness filter is one static value per frame on one layer.
 */
export const Exposure: React.FC<ExposureProps & { frame: number; a: React.ReactNode; b: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = exposureState(props.frame, props, film);
  const hue = props.hue ?? '#FFFFFF';
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      <div style={{ position: 'absolute', inset: 0, filter: Math.abs(s.brightness - 1) > 1e-3 ? `brightness(${s.brightness.toFixed(4)})` : undefined }}>
        {s.mix < 1 && <div style={{ position: 'absolute', inset: 0 }}>{props.a}</div>}
        {s.mix > 0 && <div style={{ position: 'absolute', inset: 0, opacity: s.mix }}>{props.b}</div>}
      </div>
      {s.veil > 1e-4 && <div style={{ position: 'absolute', inset: 0, background: hue, opacity: s.veil, mixBlendMode: 'screen' }} />}
    </div>
  );
};

/**
 * Light sweep: a soft band of light crosses the frame (a static one-hue gradient band moved by
 * transform, screen blend), accelerating like a beam swung past the lens. House numbers (60 fps):
 * 44 f on E.launchIn across the frame plus the band's width, band 0.45 of the frame width, gain 0.55.
 */
export type LightSweepProps = {
  start: number;
  frames?: number; // house 44 f at 60 fps
  from?: number; // band centre at start, px (default: one band width left of the frame)
  to?: number; // band centre at the end (default: one band width right of it)
  band?: number; // band width, px (house 0.45 x frame width)
  angle?: number; // deg from vertical (house 12)
  gain?: number; // band opacity at its core (house 0.55)
  ease?: Ease; // house E.launchIn (accelerating: 'expo-in')
  hue?: string; // house white
  id?: string;
};

/** The sweep at frame f: band centre x, its width, opacity, and the share of the run done. */
export const lightSweepState = (f: number, p: LightSweepProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const W = sizeOf(film).width;
  const band = p.band ?? 0.45 * W;
  const frames = Math.max(1, p.frames ?? f60x(44, fps));
  const from = p.from ?? -band;
  const to = p.to ?? W + band;
  const t = clamp((f - p.start) / frames);
  const x = mix(from, to, (p.ease ?? E.launchIn)(t));
  const on = f >= p.start && f <= p.start + frames;
  return { x, band, gain: on ? (p.gain ?? 0.55) : 0, t };
};

export const LightSweep: React.FC<LightSweepProps & { frame: number; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = lightSweepState(props.frame, props, film);
  if (s.gain <= 0) return null;
  const hue = props.hue ?? '#FFFFFF';
  const H = film.height;
  const tall = H * 1.6;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'screen', ...props.style }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: s.band,
          height: tall,
          opacity: s.gain,
          background: `linear-gradient(90deg, transparent 0%, ${hue} 50%, transparent 100%)`,
          transform: `translate(${(s.x - s.band / 2).toFixed(3)}px, ${(-(tall - H) / 2).toFixed(3)}px) rotate(${props.angle ?? 12}deg)`,
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  );
};

/**
 * What an exposure declares: a `light` seam on its swap (the scenes change inside the light). A light
 * event that reaches full white for one or two frames is also a designed flash.
 */
export const declares = (p?: Partial<ExposureProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = exposureFrames(p as ExposureProps, film);
  const id = p.id ?? 'exposure';
  const flash = (p.peak ?? HOUSE.peak) >= 0.95 && fr.end - fr.start <= 3;
  return {
    stepped: [],
    flashes: flash ? [{ f: p.at, frames: 1, id }] : [],
    cameraBlur: [],
    seams: [{ at: fr.swapAt, kind: 'light', id }],
  };
};

import React from 'react';
import { clamp, E, type Ease } from '../lib/anim';
import { defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Snap zoom: a scale change that happens in ONE frame. A short build eases into it, the jump frame
 * carries most of the change (cut it on a hit), and the landing settles: either an arrival curve or
 * a damped settle that carries the jump's speed past the target and back. The jump frame can go
 * soft (a defocus that clears over a few frames) and lift the ground's brightness for that frame
 * only. Scale is in log space throughout, so a snap in and a snap out of the same ratio mirror.
 *
 * House numbers (60 fps): build 16 f covering 30 % of the change, jump on `at`, landing 22 f on
 * E.snapOut, defocus 4 px on the jump frame clearing in 10 f, no flash. A jump of x1.1-2.2 in or
 * x0.3-0.6 out reads as a snap; less reads as a glitch.
 */
export type SnapZoomProps = {
  at: number; // the jump frame: the one frame that carries most of the change
  from?: number; // scale before the move (default 1)
  to: number; // scale it settles at (> 1 snaps in, < 1 snaps out)
  /** The build into the jump: `frames` before `at`, reaching `share` of the log change on the frame before the jump. */
  pre?: { frames?: number; share?: number; a?: number; p?: number };
  /** Where the jump frame lands, as a share of the log change: 1 = on the target, > 1 past it (the landing comes back). */
  land?: number;
  /**
   * The landing after the jump. Ease form (default): from the landed value to the target on `ease` over
   * `frames`. Settle form (give `zeta`): a damped settle from the landed value that keeps `carry` x the
   * jump's speed for a moment (0.04 = it travels on 4 % of the jump step), back to the target, 2 % in `frames`.
   */
  post?: { frames?: number; ease?: Ease; zeta?: number; carry?: number };
  /** Defocus around the jump: `sigma` px at 1080p on the jump frame, `lead` frames already soft before it (at `leadShare` of sigma), clearing over `clear` frames on `ease`. */
  defocus?: { sigma?: number; lead?: number; leadShare?: number; clear?: number; ease?: Ease } | false;
  /**
   * Brightness lift peaking on the jump frame: a white veil at opacity `gain` (0.45 lifts every pixel 45 %
   * of its way to white). With rise = fall = 0 (default) it is the jump frame only (a declared flash);
   * `rise` frames before and `fall` frames after make it a light swell around the snap instead.
   */
  flash?: { gain?: number; rise?: number; fall?: number; ease?: Ease } | false; // ease: the fall's curve (default E.linear: light decays linear)
  origin?: { x: number; y: number }; // frame px the zoom is centred on (default the frame centre)
  children?: React.ReactNode;
  style?: React.CSSProperties;
  id?: string; // name for the declarations (default 'snapZoom')
};

export type SnapZoomState = { k: number; lnk: number; sigma: number; flash: number; phase: 'before' | 'pre' | 'jump' | 'post' | 'after' };

const HOUSE = { pre60: 16, preShare: 0.3, post60: 22, sigma: 4, clear60: 10 } as const;

/** Damped settle of an offset d0 with speed v0 (units per frame) to 0, 2 % in `frames`; zeta 1 = critical. Closed form. */
const settle = (t: number, d0: number, v0: number, zeta: number, frames: number) => {
  if (t <= 0) return d0;
  const z = Math.max(0.05, zeta);
  // natural frequency for a 2 % settle in `frames`: about 4 / (z w) for z < 1, 5.8 / w at z = 1
  const w = z < 1 ? 4 / (z * Math.max(1, frames)) : 5.8 / Math.max(1, frames);
  if (Math.abs(z - 1) < 1e-6) return Math.exp(-w * t) * (d0 + (v0 + w * d0) * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return Math.exp(-z * w * t) * (d0 * Math.cos(wd * t) + ((v0 + z * w * d0) / wd) * Math.sin(wd * t));
  }
  const r = Math.sqrt(z * z - 1);
  const r1 = -w * (z - r);
  const r2 = -w * (z + r);
  const c2 = (v0 - r1 * d0) / (r2 - r1);
  return (d0 - c2) * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
};

/** The frames a snap zoom spans: its build start, the jump, the landing's end. */
export const snapZoomFrames = (p: SnapZoomProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const pre = Math.max(1, Math.round(p.pre?.frames ?? f60x(HOUSE.pre60, fps)));
  const post = Math.max(1, Math.round(p.post?.frames ?? f60x(HOUSE.post60, fps)));
  return { start: p.at - pre, at: p.at, end: p.at + post };
};

/**
 * The animated numbers of a snap zoom at frame f: scale k (and its log), the defocus sigma (px at
 * 1080p), the flash (0..1) and the phase. Pure, closed form: any frame, any order.
 */
export const snapZoomState = (f: number, p: SnapZoomProps, film?: Partial<FilmCtx>): SnapZoomState => {
  const fps = fpsOf(film);
  const from = Math.log(Math.max(1e-6, p.from ?? 1));
  const L = Math.log(Math.max(1e-6, p.to)) - from; // the whole log change
  const preF = Math.max(1, p.pre?.frames ?? f60x(HOUSE.pre60, fps));
  const share = p.pre?.share ?? HOUSE.preShare;
  const land = p.land ?? 1;
  const postF = Math.max(1, p.post?.frames ?? f60x(HOUSE.post60, fps));
  // the build: steps growing into the jump like lib/handoff launch(): step k frames before the frame
  // before the jump is exp(-a * s^p) of the last one; normalised to reach share * L on at - 1
  const a = p.pre?.a ?? Math.log(100) / Math.max(1e-6, (preF * 60) / fps) ** (p.pre?.p ?? 0.76);
  const pp = p.pre?.p ?? 0.76;
  const n = Math.max(1, Math.round(preF));
  const steps = Array.from({ length: n }, (_, k) => Math.exp(-a * ((k * 60) / fps) ** pp)); // k = 0: the step into at - 1
  const total = steps.reduce((x, v) => x + v, 0);
  const preAt = (g: number) => {
    const back = clamp(p.at - 1 - g, 0, n); // frames before at - 1
    const m = Math.floor(back);
    let gone = 0;
    for (let k = 0; k < Math.min(m, n); k++) gone += steps[k];
    if (m < n) gone += (back - m) * steps[m];
    return share * L * (1 - gone / total);
  };
  const jumpStep = land * L - share * L;
  let lnk: number;
  let phase: SnapZoomState['phase'];
  if (f <= p.at - 1) {
    lnk = preAt(f);
    phase = f < p.at - 1 - n ? 'before' : 'pre';
  } else if (f < p.at) {
    lnk = share * L + (f - (p.at - 1)) * jumpStep; // inside the jump frame (sub-frames)
    phase = 'jump';
  } else {
    const t = f - p.at;
    if (p.post?.zeta !== undefined) {
      const d = settle(t, (land - 1) * L, (p.post.carry ?? 0) * jumpStep, p.post.zeta, postF);
      lnk = L + d;
    } else {
      lnk = land * L + (1 - land) * L * (p.post?.ease ?? E.snapOut)(clamp(t / postF));
    }
    phase = t === 0 ? 'jump' : t >= postF ? 'after' : 'post';
  }
  // defocus: soft from `lead` frames before the jump, peak on it, clearing after
  let sigma = 0;
  if (p.defocus !== false) {
    const d = p.defocus ?? {};
    const peak = d.sigma ?? HOUSE.sigma;
    const lead = Math.max(0, d.lead ?? 0);
    const clear = Math.max(1, d.clear ?? f60x(HOUSE.clear60, fps));
    if (f >= p.at - lead && f < p.at) sigma = peak * (d.leadShare ?? 0.5) * (lead > 0 ? clamp((f - (p.at - lead - 1)) / lead) : 1);
    else if (f >= p.at) sigma = peak * (1 - (d.ease ?? E.glideOut)(clamp((f - p.at) / clear)));
  }
  let flash = 0;
  if (p.flash) {
    const g = p.flash.gain ?? 0.45;
    const rise = Math.max(0, p.flash.rise ?? 0);
    const fall = Math.max(0, p.flash.fall ?? 0);
    const fr = Math.round(f);
    if (fr === p.at) flash = g;
    else if (fr < p.at && fr >= p.at - rise) flash = g * E.buildIn((fr - (p.at - rise - 1)) / (rise + 1));
    else if (fr > p.at && fr < p.at + fall) flash = g * (1 - (p.flash.ease ?? E.linear)((fr - p.at) / fall));
  }
  return { k: Math.exp(from + lnk), lnk: from + lnk, sigma, flash, phase };
};

/**
 * Defocus pulse: the whole frame goes soft and comes back (`frames` from first blur to sharp again,
 * peak `peakSigma` px at 1080p in the middle on a smooth bump), and the camera's scale jumps by
 * `scaleJump` while it cannot be seen, on the peak frame. Hide a reframe, a cut, a size change in
 * it. Returns sigma (px at 1080p) and the scale multiplier for frame f; `.peak` is the peak frame.
 * House numbers: 18 f at 60 fps, 20 px, x1.24.
 */
export const defocusPulse = (o: { at: number; frames?: number; peakSigma?: number; scaleJump?: number; peakAt?: number; shape?: Ease; fps?: number }) => {
  const fps = o.fps ?? fpsOf();
  const frames = Math.max(2, o.frames ?? f60x(18, fps));
  const peakSigma = o.peakSigma ?? 20;
  const pk = clamp(o.peakAt ?? 0.5, 0.05, 0.95);
  const shape = o.shape ?? E.stdInOut;
  const peak = Math.round(o.at + pk * frames);
  const fn = (f: number) => {
    const t = (f - o.at) / frames;
    const b = t <= 0 || t >= 1 ? 0 : t < pk ? shape(t / pk) : shape((1 - t) / (1 - pk));
    return { sigma: peakSigma * b, k: Math.round(f) >= peak ? (o.scaleJump ?? 1.24) : 1 };
  };
  return Object.assign(fn, { peak, end: o.at + frames });
};

/**
 * Renders a snap zoom: the content scaled about `origin` in one transform, the defocus as at most two
 * stacked copies at fixed blur levels (lib/defocus: no animated blur radius), the flash as a white
 * veil on the jump frame. `frame` is the local frame (useCurrentFrame() of the caller).
 */
export const SnapZoom: React.FC<SnapZoomProps & { frame: number }> = (props) => {
  const film = useFilm();
  const { width, height } = film;
  const s = snapZoomState(props.frame, props, film);
  const o = props.origin ?? { x: width / 2, y: height / 2 };
  const u = uOf(film);
  const copies = defocusMix(s.sigma * u);
  const layer = (level: number, opacity: number, key: number) => (
    <div key={key} style={{ position: 'absolute', inset: 0, opacity, filter: level > 0 ? `blur(${level}px)` : undefined }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, transformOrigin: `${o.x}px ${o.y}px`, transform: `scale(${s.k})` }}>{props.children}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {copies.map((c, i) => layer(c.level, i === 0 ? 1 : c.weight, i))}
      {s.flash > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(255, 255, 255, ${clamp(s.flash)})` }} />}
    </div>
  );
};

/**
 * What a snap zoom declares: the jump frame is a designed step (one sample, no shutter blur across
 * it), the flash frame a designed flash, and the jump a `snapZoom` seam that carries scale.
 */
export const declares = (p?: Partial<SnapZoomProps>, _film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const id = p.id ?? 'snapZoom';
  return {
    stepped: [{ from: p.at, to: p.at + 1, id }],
    flashes: p.flash && !(p.flash.rise ?? 0) && !(p.flash.fall ?? 0) ? [{ f: p.at, frames: 1, id }] : [],
    cameraBlur: [],
    seams: [{ at: p.at, kind: 'snapZoom', carry: 'scale', dir: (p.to ?? 1) >= (p.from ?? 1) ? 1 : -1, id }],
  };
};

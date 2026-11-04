import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, E } from '../lib/anim';
import { type FilmCtx, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { carry, launch } from '../lib/handoff';
import type { Declares, Seam as SeamDecl, SeamKind } from '../timeline';
import { Defocus, DirBlur } from './Defocus';

// Seam: one helper for the seams that make a film flow. Seven recipes, each a pure state function of the frame
// (seamState: closed form, fractional frames, any order) and one component that draws both shots and a ground that
// never cuts. Every number is written in 60 fps frames (f@60) and px at 1080p, and converted to the film's rate and size.
//
//   exitEnter      the ground keeps moving; the outgoing elements accelerate away (16 px, 15 f, blur 0 -> 11 px, fading),
//                  0-6 f of empty ground, the incoming elements rise 20 px into place from a blur (20 f, expo-out)
//   textSwap       the slot stays (centre and cap height): a blur swap (old line out in 8 f, new in from 12 px blur in
//                  13 f, 3 f overlap), a push-up (the new line one pitch below pushes the old one up, which stays at 40 %)
//                  or an ink-in (the new word appears pale at the same centre and inks to its colour in 16 f)
//   matchCut       one anchor holds its screen point across a one-frame cut: the outgoing shot pushes in about it on a
//                  build, the incoming shot opens one step on and goes on growing into its rest, decaying x0.87 a frame
//   velocityCut    the exit's speed builds x1.25 a frame into the cut (the last 8-12 f carry the move), the next shot
//                  enters at 0.7 of it the same way and decays x0.915 a frame (about 20 f) to a creep; smeared above 9 px/f.
//                  With `travel` it is a whip that hides the cut between two full-frame pictures: the exit travels that
//                  far (0.75 of the frame) over its last 24 f on t^2.2, mostly gone and smeared on the cut frame
//   blurThrough    out 14 f: blur 0 -> 32 px (quad-in) while shrinking away; cut at the peak; in 13 f from 32 px, still
//                  moving at 0.65 of the outgoing speed and settling
//   zoomThrough    an exponential push (x1.07 a frame, eased on over 8 f) into the element that becomes the next frame;
//                  the next shot keeps scaling at a third of the last step and settles in about 28 f
//   sharedElement  one element belongs to both scenes and is never cut: the old surroundings leave in 12 f, the element
//                  moves to its new box in 30 f (ease in-out), the new surroundings arrive in 12 f
//
// `at` is the incoming shot's first frame (the act line, or the cut): the outgoing shot shows before it, the incoming
// shot from it. seamDeclares() writes the seam for the timeline's SEAMS (its id names the recipe: 'exitEnter:line-2';
// the checks count recipes from it). references/transitions.md has the recipes and when to use each.

export type SeamRecipe = 'exitEnter' | 'textSwap' | 'matchCut' | 'velocityCut' | 'blurThrough' | 'zoomThrough' | 'sharedElement';
export type SeamDir = 'left' | 'right' | 'up' | 'down';

/** House numbers: f@60 and px at 1080p. */
export const SEAM = {
  exitEnter: { exit: 15, gap: 3, enter: 20, travel: 16, rise: 20, blur: 11 },
  textSwap: { out: 8, overlap: 3, in: 13, blur: 12, push: 18, pitch: 120, rest: 0.4, ink: 16 },
  matchCut: { build: 10, push: 0.06, decay: 0.87 },
  velocityCut: { v: 48, build: 1.25, ratio: 0.7, decay: 0.915, residual: 0.5, home: 24, smear: 9, whip: 24, power: 2.2 },
  blurThrough: { out: 14, in: 13, blur: 32, shrink: 0.04, keep: 0.65, decay: 0.88 },
  zoomThrough: { rate: 1.07, push: 22, ramp: 8, carry: 1 / 3, decay: 0.85 },
  sharedElement: { out: 12, in: 12, move: 30, blur: 8 },
} as const;

export type SeamBox = { x: number; y: number; w: number; h: number };

export type SeamOpts = {
  recipe: SeamRecipe;
  at: number; // the incoming shot's first frame
  dir?: SeamDir; // the direction of travel (exitEnter, velocityCut; house 'up' and 'left')
  variant?: 'blur' | 'push' | 'ink'; // textSwap (house 'blur')
  pitch?: number; // textSwap push: the line pitch, px at 1080p (house 120)
  v?: number; // velocityCut: the speed on the cut frame, px per f@60 at 1080p (house 48)
  /**
   * velocityCut as a whip that hides its cut: the outgoing shot travels `travel` px (1080p) along its axis over the last
   * SEAM.velocityCut.whip f@60 before the cut on an accelerating curve (t^power), so on the cut frame it is mostly out of
   * frame and smeared at its full speed (0.75 of a 1920 frame at 30 fps: about 260 px a frame, a 38 px smear); its cut
   * speed is that curve's last step and the incoming shot opens at `ratio` of it. Without it the house launch runs
   * (x1.25 a frame over 8-12 f@60 into 48 px/f@60: about 270 px of travel at 30 fps, too little to hide a cut between two
   * full-frame pictures).
   */
  travel?: number;
  /**
   * blurThrough between two pictures that differ (a white card into a dark mark): the blur at the cut (px at 1080p,
   * house 32) and how far both shots dim into it (the opacity on the cut frame, house 1: none). A 48 px peak with a dip to
   * 0.55 turns the cut into light passing, never a frame where one sharp-edged picture swaps for another.
   */
  peak?: number;
  dim?: number;
  anchor?: { x: number; y: number }; // matchCut, zoomThrough, blurThrough: the shared point, film px (house: the frame centre)
  fromBox?: SeamBox; // sharedElement: the element's box in the outgoing layout (film px)
  toBox?: SeamBox; // ... and in the incoming one
  id?: string;
};

/** One shot's state: offset (px at 1080p), scale about the anchor, opacity, blur (px at 1080p), smear (the signed step
 * along the travel, px per film frame at 1080p, for a directional blur), ink (0 pale -> 1 its colour, textSwap ink) and
 * dim (a brightness multiplier, 1 or unset: none): a light card leaving a dark world darkens into it, never a translucent
 * ghost with the world showing through it. */
export type SeamLayer = { show: boolean; x: number; y: number; scale: number; opacity: number; blur: number; smear: number; ink: number; dim?: number };
export type SeamState = { out: SeamLayer; in: SeamLayer; element: number; box?: SeamBox };

const VEC: Record<SeamDir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const rest = (show: boolean): SeamLayer => ({ show, x: 0, y: 0, scale: 1, opacity: 1, blur: 0, smear: 0, ink: 1 });

/** The frames a seam spans, [start, end): plan the beat around them (the outgoing shot is busy from start, the incoming until end). */
export const seamSpan = (p: SeamOpts, film?: Partial<FilmCtx>): [number, number] => {
  const k = fpsOf(film) / 60;
  const s = {
    exitEnter: [-(SEAM.exitEnter.exit + SEAM.exitEnter.gap), SEAM.exitEnter.enter],
    textSwap: [-(SEAM.textSwap.out - SEAM.textSwap.overlap), p.variant === 'push' ? SEAM.textSwap.push : p.variant === 'ink' ? SEAM.textSwap.ink : SEAM.textSwap.in],
    matchCut: [-SEAM.matchCut.build, 20],
    velocityCut: [p.travel ? -SEAM.velocityCut.whip : -12, SEAM.velocityCut.home],
    blurThrough: [-SEAM.blurThrough.out, SEAM.blurThrough.in],
    zoomThrough: [-SEAM.zoomThrough.push, 28],
    sharedElement: [-SEAM.sharedElement.out, SEAM.sharedElement.move - SEAM.sharedElement.out],
  }[p.recipe];
  return [p.at + Math.floor(s[0] * k), p.at + Math.ceil(s[1] * k)];
};

// log-scale of an eased-on exponential push, tau f@60 into it: rate ramps from 0 to ln(rate) over `ramp` frames
const pushLog = (tau: number, rate: number, ramp: number) => {
  const r = Math.log(rate);
  if (tau <= 0) return 0;
  return tau <= ramp ? (r * tau * tau) / (2 * ramp) : r * (ramp / 2 + tau - ramp);
};

/** Both shots at frame f. Pure and closed form. */
export const seamState = (f: number, p: SeamOpts, film?: Partial<FilmCtx>): SeamState => {
  const fps = fpsOf(film);
  const k60 = 60 / fps; // f@60 per film frame
  const t = (f - p.at) * k60; // f@60 from the seam frame
  const [dx, dy] = VEC[p.dir ?? (p.recipe === 'velocityCut' ? 'left' : 'up')];
  const before = f < p.at;
  const out = rest(before);
  const inn = rest(!before);
  let element = before ? 0 : 1;
  let box: SeamBox | undefined;
  switch (p.recipe) {
    case 'exitEnter': {
      const H = SEAM.exitEnter;
      const u = clamp((t + H.exit + H.gap) / H.exit);
      const e = E.buildIn(u);
      Object.assign(out, { show: t < -H.gap, x: dx * H.travel * e, y: dy * H.travel * e, opacity: 1 - u, blur: H.blur * e });
      const w = clamp(t / H.enter);
      const g = E.snapOut(w);
      Object.assign(inn, { x: -dx * H.rise * (1 - g), y: -dy * H.rise * (1 - g), opacity: g, blur: H.blur * (1 - g) });
      break;
    }
    case 'textSwap': {
      const H = SEAM.textSwap;
      if (p.variant === 'push') {
        const P = p.pitch ?? H.pitch;
        const g = E.snapOut(clamp(t / H.push));
        Object.assign(out, { show: true, y: -P * g, opacity: 1 - (1 - H.rest) * g });
        Object.assign(inn, { y: P * (1 - g), opacity: g });
      } else if (p.variant === 'ink') {
        inn.ink = E.softOut(clamp(t / H.ink));
      } else {
        const u = clamp((t + H.out - H.overlap) / H.out);
        Object.assign(out, { show: u < 1, opacity: 1 - u * u, blur: H.blur * u * u });
        const g = E.snapOut(clamp(t / H.in));
        Object.assign(inn, { opacity: g, blur: H.blur * (1 - g) });
      }
      break;
    }
    case 'matchCut': {
      const H = SEAM.matchCut;
      const ln = (tt: number) => Math.log(1 + H.push) * E.launchIn(clamp((tt + H.build) / H.build));
      out.scale = Math.exp(ln(Math.min(t, 0)));
      // the incoming shot goes on growing at the outgoing step and settles into its rest: log-scale -k d^n / (1 - d),
      // so its first step (n = 0 -> 1) is k, the outgoing push's last step
      const step = ln(-k60) - ln(-2 * k60); // per film frame
      const d = H.decay ** k60;
      inn.scale = Math.exp((-step * d ** Math.max(0, f - p.at)) / (1 - d));
      break;
    }
    case 'velocityCut': {
      const H = SEAM.velocityCut;
      const cut = p.at - 1; // the outgoing shot's last (fastest) frame
      const sg = dx + dy; // +1 or -1 along the travel's axis
      let vCut: number; // px per film frame
      if (p.travel) {
        // the whip: o(t) = travel * ((t + T) / T)^power over the last T f@60, its step into the cut frame the cut speed
        const T = H.whip;
        const at60 = (g: number) => clamp(((g - cut) * k60 + T) / T);
        const o = p.travel * at60(f) ** H.power;
        const step = p.travel * (at60(f) ** H.power - at60(f - 1) ** H.power);
        vCut = p.travel * (1 - at60(cut - 1) ** H.power);
        Object.assign(out, { x: dx * o, y: dy * o, smear: step * k60 > H.smear && before ? sg * step : 0 });
      } else {
        vCut = (p.v ?? H.v) * k60;
        const lo = launch(f, cut, { vCut, ratio: H.build, fps });
        const total = -launch(cut - 4000, cut, { vCut, ratio: H.build, fps }).x; // the whole outgoing travel
        const o = lo.x + total;
        Object.assign(out, { x: dx * o, y: dy * o, smear: Math.abs(lo.v) * k60 > H.smear && before ? sg * lo.v : 0 });
      }
      const opts = { v0: H.ratio * vCut, decay: H.decay, fast: { share: 0, decay: 0.4 }, residual: H.residual, fps };
      const ci = carry(f, cut, opts);
      const home = carry(p.at + H.home / k60, cut, opts).x; // home `home` f@60 after the seam frame, creeping on after
      const i = ci.x - home;
      Object.assign(inn, { x: dx * i, y: dy * i, smear: Math.abs(ci.v) * k60 > H.smear && !before ? sg * ci.v : 0 });
      break;
    }
    case 'blurThrough': {
      const H = SEAM.blurThrough;
      const peak = p.peak ?? H.blur;
      const dim = clamp(p.dim ?? 1);
      const u = clamp((t + H.out) / H.out);
      out.blur = peak * u * u;
      out.scale = 1 - H.shrink * u * u;
      const g = E.snapOut(clamp(t / H.in));
      inn.blur = peak * (1 - g);
      if (dim < 1) {
        out.opacity = 1 - (1 - dim) * u * u;
        inn.opacity = 1 - (1 - dim) * (1 - g);
      }
      // still shrinking at `keep` of the outgoing speed, decaying to rest: scale 1 + A d^n
      const last = H.shrink * (1 - ((H.out - k60) / H.out) ** 2); // the outgoing last step (per film frame)
      const d = H.decay ** k60;
      inn.scale = 1 + ((H.keep * last) / (1 - d)) * d ** Math.max(0, f - p.at);
      break;
    }
    case 'zoomThrough': {
      const H = SEAM.zoomThrough;
      out.scale = Math.exp(pushLog(Math.min(t, 0) + H.push, H.rate, H.ramp));
      const k = Math.log(H.rate) * H.carry * k60; // a third of the last step, per film frame
      const d = H.decay ** k60;
      inn.scale = Math.exp((-k * d ** Math.max(0, f - p.at)) / (1 - d));
      break;
    }
    case 'sharedElement': {
      const H = SEAM.sharedElement;
      const u = clamp((t + H.out) / H.out);
      Object.assign(out, { opacity: 1 - u, blur: H.blur * u });
      const g = E.glideOut(clamp(t / H.in));
      Object.assign(inn, { opacity: g, blur: H.blur * (1 - g) });
      element = E.strongInOut(clamp((t + H.out) / H.move));
      if (p.fromBox && p.toBox) {
        const a = p.fromBox;
        const b = p.toBox;
        const lm = (x: number, y: number) => (x > 0 && y > 0 ? Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * element) : x + (y - x) * element);
        const w = lm(a.w, b.w);
        const h = lm(a.h, b.h);
        const cx = a.x + a.w / 2 + (b.x + b.w / 2 - a.x - a.w / 2) * element;
        const cy = a.y + a.h / 2 + (b.y + b.h / 2 - a.y - a.h / 2) * element;
        box = { x: cx - w / 2, y: cy - h / 2, w, h };
      }
      break;
    }
  }
  return { out, in: inn, element, box };
};

const KIND: Record<SeamRecipe, SeamKind> = {
  exitEnter: 'breath', textSwap: 'defocus', matchCut: 'morph', velocityCut: 'velocity', blurThrough: 'defocus', zoomThrough: 'zoomThrough', sharedElement: 'morph',
};

/**
 * The seam to list in the timeline's SEAMS (and fx declarations): its kind, what carries across, its direction and an
 * id that names the recipe ('velocityCut:statement'), with the cut speed (px per film frame at 1080p) and ratio for a
 * velocity cut. Spread it into SEAMS: `...seamDeclares(p).seams`.
 */
export const seamDeclares = (p?: Partial<SeamOpts>, film?: Partial<FilmCtx>): Declares => {
  if (!p || !p.recipe || p.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fps = fpsOf(film);
  const dir = p.dir ?? (p.recipe === 'velocityCut' ? 'left' : 'up');
  const axis = dir === 'left' || dir === 'right' ? 'x' : 'y';
  const sign: 1 | -1 = dir === 'left' || dir === 'up' ? -1 : 1;
  const carryOf: Record<SeamRecipe, SeamDecl['carry'] | undefined> = {
    exitEnter: undefined, textSwap: undefined, matchCut: 'scale', velocityCut: axis, blurThrough: 'scale', zoomThrough: 'scale', sharedElement: 'shape',
  };
  const s: SeamDecl & { v?: number; ratio?: number } = { at: p.at, kind: KIND[p.recipe], id: `${p.recipe}:${p.id ?? 'seam'}` };
  const c = carryOf[p.recipe];
  if (c) s.carry = c;
  if (p.recipe === 'velocityCut' || p.recipe === 'exitEnter') s.dir = sign;
  if (p.recipe === 'velocityCut') {
    const H = SEAM.velocityCut;
    // a whip's cut speed is its curve's last step (px per film frame), the house cut's v converted
    const whipCut = p.travel ? p.travel * (1 - (1 - 60 / fps / H.whip) ** H.power) : 0;
    s.v = Math.round((p.travel ? whipCut : ((p.v ?? H.v) * 60) / fps) * 100) / 100;
    s.ratio = SEAM.velocityCut.ratio;
  }
  const seams: SeamDecl[] = [s];
  return { stepped: [], flashes: [], cameraBlur: [], seams };
};
export const declares = seamDeclares;

type Content = React.ReactNode | ((s: SeamLayer) => React.ReactNode);

const Layer: React.FC<{ s: SeamLayer; origin: string; axis: 'x' | 'y'; children: React.ReactNode }> = ({ s, origin, axis, children }) => {
  const film = useFilm();
  const u = uOf(film);
  let body: React.ReactNode = children;
  if (s.smear) body = <DirBlur v={s.smear} axis={axis}>{body}</DirBlur>;
  if (s.blur >= 0.5) body = <Defocus sigma={s.blur}>{body}</Defocus>;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: s.opacity, transformOrigin: origin, transform: `translate3d(${(s.x * u).toFixed(3)}px, ${(s.y * u).toFixed(3)}px, 0) scale(${s.scale.toFixed(5)})` }}>
      {body}
    </div>
  );
};

/**
 * Draws a seam: `ground` full frame and never moved or cut (the paper, the field, its light), `from` (the outgoing
 * shot's elements, laid out at rest) before `at`, `to` (the incoming shot's) from `at`, each placed by seamState; and
 * for sharedElement, `element` (laid out at the size of `toBox`) moving from `fromBox` to `toBox`. `from` and `to` may
 * be functions of their layer state (textSwap ink: colour the word by s.ink). `frame` defaults to the current frame.
 */
export const Seam: React.FC<SeamOpts & { from?: Content; to?: Content; ground?: React.ReactNode; element?: React.ReactNode; frame?: number }> = (props) => {
  const film = useFilm();
  const now = useCurrentFrame();
  const f = props.frame ?? now;
  const s = seamState(f, props, film);
  const { width, height } = sizeOf(film);
  const origin = `${(props.anchor?.x ?? width / 2).toFixed(2)}px ${(props.anchor?.y ?? height / 2).toFixed(2)}px`;
  const axis = props.dir === 'up' || props.dir === 'down' ? 'y' : 'x';
  const draw = (c: Content | undefined, st: SeamLayer) => (typeof c === 'function' ? (c as (x: SeamLayer) => React.ReactNode)(st) : c);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {props.ground}
      {s.out.show && props.from !== undefined ? <Layer s={s.out} origin={origin} axis={axis}>{draw(props.from, s.out)}</Layer> : null}
      {s.in.show && props.to !== undefined ? <Layer s={s.in} origin={origin} axis={axis}>{draw(props.to, s.in)}</Layer> : null}
      {s.box && props.toBox && props.element ? (
        // laid out at its incoming size, placed and scaled by transform (never by left/top: no pixel stairs)
        <div style={{ position: 'absolute', left: 0, top: 0, width: props.toBox.w, height: props.toBox.h, transformOrigin: '0 0',
          transform: `translate3d(${s.box.x.toFixed(3)}px, ${s.box.y.toFixed(3)}px, 0) scale(${(s.box.w / props.toBox.w).toFixed(5)}, ${(s.box.h / props.toBox.h).toFixed(5)})` }}>
          {props.element}
        </div>
      ) : null}
    </div>
  );
};

// The house motion system. Acts take every curve, spring and envelope from here, so the film has
// one motion character; scripts/lint-film.mjs fails raw beziers and inline spring configs anywhere
// else. The numbers are house defaults with normal ranges, not dogma: retune a token here and the
// whole film follows. HyperFrames carries the same numbers in motion.js (scripts/test/mirror.test.mjs
// keeps them equal; scripts/test/tokens.test.mjs pins the shapes).
//
// Vocabulary by role. Every easing token carries its `family`:
//   arrive      peak speed on the first frame, a long settle: entrances, inserts, landings
//   reposition  an S: moves inside a shot (cards, camera reframes, whips)
//   leave       ends at speed: exits, ideally cut on their last frame
//   linear      colour lerps and true live rates only (a clock, a real-time bar, a counter, an ambient drift): never a move
// enter()/leave()/move() refuse a curve of the wrong family at compile time.
import { Easing, interpolate, spring, SpringConfig } from 'remotion';
import { PACE_NAME } from '../timeline';
import { fpsOf } from './film';
import { PACE, type Pace } from './pace';
import { record } from './registry';

export { PACE, holdFor, revealFor, wordCount } from './pace';
export type { Pace, PaceName } from './pace';

export type Ease = (t: number) => number;
/** The role of a curve. */
export type Family = 'arrive' | 'reposition' | 'leave' | 'linear';
/** A named curve: the function plus its family, its name, and (1.1 names only) the token that replaces it. */
export type Token<F extends Family = Family> = Ease & { readonly family: F; readonly token: string; readonly deprecated?: string };

/** Name a curve and give it a family (the tests use this; acts use the tokens below). */
export const tagEase = <F extends Family>(fn: Ease, family: F, token = '', deprecated?: string): Token<F> =>
  Object.assign((t: number) => fn(t), deprecated ? { family, token, deprecated } : { family, token }) as Token<F>;

const bz = (x1: number, y1: number, x2: number, y2: number): Ease => Easing.bezier(x1, y1, x2, y2);

/**
 * True exponential ease-out, normalised to land exactly on 1: progress (1 - e^(-k t)) / (1 - e^(-k)).
 * Its time constant is 1/k of the move. With k = 6 it is half-way at 12 % of the time and 90 % home
 * at 38 %: a quick glide that comes to rest on its own (the 1.1 line re-centre). k = 12 is the jump.
 */
export const expOut = (k: number): Ease => {
  const n = 1 - Math.exp(-k);
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.exp(-k * t)) / n);
};
/** Exponential ease-in: (e^(k t) - 1) / (e^k - 1). Its speed grows by e^(k / frames) every frame and ends at its peak. */
export const expIn = (k: number): Ease => {
  const n = Math.exp(k) - 1;
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (Math.exp(k * t) - 1) / n);
};
/** A per-frame ratio written at `fpsRef` (a decay, a growth) as the same ratio per frame at `fps`: r^(fpsRef / fps). */
export const perFrame = (r: number, fpsRef: number, fps: number) => r ** (fpsRef / fps);

/**
 * A house curve given as its progress at t = 0, 0.1 ... 1, drawn through those points with a
 * monotone cubic (no overshoot between points, continuous speed). Used where no cubic bezier comes
 * within the token test's tolerance of the house curve (the two S-curves below).
 */
const table = (ys: readonly number[]): Ease => {
  const n = ys.length - 1;
  const h = 1 / n;
  const d = ys.slice(0, -1).map((y, i) => (ys[i + 1] - y) / h);
  const end = (a: number, b: number) => {
    const p = a + (a - b) * 0.5;
    return Math.sign(p) !== Math.sign(a) ? 0 : Math.abs(p) > 2 * Math.abs(a) ? 2 * a : p;
  };
  const m = ys.map((_, i) => {
    if (i === 0) return end(d[0], d[1]);
    if (i === n) return end(d[n - 1], d[n - 2]);
    const a = d[i - 1];
    const b = d[i];
    if (a * b <= 0) return 0;
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs((a + b) / 2) / 2);
  });
  return (t) => {
    if (t <= 0) return ys[0];
    if (t >= 1) return ys[n];
    const i = Math.min(n - 1, Math.floor(t / h));
    const s = (t - i * h) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
};

/**
 * A measured curve as an ease: progress samples at t = 0, 1/n ... 1 (a clip's move read frame by frame),
 * drawn through with the same monotone cubic as the house tables. The samples are normalised so the first is
 * 0 and the last 1 (a noisy first or last frame never leaves the move part-way at its start or its end). For a
 * move whose shape no token matches; a role token stays the default.
 */
export const curveOf = (samples: readonly number[]): Ease => {
  if (samples.length < 3) throw new Error('curveOf: give at least 3 samples (t = 0, .5, 1)');
  const y0 = samples[0];
  const span = samples[samples.length - 1] - y0;
  if (!(Math.abs(span) > 1e-9)) throw new Error('curveOf: the first and last samples are equal: there is no move to draw');
  return table(samples.map((y) => (y - y0) / span));
};

/** A measured track: [frame, value] keys, in frame order. */
export type TrackKey = readonly [frame: number, value: number];

/**
 * The value of a measured track at frame f: a monotone cubic through the keys (no overshoot between two
 * keys, continuous speed), the first and last values held outside them. One table replaces a chain of
 * tweens when a move was measured (a card's width, a pan's edge, a zoom read from a clip). Pure.
 */
export const track = (f: number, keys: readonly TrackKey[]): number => {
  const n = keys.length;
  if (!n) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  if (f >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && f > keys[i + 1][0]) i++;
  const d = (k: number) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
  const m = (k: number) => {
    if (k === 0) return d(0);
    if (k === n - 1) return d(n - 2);
    const a = d(k - 1);
    const b = d(k);
    if (a * b <= 0) return 0;
    const ha = keys[k][0] - keys[k - 1][0];
    const hb = keys[k + 1][0] - keys[k][0];
    return (3 * (ha + hb)) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
  };
  const [x0, y0] = keys[i];
  const [x1, y1] = keys[i + 1];
  const h = x1 - x0;
  const t = (f - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m(i) + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m(i + 1);
};

/** The straight-line twin of track(): linear between keys (a ramp, a luma halving per frame read as steps). */
export const trackLinear = (f: number, keys: readonly TrackKey[]): number => {
  const n = keys.length;
  if (!n) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  if (f >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && f > keys[i + 1][0]) i++;
  const [x0, y0] = keys[i];
  const [x1, y1] = keys[i + 1];
  return y0 + ((y1 - y0) * (f - x0)) / (x1 - x0);
};

/** The house standard in-out, as progress at t = 0 ... 1 (peak speed at 35 %). */
export const STD_IN_OUT = [0, 0.04, 0.127, 0.316, 0.55, 0.756, 0.871, 0.924, 0.962, 0.986, 1] as const;
/** The house whip, as progress at t = 0 ... 1: a long build and a short brake (peak speed at 55-60 %). */
export const WHIP_BUILD = [0, 0.017, 0.041, 0.083, 0.143, 0.279, 0.522, 0.757, 0.902, 0.976, 1] as const;

/**
 * Easing tokens, by role. Progress at t = 0.1 in brackets; durations are house values at 60 fps.
 * The 1.1 names below the line keep their 1.1 shapes (old acts and recipes render the same) and
 * name their replacement in `deprecated` (lint-film deprecated-token warns).
 */
export const E = {
  // ARRIVE: peak speed on the first frame
  snapOut: tagEase(bz(0.137, 0.758, 0.128, 0.926), 'arrive', 'snapOut'), // [.50] words (opacity and rise as one), slot inserts, tiles, settles after a cut; 32 f
  glideOut: tagEase(bz(0.172, 0.687, 0.393, 0.943), 'arrive', 'glideOut'), // [.33] THE default arrival: layers after a cut, slides, logo parts; 34 f
  settleOut: tagEase(bz(0.202, 0.579, 0.484, 0.887), 'arrive', 'settleOut'), // [.25] UI cards, slow camera and colour settles; 34 f
  softOut: tagEase(expOut(1.271), 'arrive', 'softOut'), // [.16] tints, mask reveals, slow pushes under holds; 34 f
  liftOut: tagEase(bz(0.399, 0.329, 0.148, 0.966), 'arrive', 'liftOut'), // [.09] UI reframes: a short lunge (peak at t = .25), a long settle; 31 f
  jump: tagEase(expOut(12), 'arrive', 'jump'), // line re-centre and make-room: 42 % in the first frame of 22 f at 60 fps, 66 % by the second
  // REPOSITION inside a shot
  stdInOut: tagEase(table(STD_IN_OUT), 'reposition', 'stdInOut'), // [.04] card repositioning, pull-backs, presses, a bar growing; 30 f
  strongInOut: tagEase(bz(0.673, 0.077, 0.288, 0.943), 'reposition', 'strongInOut'), // [.02] camera reframes and pans, lateral moves, colour cross-fades; 36 f
  whipBuild: tagEase(table(WHIP_BUILD), 'reposition', 'whipBuild'), // [.02] whips: a long build, a short brake (peak speed at t = .55-.6); 28 f
  anticipate: tagEase(bz(0.56, -0.303, 0.132, 0.795), 'reposition', 'anticipate'), // dips about 4 % first: one wind-up per film at most
  // LEAVE: end at speed; cut on the last frame
  softIn: tagEase(bz(0.571, 0.245, 0.76, 0.612), 'leave', 'softIn'), // [.05] gentle exits, a logo shrinking before a cut; 28 f
  buildIn: tagEase(bz(0.525, 0.079, 0.724, 0.331), 'leave', 'buildIn'), // [.02] THE exit: speed about x1.11 a frame at 26 f; 26 f
  launchIn: tagEase(bz(0.556, 0.053, 0.835, 0.188), 'leave', 'launchIn'), // [.01] into a cut: speed about x1.16 a frame at 29 f (x1.34 at 30 fps); 29 f
  // LINEAR
  linear: tagEase((t: number) => t, 'linear', 'linear'), // colour lerps and true live rates only (lint-film linear-motion): exactly t
  // ---- 1.1 names, 1.1 shapes ----
  out: tagEase(bz(0.16, 1, 0.3, 1), 'arrive', 'out', 'snapOut'), // expo-out: arrivals and reveals (never for fade-outs)
  outSoft: tagEase(bz(0.22, 1, 0.36, 1), 'arrive', 'outSoft', 'snapOut'), // quint-out: gentle settles (glideOut for a softer arrival)
  in: tagEase(bz(0.7, 0, 0.84, 0), 'leave', 'in', 'launchIn'), // expo-in: implosions and hard snaps out (20-24 % of the travel in the last frame)
  exit: tagEase(bz(0.55, 0.055, 0.675, 0.19), 'leave', 'exit', 'buildIn'), // cubic-in: exits into a cut
  inOut: tagEase(bz(0.87, 0, 0.13, 1), 'reposition', 'inOut', 'strongInOut'), // expo-in-out: whips and lockup slides
  smooth: tagEase(bz(0.65, 0, 0.35, 1), 'reposition', 'smooth', 'strongInOut'), // cubic-in-out: drifts and 10-14 f fades
  ui: tagEase(bz(0.4, 0, 0.2, 1), 'reposition', 'ui', 'stdInOut'), // small UI state changes
  cam: tagEase(bz(0.48, 0.1, 0, 0.9), 'arrive', 'cam', 'liftOut'), // camera: slow start, peak at ~27 %, long settle
  glide: tagEase(bz(0.47, 0.2, 0.15, 1), 'arrive', 'glide', 'liftOut'), // 150-350 px moves with a soft landing (not glideOut: another curve)
  rest: tagEase(bz(0.45, 0, 0.1, 1), 'reposition', 'rest', 'stdInOut'), // zero-slope start, ends at rest: chains after another move
  contact: tagEase(bz(0.55, 0, 0.9, 0.55), 'leave', 'contact', 'buildIn'), // accelerates INTO an impact (ends with velocity)
  whip: tagEase(bz(0.6, 0, 0.15, 1), 'reposition', 'whip', 'whipBuild'), // feature-to-feature moves (fast start); the house whip is whipBuild
  dolly: tagEase(bz(0.35, 0, 0.65, 1), 'reposition', 'dolly', 'linear'), // pushes on holds are linear; pushes into cuts launchIn
  type: tagEase(bz(0.5, 1, 0.89, 1), 'arrive', 'type'), // quad-out: an eased typewriter, 2x its mean rate at the start, last key at ~80 %
  expo: tagEase(expOut(6), 'arrive', 'expo'), // exponential glide of held text (1.1 line re-centre); the 1.2 re-centre is jump
};

/** The 1.1 easing names and the token that replaces each (lint-film deprecated-token reads this). */
export const E_DEPRECATED: Record<string, string> = Object.fromEntries(
  Object.entries(E)
    .filter(([, e]) => (e as Token).deprecated)
    .map(([k, e]) => [k, (e as Token).deprecated as string]),
);

/** The family of a curve: a token's own, or '' for an untagged function. */
export const familyOf = (e: Ease): Family | '' => ((e as Partial<Token>).family as Family | undefined) ?? '';

/**
 * Special curves that primitives use as their defaults, named for their job. Everything else a
 * primitive needs comes from E; a one-off curve for one moment stays a prop of that moment.
 */
export const M = {
  rise: tagEase(bz(0.17, 0.75, 0.29, 0.83), 'arrive', 'M.rise'), // a word's rise (pace.riseDur); its opacity rides the pace ease
  press: tagEase(bz(0.77, 0.51, 0.33, 0.94), 'reposition', 'M.press'), // a press squeezing in
  lockup: tagEase(bz(0.841, 0.113, 0.196, 0.941), 'reposition', 'M.lockup'), // a lockup slide: mark and name meeting
  develop: tagEase(bz(0.73, 0.26, 0.45, 0.69), 'reposition', 'M.develop'), // imagery developing from a tint to full colour
  letterArc: tagEase(bz(0.428, 1.064, 0.653, 1.114), 'arrive', 'M.letterArc'), // a letter swinging up on an arc, about 4 % over
  letterGrow: tagEase(bz(0.721, 0.007, 0.854, 1.45), 'reposition', 'M.letterGrow'), // a first letter growing from the baseline
  letterSlide: tagEase(bz(0.301, 0.189, 0.249, 0.89), 'arrive', 'M.letterSlide'), // the letters sliding in after it
  groupSettle: tagEase(bz(0.172, 0.752, 0.455, 0.826), 'arrive', 'M.groupSettle'), // a built word settling as one
  pixelStair: tagEase(bz(0.49, 0.03, 0.07, 0.94), 'reposition', 'M.pixelStair'), // block size stepping out
  demosaicZoom: tagEase(bz(0.006, 0.51, 0.35, 1), 'arrive', 'M.demosaicZoom'), // block size resolving back in
  collagePush: tagEase(bz(0.734, 0.266, 0.339, 0.837), 'reposition', 'M.collagePush'), // the slow push under a collage build
  oversize: tagEase(bz(0.232, 0.902, 0.794, 0.997), 'arrive', 'M.oversize'), // an oversized landing settling to size
  squeeze: tagEase(bz(0.917, 0.495, 0.361, 0.843), 'reposition', 'M.squeeze'), // a container gathering before it changes state
  swell: tagEase(bz(1, -0.044, 0.791, 0.97), 'reposition', 'M.swell'), // a container swelling into its next state
  ringTighten: tagEase(bz(0.253, -0.242, 0.331, 0.925), 'reposition', 'M.ringTighten'), // a ring wipe tightening
  focusSlide: tagEase(bz(0, 0.973, 0.466, 0.983), 'arrive', 'M.focusSlide'), // a word sliding home while it comes into focus
};

/** An arrival on an arrive curve (default glideOut). */
export const enter = (f: number, a: number, b: number, ease: Token<'arrive'> = E.glideOut) => prog(f, a, b, ease);
/** An exit on a leave curve (default buildIn); cut on its last frame. */
export const leave = (f: number, a: number, b: number, ease: Token<'leave'> = E.buildIn) => prog(f, a, b, ease);
/** A move inside a shot on a reposition curve (default strongInOut). */
export const move = (f: number, a: number, b: number, ease: Token<'reposition'> = E.strongInOut) => prog(f, a, b, ease);

// ---- Exponential motion: nothing on screen moves at a constant rate --------------------------------------------
// Zooms run in log space, pans and travels on exponential curves. p = clamp((f - a) / (b - a)) is the time share of
// the move; k is the rate (the time constant is 1/k of the move). A linear ramp is for a true live rate only (a clock,
// a real-time progress bar, a counter's rate, a constant ambient drift) and carries // lint-ok: <reason> in film code
// (scripts/lint-film.mjs linear-motion).

/**
 * Exponential ease-in-out, expIn(k) into expOut(k) at the midpoint:
 *   p < 1/2:  (e^(2kp) - 1) / (2 (e^k - 1))        p >= 1/2:  1/2 + (1 - e^(-k (2p - 1))) / (2 (1 - e^(-k)))
 * From rest to rest with the peak speed at the middle; k = 7 covers about 88 % of the travel in the middle 30 % of the time.
 */
export const expInOut = (k: number): Ease => {
  const i = expIn(k);
  const o = expOut(k);
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? i(2 * t) / 2 : 0.5 + o(2 * t - 1) / 2);
};

/** The house exponential curves: an arrival (expo out), an exit (expo in) and a travel (expo in-out). */
export const XP = {
  arrive: tagEase(expOut(7), 'arrive', 'XP.arrive'), // (1 - e^(-7p)) / (1 - e^(-7)): 50 % at p = .10, 90 % at .33
  leave: tagEase(expIn(6), 'leave', 'XP.leave'), // (e^(6p) - 1) / (e^6 - 1): leaves from rest, at peak speed on its last frame
  travel: tagEase(expInOut(7), 'reposition', 'XP.travel'), // expo in-out: pans, travels, camera reframes
};

/**
 * A zoom (a scale, a push, a dive, a pull-back) from `from` to `to` over frames [a, b], in log space:
 *   s = from * (to / from)^ease(p)
 * Equal eased time buys an equal ratio, so the push reads as one constant move to the eye (a linear scale slows on
 * screen as it grows). Default ease XP.travel; an arrival push takes XP.arrive, a dive into a cut XP.leave.
 */
export const zoomAt = (f: number, a: number, b: number, from: number, to: number, ease: Ease = XP.travel) =>
  lmix(from, to, ease(clamp((f - a) / Math.max(1e-6, b - a))));

/** An arrival (a pan landing, a card sliding home): x = from + (to - from) (1 - e^(-k p)) / (1 - e^(-k)). */
export const panTo = (f: number, a: number, b: number, from: number, to: number, k = 7) =>
  mix(from, to, expOut(k)(clamp((f - a) / Math.max(1e-6, b - a))));

/** An exit: x = from + (to - from) (e^(k p) - 1) / (e^k - 1). Leaves from rest at peak speed on its last frame: cut there. */
export const exitTo = (f: number, a: number, b: number, from: number, to: number, k = 6) =>
  mix(from, to, expIn(k)(clamp((f - a) / Math.max(1e-6, b - a))));

/** A travel inside a shot (a pan, a camera reframe), from rest to rest: x = from + (to - from) expInOut(k)(p). */
export const travel = (f: number, a: number, b: number, from: number, to: number, k = 7) =>
  mix(from, to, expInOut(k)(clamp((f - a) / Math.max(1e-6, b - a))));

/**
 * Spring presets (Remotion configs, mass 1 unless noted; zeta = damping / (2 sqrt(stiffness * mass))).
 * Default to critical damping. A film has ONE underdamped class (timeline.ts SPRING_CLASS: one kind of
 * element that springs, every time, never type); everything else settles critically. Overshoot is
 * clamped wherever it could cross other geometry or go negative. The 1.1 presets keep their 1.1
 * configs; SPR_DEPRECATED names their replacements. Keep one preset per line (lint-film reads them).
 */
export const SPR = {
  critical: { stiffness: 170, damping: 26, mass: 1 }, // DEFAULT. zeta 1.00, no overshoot, settled (2 %) in 27 f at 60 fps
  criticalFast: { stiffness: 400, damping: 40, mass: 1 }, // markers, chips. zeta 1.00, 18 f
  criticalSlow: { stiffness: 60, damping: 15.5, mass: 1 }, // big objects, the camera. zeta 1.00, 45 f
  landing: { stiffness: 244, damping: 18.3, mass: 1 }, // THE spring class: pill, bubble, aperture, logo. zeta 0.59, 10 %, 23 f
  softLanding: { stiffness: 145, damping: 16, mass: 1 }, // big framing objects. zeta 0.66, 6 %, 30 f
  menu: { stiffness: 910, damping: 39, mass: 1 }, // a menu or container snapping open. zeta 0.65, 7 %, 12 f
  containerPop: { stiffness: 4274, damping: 71, mass: 1 }, // a container morph. zeta 0.54, 12-13 %, 6 f
  wordDrop: { stiffness: 864, damping: 33.3, mass: 1 }, // posterised word drops only. zeta 0.57, 11 %, 12 f
  lazyWheel: { stiffness: 100, damping: 10.1, mass: 1 }, // wheel pickers (after an anticipation dip). zeta 0.50, 16 %, 49 f
  logoSwing: { stiffness: 68, damping: 8.24, mass: 1 }, // a logo's rotation after a wind-up. zeta 0.50, 16 %, 59 f
  // ---- 1.1 presets, 1.1 configs ----
  snap: { damping: 18, stiffness: 260, mass: 0.7 }, // locks into place, small overshoot
  pop: { damping: 11, stiffness: 180, mass: 0.6 }, // 14 % overshoot
  soft: { damping: 26, stiffness: 120, mass: 1 }, // weighty, no overshoot
  heavy: { damping: 30, stiffness: 90, mass: 1.4 }, // big objects
  firm: { damping: 24, stiffness: 140, mass: 1 }, // UI arrivals, no overshoot
  micro: { damping: 30, stiffness: 500, mass: 0.6 }, // chips, badges, small snaps
  land: { damping: 14.5, stiffness: 200, mass: 1 }, // ~15 % overshoot
  word: { damping: 20, stiffness: 170, mass: 0.9 }, // words sliding in to lock (clamp at the lock)
  detent: { damping: 24, stiffness: 380, mass: 0.6 }, // a reel or picker clicking home
  calm: { damping: 16, stiffness: 64, mass: 1 }, // critically damped, 97 % at 41 f, no overshoot: the only spring for type
} satisfies Record<string, Partial<SpringConfig>>;

export type Spr = Partial<SpringConfig>;

/**
 * What each 1.2 preset does, sampled per frame at 60 fps: zeta, overshoot (fraction of the travel,
 * [low, high]) and the frame after which it stays within 2 % of rest. scripts/test/tokens.test.mjs
 * checks Remotion's spring() against these (zeta +-0.01, overshoot +-1 pp, settle +-2 f).
 */
export const SPR_META: Record<string, { zeta: number; overshoot: [number, number]; settle60: number }> = {
  critical: { zeta: 1.0, overshoot: [0, 0], settle60: 27 },
  criticalFast: { zeta: 1.0, overshoot: [0, 0], settle60: 18 },
  criticalSlow: { zeta: 1.0, overshoot: [0, 0], settle60: 45 },
  landing: { zeta: 0.59, overshoot: [0.09, 0.11], settle60: 23 },
  softLanding: { zeta: 0.66, overshoot: [0.04, 0.07], settle60: 30 },
  menu: { zeta: 0.65, overshoot: [0.06, 0.1], settle60: 12 },
  containerPop: { zeta: 0.54, overshoot: [0.12, 0.13], settle60: 6 },
  wordDrop: { zeta: 0.57, overshoot: [0.11, 0.12], settle60: 12 },
  lazyWheel: { zeta: 0.5, overshoot: [0.15, 0.17], settle60: 49 },
  logoSwing: { zeta: 0.5, overshoot: [0.16, 0.18], settle60: 59 },
};

/** The 1.1 spring presets and the preset that replaces each. */
export const SPR_DEPRECATED: Record<string, string> = {
  snap: 'landing', pop: 'containerPop', soft: 'critical', heavy: 'criticalSlow', firm: 'critical',
  micro: 'criticalFast', land: 'landing', word: 'critical', detent: 'criticalFast', calm: 'criticalSlow',
};

// ---- Tables: house numbers, 60 fps frames unless noted --------------------------------------
/** Durations by class, f@60: [shortest, short, house, long, longest]. Pick the house value; move between short and long by size. */
export const DUR = {
  word: [16, 24, 32, 32, 57], lineIn: [12, 18, 28, 54, 78], letter: [12, 25, 34, 45, 64],
  typeOther: [8, 19, 26, 53, 66], typeOn: [19, 24, 40, 58, 91], // typeOn: a whole type-on run
  typeColour: [12, 12, 18, 28, 60], typeScale: [13, 19, 26, 49, 81], typeExit: [7, 10, 17, 24, 33],
  reflow: [10, 12, 22, 44, 64], scaleIn: [11, 20, 32, 53, 81], slideIn: [15, 18, 30, 39, 48],
  exit: [10, 15, 24, 32, 44], ui: [10, 20, 34, 50, 70], press: [12, 17, 20, 25, 32],
  cursor: [25, 31, 44, 54, 90], logoPart: [10, 20, 30, 46, 80], counter: [24, 24, 34, 80, 120],
  lineDraw: [13, 16, 22, 45, 95], mask: [12, 17, 26, 40, 58], morph: [14, 16, 22, 32, 49],
  colour: [12, 20, 34, 54, 110], whip: [17, 21, 32, 52, 94], zoomThrough: [14, 24, 35, 46, 75],
  push: [15, 28, 50, 72, 86], pull: [25, 30, 43, 70, 129], pan: [27, 38, 48, 72, 126],
  drift: [18, 28, 49, 82, 146], orbit: [25, 35, 55, 81, 110], seamMove: [6, 14, 25, 42, 64],
  collage: [25, 27, 40, 62, 120], loader: [14, 17, 25, 30, 61], ambient: [18, 29, 60, 97, 244],
  hold: [15, 24, 76, 147, 302], focus: [16, 16, 27, 45, 45],
} as const;
/** A press, f@60: squeeze in 8-10, hold 2-4, release 10. */
export const PRESS = { squeeze: 9, hold: 3, release: 10 } as const;
/** Exponential time constants by class, f@60. For expOut(k) over d frames, k = d / tau; 99 % home after ~4.6 tau. */
export const TAU = { marker: 3, element: 8, hero: 17, world: 30, exitUi: 6, exitCamera: 19 } as const;
/** Staggers, f@60: [shortest, short, house, long, longest]. Irregular by default (the reading cadence, lib/cadence.ts). */
export const STAG = {
  letter: [2, 3, 4, 8, 14], word: [4, 7, 10, 14, 14], row: [6, 8, 9, 10, 18],
  ui: [2.5, 5, 7.5, 17.5, 34], logoPart: [6, 6, 7, 24, 30],
} as const;
/** Gaps of an accelerating payoff, f@60, ready to use (lib/cadence.ts accel() builds others). */
export const ACCEL = {
  rows: [18, 18, 14, 10, 8, 6, 6],
  montage: [14, 14, 14, 14, 14, 10, 10, 10, 6, 6, 6, 6, 6, 6],
  typing: [5, 2, 2, 1, 1, 1],
} as const;
/** Typing rates, characters per second: a human (house 30, bursts of about 2), a prompt that speeds up, a stream. */
export const CPS = { human: { min: 19, house: 30, max: 45, burst: 2 }, prompt: { start: 5, end: 19 }, stream: { min: 50, max: 150 } } as const;
/** Speeds, px/s at 1080p: [slow, house, fast] unless noted. */
export const SPEED = {
  wordRise: [420, 630, 1080], reflowPeak: [930, 2000, 3060], uiCard: [390, 1080, 1900], slideIn: [780, 1860, 3200],
  cursor: [1350, 1530, 2400], pan: [570, 1700, 2640], whipPeak: [750, 1600, 3700], whipMax: 7400,
  cutExitTypical: [900, 2700], holdDrift: [6, 30, 90], residualAfterCut: 45, blurThreshold: [900, 1200], crispFlatMax: 10000,
} as const;
/**
 * Speed carried through a cut (lib/handoff.ts): the incoming speed as a share of the outgoing one
 * [low, house, high], the slow decay per 60 fps frame, the fast first drop (share and decay), the
 * residual drift it settles to (px per 60 fps frame; 0: the carry lands at rest, no drift on after it), the approach
 * into the cut and the settle after it (f@60).
 */
export const CARRY = {
  ratio: [0.4, 0.7, 1.4], decay60: [0.78, 0.89, 0.93], fast: { share: 0.6, decay60: 0.4 }, residual60: 0,
  approach60: [16, 46], settle60: [16, 50],
} as const;
/** Scale breath around a cut: push 1-8 % into it over 10-20 f; the next shot opens 5-12 % off and settles in 8-50 f. */
export const BREATH = { into: [0.01, 0.08], intoDur60: [10, 20], open: [0.05, 0.12], settleDur60: [8, 50] } as const;
/** An oversized landing instead of a scale from zero: start at 1.28-1.9x and settle in 22-56 f. */
export const OVERSIZE = { from: [1.28, 1.9], dur60: [22, 56] } as const;

/**
 * The film's pace (src/lib/pace.ts, picked by PACE_NAME in src/timeline.ts): the defaults of every
 * text component. Frames are at 60 fps; convert with f60(). Components read the pace of their film
 * context (lib/film.ts useFilm()); this constant stays for code written against 1.1.
 */
export const pace: Pace = PACE[PACE_NAME];

/** The easing token a word of this pace rises on (calm and crisp: E.snapOut; a 1.1 pace: E.outSoft / E.out). */
export const easeOf = (p: Pace = pace): Ease => (E as Record<string, Ease>)[p.ease] ?? E.snapOut;

/**
 * Frames for a move of `px` pixels at `fps` (default the film's): calm 0.5 s + 1.6 ms/px (camera
 * moves clamped to 0.9-3.0 s), crisp 0.35 s + 1.35 ms/px (0.6-2.4 s). At 60 fps durFor(150) = 44 f
 * and durFor(1200, true) = 145 f when calm; 33 f and 118 f when crisp.
 */
export const durFor = (px: number, camera = false, p: Pace = pace, fps: number = fpsOf()) => {
  const s = p.move.base + p.move.perPx * Math.abs(px);
  return Math.round((camera ? clamp(s, p.move.camMin, p.move.camMax) : s) * fps);
};

/** Clamped tween between two frames. interpolate() extends past its range by default; this never does. */
export const tw = (frame: number, from: number, to: number, a: number, b: number, ease: Ease = E.out) => {
  record({ frame, from, to, token: (ease as Partial<Token>).token ?? '', family: (ease as Partial<Token>).family ?? '' });
  return interpolate(frame, [from, to], [a, b], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/**
 * 0..1 progress between two frames. It is 0 ON `from`, so a change meant to show on a hit frame
 * starts at `cue - 1`. Pass the ease explicitly: the E.out default is a 1.1 arrival; enter(),
 * leave() and move() pick a curve of the right role.
 */
export const prog = (frame: number, from: number, to: number, ease: Ease = E.out) => tw(frame, from, to, 0, 1, ease);

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Log-space mix for scale and zoom: equal ratios per frame, so a zoom never seems to accelerate. An end at 0 or below
 * has no log: the mix is linear then (never NaN). */
export const lmix = (a: number, b: number, t: number) => (a > 0 && b > 0 ? Math.exp(mix(Math.log(a), Math.log(b), t)) : mix(a, b, t));
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Spring started at `start` (frames), at `fps` (default the film's). Same maths as src/lib/sync.ts uses to find its hit frame. */
export const spr = (frame: number, start: number, cfg: Spr = SPR.snap, fps: number = fpsOf()) => spring({ frame: frame - start, fps, config: cfg });

/**
 * Attack-decay envelope for every punch and tick, `t` frames after its cue: rises over `attack`
 * frames (the picture peaks just after its sound), then decays with time constant `tau`. No
 * velocity step at either end, unlike a half-sine on a hard window. Returns 0..1; multiply by the
 * amplitude. `attack` and `tau` are 60 fps frames, so a pulse lasts the same time at any fps.
 */
export const hitPulse = (t: number, attack = 2, tau = 5, fps: number = fpsOf()) => {
  const u = (t * 60) / fps;
  return u <= 0 || u > attack + 6 * tau ? 0 : u < attack ? Math.sin((u / attack) * (Math.PI / 2)) : Math.exp(-(u - attack) / tau);
};

/**
 * Blur for an entrance at eased progress p (0..1), `px` at p = 0. Chromium draws a blur under about
 * 0.5 px as sharp and 0.5-0.7 px weaker than asked (lib/defocus.ts), so a ramp that ends slowly snaps
 * into focus while the element is almost still. This one is gone by 60% of the move, while the
 * element is still travelling fast and half transparent. Text lands sharp.
 */
export const blurIn = (p: number, px: number) => px * clamp(1 - p / 0.6);
/** Blur for an exit at eased progress q: it only starts once the element is already moving (q > 0.3). */
export const blurOut = (q: number, px: number) => px * clamp((q - 0.3) / 0.7);

/**
 * Vertical text moves: Chromium's headless shell snaps a text layer's vertical position to whole
 * pixels (horizontal stays sub-pixel), so the slow tail of an ease-out renders as 1 px ticks with
 * holds between them (a visible stair-step as a word settles). `arrive` rescales eased progress so
 * the move ends at `k` of its curve, while it still travels ~0.5-1 px/f, and then stops; `depart`
 * does the same for the slow start of an exit. Use them on the translateY of text and small UI;
 * opacity, blur and horizontal moves keep the plain progress.
 */
export const arrive = (p: number, k = 0.94) => clamp(p / k);
export const depart = (q: number, k = 0.06) => clamp((q - k) / (1 - k));
/**
 * The `k` for arrive() on a vertical move of `px` over `dur` frames on `ease`: the point of the
 * curve where its step falls below 1 px/f, so the move stops from ~1 px/f at any travel and fps.
 * The default 0.94 fits a ~40 px rise at 60 fps; a 140 px slide would stop from 3 px/f with it
 * (12 px/f at 30 fps), a 20 px one would tick.
 */
export const arriveK = (px: number, dur: number, ease: Ease = E.out) => {
  const n = Math.max(1, Math.round(dur));
  for (let i = 1; i <= n; i++) if (Math.abs(px) * (ease(i / n) - ease((i - 1) / n)) < 1) return clamp(ease((i - 1) / n), 0.5, 1);
  return 1;
};

/** Contact squash for a landing, `t` frames after contact: widen 8% and flatten 10%, back over ~8 f (at 60 fps). Anchor it at the contact edge. */
export const squash = (t: number, fps: number = fpsOf()) => {
  const k = hitPulse(t, 1, 4, fps);
  return { along: 1 - 0.1 * k, across: 1 + 0.08 * k };
};

/** Deterministic pseudo-random in [0,1) from a number or string seed (Math.random is banned: renders must repeat). */
export const rand = (seed: number | string) => {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/**
 * Whole frame for discrete state (typed characters, carets, counters, layout switches). The
 * motion-blur pass renders fractional frames; deciding state on Math.round keeps every sub-sample
 * of one output frame in agreement.
 */
export const fd = Math.round;

/**
 * Start offset (frames) of item i of n spread over `span` frames: 0 for the first, `span` for the
 * last. The ease shapes the gaps (E.linear: even; an arrive curve: the first items bunch up, the tail
 * spreads out). Add it to the group's start: enter(f, at + stagger(i, n, 24), at + stagger(i, n, 24) + 26).
 * A group of objects arrives within 30 f at 60 fps (references/motion-tokens.md §6); longer reads as
 * a queue. Text is the exception: the words of a fragment arrive pace.stagger apart, on the reading
 * cadence (lib/cadence.ts reading()); use Words or Chain rather than this for type.
 */
export const stagger = (i: number, n: number, span: number, ease: Ease = E.linear) => (n > 1 ? span * ease(clamp(i / (n - 1))) : 0);

/**
 * Inertial scroll that starts `start` at v0 px/f and loses (1 - decay) of its speed every frame, in
 * closed form: x = v0·tau·(1 - d^n), v = v0·d^n, with tau = -1/ln d. Before `start` it moves at a
 * constant v0, so a shot can open at peak scroll speed and coast (the velocity has no step). `decay`
 * is per 60 fps frame (0.89: tau = 8.6 f, travel = 8.6·v0, within 0.5 px of rest after
 * `settle` frames); it is converted for `fps` (default the film's). A slow vertical tail of text
 * settles in 1 px ticks (references/chromium-rendering.md §15): for text use total * arrive(x / total,
 * 1 - 1 / |v0|) after `start` (x before it), which stops from ~1 px/f at any v0 > 1. For a speed
 * carried through a cut use lib/handoff.ts carry(), which decays in two stages to a living residual.
 */
export const inertia = (frame: number, start: number, v0: number, decay = 0.89, fps: number = fpsOf()) => {
  const d = clamp(decay, 1e-6, 0.999999) ** (60 / fps);
  const tau = -1 / Math.log(d);
  const n = frame - start;
  const total = v0 * tau;
  const settle = Math.abs(total) > 0.5 ? Math.ceil(tau * Math.log(Math.abs(total) / 0.5)) : 0;
  if (n <= 0) return { x: v0 * n, v: v0, total, settle };
  const k = d ** n;
  return { x: total * (1 - k), v: v0 * k, total, settle };
};

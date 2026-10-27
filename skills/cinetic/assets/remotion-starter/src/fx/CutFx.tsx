import React from 'react';
import { C } from '../brand/tokens';
import { clamp, curveOf, E, type Ease, lmix, mix } from '../lib/anim';
import { mixRgb } from '../lib/color';
import { defocusMix, DEFOCUS_SHARP } from '../lib/defocus';
import { DIR_BLUR, DirBlur } from './Defocus';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { fastRanges } from '../lib/handoff';
import type { Declares } from '../timeline';

// Cuts dressed with what is on screen: the flash cut inside a whip, the defocus cut through one empty
// frame, and four small ones (a whip into black, a door split, hard fill swaps, a tint through grey).
// Every state function is pure and closed form; discrete frames decide on whole frames.

// ------------------------------------------------------------------------------------------------
// flash cut inside a whip

/**
 * Flash cut: the camera whips (an ease-in that never brakes, fastest on its last frame), then ONE
 * over-exposed frame (about 92 % white) carrying a faint ghost of what was there, then ONE dark frame
 * of horizontal streaks, then the next shot is already sliding in, decelerating, and pulls back
 * (x0.65) the moment it lands. The two discrete frames are a designed flash and a designed step.
 *
 * House numbers (60 fps): whip 24 f on E.launchIn over 0.24 of the frame width; flash 0.92 with a
 * 0.3 ghost; streak frame; slide 28 f on E.snapOut from 0.55 of the width; pull 28 f to 0.65 on
 * E.glideOut. Cut on a swell's peak. The whip's tail and the slide's head are smeared along x (the
 * slide opens at several times the whip's last speed, so its first frames are the most smeared of
 * the cut and the picture sharpens as it lands).
 */
export type FlashCutProps = {
  cut: number; // the flash frame (the whip's last frame is cut - 1)
  whip?: { frames?: number; distance?: number; ease?: Ease; dir?: 1 | -1 };
  flash?: { gain?: number; ghost?: number };
  streak?: boolean; // one streak frame after the flash (house true)
  slide?: { frames?: number; from?: number; ease?: Ease };
  pull?: { frames?: number; to?: number; ease?: Ease };
  /**
   * The streak of the fast frames (the whip's tail, the slide's head): 'draw' (house) smears them in the picture
   * along the move (fx/Defocus DirBlur at the whip shutter, 360 degrees: the slide is still soft as it lands),
   * 'shutter' declares them as camera blur for the
   * finishing pass instead (render.sh --blur), false keeps them crisp.
   */
  smear?: 'draw' | 'shutter' | false;
  id?: string;
};

export type FlashCutState = {
  phase: 'before' | 'whip' | 'flash' | 'streak' | 'slide' | 'pull' | 'after';
  outX: number; // the outgoing content's offset, px (along the whip)
  inX: number; // the incoming content's offset, px
  inK: number; // the incoming content's scale
  flash: number; // the white veil, 0..1 (the flash frame only)
  ghost: number; // the ghost's opacity on the flash frame
  streak: boolean;
  v: number; // the moving layer's step into this frame, px (outgoing in the whip, incoming in the slide; 0 on the flash, streak and pull)
};

/** The frames of a flash cut: whip start, flash, streak, slide start, pull start and end. */
export const flashCutFrames = (p: FlashCutProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const whip = Math.max(1, p.whip?.frames ?? f60x(24, fps));
  const slideFrom = p.cut + (p.streak === false ? 1 : 2);
  const slide = Math.max(1, p.slide?.frames ?? f60x(28, fps));
  const pull = Math.max(1, p.pull?.frames ?? f60x(28, fps));
  return { whipFrom: p.cut - 1 - whip, flash: p.cut, streak: p.streak === false ? null : p.cut + 1, slideFrom, pullFrom: slideFrom + slide, pullTo: slideFrom + slide + pull };
};

const flashCutPose = (f: number, p: FlashCutProps, film?: Partial<FilmCtx>): Omit<FlashCutState, 'v'> => {
  const { width } = sizeOf(film);
  const fr = flashCutFrames(p, film);
  const dir = p.whip?.dir ?? 1;
  const dist = (p.whip?.distance ?? 0.24 * width) * dir;
  const slideFrom = (p.slide?.from ?? -0.55 * width) * dir;
  const fw = Math.round(f);
  const base = { outX: 0, inX: slideFrom, inK: 1, flash: 0, ghost: 0, streak: false };
  if (f < fr.whipFrom) return { ...base, phase: 'before' };
  if (fw < fr.flash) return { ...base, phase: 'whip', outX: dist * (p.whip?.ease ?? E.launchIn)(clamp((f - fr.whipFrom) / (fr.flash - 1 - fr.whipFrom))) };
  if (fw === fr.flash) return { ...base, phase: 'flash', outX: dist, flash: clamp(p.flash?.gain ?? 0.92), ghost: clamp(p.flash?.ghost ?? 0.3) };
  if (fr.streak !== null && fw === fr.streak) return { ...base, phase: 'streak', outX: dist, streak: true };
  const slide = clamp((f - fr.slideFrom) / (fr.pullFrom - fr.slideFrom));
  const inX = mix(slideFrom, 0, (p.slide?.ease ?? E.snapOut)(slide));
  if (f < fr.pullFrom) return { ...base, phase: 'slide', inX };
  const pull = clamp((f - fr.pullFrom) / (fr.pullTo - fr.pullFrom));
  const inK = lmix(1, p.pull?.to ?? 0.65, (p.pull?.ease ?? E.glideOut)(pull));
  return { ...base, phase: f < fr.pullTo ? 'pull' : 'after', inX: 0, inK };
};

/** The flash cut at frame f. Pure; the flash and streak frames decide on whole frames. */
export const flashCutState = (f: number, p: FlashCutProps, film?: Partial<FilmCtx>): FlashCutState => {
  const a = flashCutPose(f, p, film);
  const b = flashCutPose(f - 1, p, film);
  // the slide's first frame was not drawn before: its speed is the step it leaves with (the slide's fastest)
  const v = a.phase === 'whip' ? a.outX - b.outX : a.phase === 'slide' ? (b.phase === 'slide' ? a.inX - b.inX : flashCutPose(f + 1, p, film).inX - a.inX) : 0;
  return { ...a, v };
};

/**
 * Renders a flash cut: `out` whipping, the flash frame (the veil over a faint, soft ghost of `out`),
 * the streak frame (`out` stretched along the whip and cut into thin lines), then `in` sliding in and
 * pulling back about `origin`. `frame` is local.
 */
export const FlashCut: React.FC<FlashCutProps & { frame: number; out: React.ReactNode; in: React.ReactNode; origin?: { x: number; y: number }; ground?: string; light?: string }> = (props) => {
  const film = useFilm();
  const { width, height } = film;
  const s = flashCutState(props.frame, props, film);
  const o = props.origin ?? { x: width / 2, y: height / 2 };
  const ground = props.ground ?? C.ink;
  const light = props.light ?? '#FFFFFF';
  const box: React.CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden', background: ground };
  const u = uOf(film);
  const draw = (props.smear ?? 'draw') === 'draw';
  const smeared = (node: React.ReactNode, id: string) => (draw && s.v ? <DirBlur v={s.v / u} axis="x" shutter={DIR_BLUR.whipShutter} id={`${props.id ?? 'flashCut'}-${id}`}>{node}</DirBlur> : node);
  if (s.phase === 'before' || s.phase === 'whip')
    return (
      <div style={box}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${s.outX.toFixed(3)}px)` }}>{smeared(props.out, 'out')}</div>
      </div>
    );
  if (s.phase === 'flash')
    return (
      <div style={{ ...box, background: light }}>
        <div style={{ position: 'absolute', inset: 0, opacity: s.ghost, filter: `blur(${(6 * uOf(film)).toFixed(2)}px) grayscale(1)`, transform: `translateX(${s.outX.toFixed(3)}px)` }}>{props.out}</div>
        <div style={{ position: 'absolute', inset: 0, background: light, opacity: s.flash }} />
      </div>
    );
  if (s.phase === 'streak') {
    const g = `repeating-linear-gradient(180deg, #000 0px, #000 ${(2 * uOf(film)).toFixed(2)}px, transparent ${(2 * uOf(film)).toFixed(2)}px, transparent ${(7 * uOf(film)).toFixed(2)}px)`;
    return (
      <div style={box}>
        <div style={{ position: 'absolute', inset: 0, maskImage: g, WebkitMaskImage: g, opacity: 0.85 }}>
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `${o.x}px ${o.y}px`, transform: `translateX(${s.outX.toFixed(3)}px) scaleX(2.6)`, filter: `blur(${(3 * uOf(film)).toFixed(2)}px)` }}>{props.out}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${o.x}px ${o.y}px`, transform: `translateX(${s.inX.toFixed(3)}px) scale(${s.inK.toFixed(5)})` }}>{smeared(props.in, 'in')}</div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// defocus cut

/**
 * Defocus cut: the outgoing line blurs out and fades together (an arrive curve on the blur: most of
 * it early, the last of it slow), exactly one empty frame, and the next line arrives very soft and
 * pulls into focus, its blur shrinking by the same ratio each frame until it snaps sharp.
 *
 * House numbers (60 fps): out 18 f to 32 px at 1080p on E.buildIn (blur) with opacity to 0 on the
 * same clock; 1 empty frame; in from 45 px, x0.80 per 60 fps frame (x0.65 at 30 fps), sharp after 18 f.
 */
export type DefocusCutProps = {
  at: number; // the empty frame (or the first of `empty` frames)
  out?: { frames?: number; sigma?: number; ease?: Ease; fadeEase?: Ease };
  empty?: number; // empty frames (house 1)
  in?: { frames?: number; sigma?: number; ratio?: number; fadeFrames?: number; ease?: Ease };
  id?: string;
};

export type DefocusCutState = {
  phase: 'before' | 'out' | 'empty' | 'in' | 'after';
  showOut: boolean;
  showIn: boolean;
  sigmaOut: number; // px at 1080p
  opacityOut: number;
  sigmaIn: number;
  opacityIn: number;
};

/** The frames of a defocus cut: out start, empty frame(s), in start and end. */
export const defocusCutFrames = (p: DefocusCutProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const outF = Math.max(1, p.out?.frames ?? f60x(18, fps));
  const inF = Math.max(1, p.in?.frames ?? f60x(18, fps));
  const empty = Math.max(1, Math.round(p.empty ?? 1));
  return { outFrom: p.at - outF, at: p.at, inFrom: p.at + empty, inTo: p.at + empty + inF, outFrames: outF, inFrames: inF };
};

/** The defocus cut at frame f. Pure, closed form; the empty frame decides on whole frames. */
export const defocusCutState = (f: number, p: DefocusCutProps, film?: Partial<FilmCtx>): DefocusCutState => {
  const fps = fpsOf(film);
  const fr = defocusCutFrames(p, film);
  const fw = Math.round(f);
  const none = { showOut: false, showIn: false, sigmaOut: 0, opacityOut: 0, sigmaIn: 0, opacityIn: 0 };
  if (f < fr.outFrom) return { ...none, phase: 'before', showOut: true, opacityOut: 1 };
  if (fw < fr.at) {
    // the blur reaches its peak on the last drawn frame (at - 1); the fade reaches 0 on the empty frame, so the
    // last drawn frame still shows a trace of the line and the empty frame is the only empty one
    const t = clamp((f - fr.outFrom) / Math.max(1e-6, fr.at - 1 - fr.outFrom));
    const tf = clamp((f - fr.outFrom) / Math.max(1e-6, fr.at - fr.outFrom));
    const s = (p.out?.sigma ?? 32) * (p.out?.ease ?? E.buildIn)(t);
    const a = 1 - (p.out?.fadeEase ?? p.out?.ease ?? E.buildIn)(tf);
    return { ...none, phase: 'out', showOut: a > 1e-4, sigmaOut: s, opacityOut: a };
  }
  if (fw < fr.inFrom) return { ...none, phase: 'empty' };
  const n = f - fr.inFrom; // 0 on the first incoming frame
  const s0 = p.in?.sigma ?? 45;
  let sigma: number;
  if (p.in?.ease) sigma = s0 * (1 - p.in.ease(clamp(n / fr.inFrames)));
  else {
    const r = (p.in?.ratio ?? 0.8) ** (60 / fps);
    sigma = s0 * r ** n;
  }
  if (n >= fr.inFrames || sigma < DEFOCUS_SHARP) sigma = 0;
  const fade = Math.max(0, p.in?.fadeFrames ?? 0);
  const a = fade > 0 ? clamp((n + 1) / fade) : 1;
  return { ...none, phase: n >= fr.inFrames ? 'after' : 'in', showIn: true, sigmaIn: sigma, opacityIn: a };
};

/**
 * Renders a defocus cut: `outgoing` blurring and fading, the empty frame (`ground` only), `incoming` pulling
 * focus. `frame` is local. (`out` / `in` are the cut's timing props, so the content goes in `outgoing` /
 * `incoming`.)
 */
export const DefocusCut: React.FC<DefocusCutProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode; ground?: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = defocusCutState(props.frame, props, film);
  const u = uOf(film);
  // the fade is the group's opacity: the copies mix by their weights inside it (a per-copy fade would shift the
  // mix toward the sharper copy and draw less blur than the state asks)
  const stack = (node: React.ReactNode, sigma: number, opacity: number) => (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {defocusMix(sigma * u).map((c, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `blur(${c.level}px)` : undefined }}>
          {node}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {props.ground}
      {s.showOut && stack(props.outgoing, s.sigmaOut, s.opacityOut)}
      {s.showIn && stack(props.incoming, s.sigmaIn, s.opacityIn)}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// small cuts

/**
 * Whip into black: the whip ends on 1-2 black frames and the next shot fades up from black over a few
 * frames (house 2 black frames, fade up 8 f at 60 fps, linear). Returns the black overlay's opacity.
 */
export const blackDipState = (f: number, o: { cut: number; black?: 1 | 2; fadeUp?: number }, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const black = o.black ?? 2;
  const fade = Math.max(1, o.fadeUp ?? f60x(8, fps));
  const fw = Math.round(f);
  if (fw < o.cut) return { black: 0, incoming: false };
  if (fw < o.cut + black) return { black: 1, incoming: false };
  return { black: clamp(1 - (f - (o.cut + black) + 1) / (fade + 1)), incoming: true };
};

/**
 * Door split: the outgoing frame splits down the middle (or across) and both halves slide apart on the
 * measured door path, revealing the incoming shot behind them: a geometric build (each step about x1.5
 * the last) that leaves the frame at about 250 px a frame at 1080p and 24 fps, 30 f at 60 fps; each half
 * travels its own width.
 *
 * The incoming element inherits the doors' speed, turned through 90 degrees: it peeks first (its top
 * edge rises `peek` px into the frame over 12 f, starting 18 f before the doors move: the anticipation),
 * creeps, then rides up through the gap with the doors' build (from a third into their run), peaks with
 * them at about 110 px a frame at 1080p and 24 fps and decays after (the measured path: 7 % of the rise
 * in its first 24 fps frame, a third by the fourth, 77 % by the eighth, home in 50 f at 60 fps). It rises
 * from the frame's bottom edge: give its rest top (`top`, px) or it travels 0.82 of the frame height.
 * Draw it above the halves. Returns each half's offset (px, positive = away from the split), the
 * progress, and the incoming element's offset below its rest (`rise`, px; 0 = home).
 */
export const DOOR = {
  frames60: 30,
  rise: { from: 0.817, frames60: 50, at: 1 / 3, peek: 32, peek60: 12, lead60: 18, creep: 24 },
  // progress of each half per 24 fps frame (12 frames), the measured door path normalised
  doors: [0, 0.001, 0.0052, 0.0115, 0.0219, 0.0375, 0.0604, 0.0938, 0.1438, 0.2344, 0.501, 0.7688, 1] as number[],
  // progress of the rise per 24 fps frame (20 frames), the measured path of the element's top edge normalised
  path: [0, 0.0726, 0.1474, 0.2313, 0.3265, 0.4331, 0.5601, 0.6848, 0.7732, 0.8299, 0.8685, 0.8934, 0.9184, 0.9388, 0.9569, 0.9705, 0.9796, 0.9864, 0.9921, 0.9966, 1] as number[],
} as const;
const doorPath: Ease = curveOf(DOOR.doors);
const doorRise: Ease = curveOf(DOOR.path);

export type DoorSplitOpts = {
  start: number; // the doors start moving
  frames?: number; // film frames (house 30 f at 60 fps)
  ease?: Ease; // the doors' path (house: the measured door path; E.buildIn is a softer build)
  axis?: 'x' | 'y';
  /**
   * the incoming element's rise through the gap: from its rest top `top` (px; it starts with that top on the frame's
   * bottom edge) or `from` (share of the frame height below its rest, house 0.82), over `frames` (60 fps, house 50),
   * starting at `at` of the doors' run (house 1/3); `peek` px (house 32 at 1080p) over `peek60` frames, `lead60`
   * frames before the doors, then a creep of `creep` px/s until the rise. false = no rise (rise stays 0).
   */
  rise?: false | { top?: number; from?: number; frames?: number; at?: number; peek?: number; peek60?: number; lead60?: number; creep?: number; ease?: Ease };
};

export const doorSplitState = (f: number, o: DoorSplitOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const { width, height } = sizeOf(film);
  const frames = Math.max(1, o.frames ?? f60x(DOOR.frames60, fps));
  const t = clamp((f - o.start) / frames);
  const half = (o.axis === 'y' ? height : width) / 2;
  const k = (o.ease ?? doorPath)(t);
  let rise = 0;
  let riseAt = o.start + frames * DOOR.rise.at;
  if (o.rise !== false) {
    const r = o.rise ?? {};
    const u = Math.min(width, height) / 1080;
    const from = r.top !== undefined ? height - r.top : (r.from ?? DOOR.rise.from) * height;
    const peek = (r.peek ?? DOOR.rise.peek) * u;
    const peekF = Math.max(1, f60x(r.peek60 ?? DOOR.rise.peek60, fps));
    const peek0 = o.start - f60x(r.lead60 ?? DOOR.rise.lead60, fps);
    riseAt = o.start + frames * (r.at ?? DOOR.rise.at);
    const rf = Math.max(1, f60x(r.frames ?? DOOR.rise.frames60, fps));
    // the hold between the peek and the rise creeps on (never frozen)
    const creep = (((r.creep ?? DOOR.rise.creep) * u) / fps) * clamp(Math.min(f, riseAt) - (peek0 + peekF), 0, Infinity);
    const held = from - peek * E.settleOut(clamp((f - peek0) / peekF)) - creep;
    rise = held * (1 - (r.ease ?? doorRise)(clamp((f - riseAt) / rf)));
  }
  return { offset: k * half, t, open: t >= 1, rise, riseAt };
};

/**
 * Hard fill swaps: n hard swaps of a full-frame fill `every` frames apart (house 3 swaps 10 f apart at
 * 60 fps), each one 4 % bigger than the last: a beat-cut montage of colour fields. Returns the swap
 * index (-1 before), its scale and its fill.
 */
export const fillSwapState = (f: number, o: { at: number; n?: number; every?: number; grow?: number; fills: string[] }, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const every = Math.max(1, o.every ?? f60x(10, fps));
  const n = Math.max(1, o.n ?? 3);
  const fw = Math.round(f);
  if (fw < o.at) return { index: -1, scale: 1, fill: null as string | null };
  const i = Math.min(n - 1, Math.floor((fw - o.at) / every + 1e-9));
  return { index: i, scale: (1 + (o.grow ?? 0.04)) ** i, fill: o.fills[i % o.fills.length] };
};

/**
 * Tint through grey: a colour change that passes through a neutral grey of the same lightness on the
 * way (so two tints never mix into a third hue): a -> grey over the first half, grey -> b over the
 * second, on `ease` (house E.strongInOut, 56 f at 60 fps). Returns the colour at frame f.
 */
export const tintThroughGrey = (f: number, o: { start: number; frames?: number; a: string; b: string; grey: string; ease?: Ease }, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const frames = Math.max(1, o.frames ?? f60x(56, fps));
  const t = (o.ease ?? E.strongInOut)(clamp((f - o.start) / frames));
  return t < 0.5 ? mixRgb(o.a, o.grey, t * 2) : mixRgb(o.grey, o.b, t * 2 - 1);
};

/**
 * What the cuts declare. Flash cut: the flash frame is a designed flash, flash and streak frames are
 * stepped (one sample each), the cut is a `whip` seam carrying x; with smear 'shutter' the whip's fast
 * tail and the slide's fast head are camera blur (the flash and streak frames stay one sample). Defocus cut: a `defocus` seam on
 * the empty frame.
 */
export const declares = (p?: Partial<FlashCutProps & DefocusCutProps> & { kind?: 'flash' | 'defocus' }, film?: Partial<FilmCtx>): Declares => {
  if (!p) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if ((p.kind ?? (p.cut !== undefined ? 'flash' : 'defocus')) === 'flash' && p.cut !== undefined) {
    const id = p.id ?? 'flashCut';
    const fr = flashCutFrames(p as FlashCutProps, film);
    // smear 'shutter': the whip's last frames and the slide's first ones are camera blur on exactly those frames
    const { width, height } = sizeOf(film);
    const speed = (f: number) => Math.abs(flashCutState(f, p as FlashCutProps, film).v);
    const shutter = p.smear === 'shutter';
    return {
      stepped: [{ from: fr.flash, to: (fr.streak ?? fr.flash) + 1, id }],
      flashes: [{ f: fr.flash, frames: 1, id }],
      cameraBlur: shutter ? fastRanges(speed, fr.whipFrom, fr.pullTo, { u: Math.min(width, height) / 1080, fps: fpsOf(film), id: `${id}-smear` }) : [],
      seams: [{ at: fr.flash, kind: 'whip', carry: 'x', dir: p.whip?.dir ?? 1, id }],
    };
  }
  if (p.at !== undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: p.at, kind: 'defocus', id: p.id ?? 'defocusCut' }] };
  return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
};

/**
 * A blur bridge across a hard punch-in (a wide shot cut to its close-up at x2-2.5): the wide shot softens on its last
 * two frames and the close-up opens soft for two, so the scale jump reads as one push (house sigmas at 1080p: out
 * 1.2 then 4, in 3 then 1.2). `cut` is the close-up's first frame. The sigma is px at 1080p at any frame size: feed
 * it to fx/Defocus, which scales it with the frame (multiply by u only for a blur you draw yourself). Pair it with a
 * decaying pull-back on the close-up (lib/handoff creep) so it breathes. Pure.
 */
export const BLUR_BRIDGE = { out: [1.2, 4] as number[], in: [3, 1.2] as number[] } as const;
export const blurBridge = (frame: number, cut: number, o: { out?: number[]; in?: number[] } = {}, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const out = o.out ?? BLUR_BRIDGE.out;
  const inn = o.in ?? BLUR_BRIDGE.in;
  const k = Math.floor(((frame - cut) * 60) / fps / 2); // the house numbers are per 30 fps frame: two 60 fps frames each
  if (k < 0 && -k <= out.length) return out[out.length + k];
  if (k >= 0 && k < inn.length) return inn[k];
  return 0;
};
